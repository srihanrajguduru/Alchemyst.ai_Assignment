import type {
  ChatMachineAction,
  ChatMachineState,
  ChatMessage,
  ContextHistory,
  MessageSegment,
  TextSegment,
  TimelineEvent,
  ToolSegment,
} from '@/types/machine';
import { initialChatMachineState } from '@/types/machine';
import type { JsonObject } from '@/types/escapeHatch';
import type { ServerMessage } from '@/types/protocol';

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function flushTokenBatch(state: ChatMachineState): ChatMachineState {
  const batch = state.pendingTokenBatch;
  if (!batch || batch.tokenCount === 0) return state;

  const event: TimelineEvent = {
    id: uid('tl'),
    type: 'TOKEN_BATCH',
    seq: batch.endSeq,
    timestamp: Date.now(),
    streamId: batch.streamId,
    summary: `Streamed ${batch.tokenCount} tokens (${((Date.now() - batch.startedAt) / 1000).toFixed(1)}s)`,
    detail: batch.text,
    tokenCount: batch.tokenCount,
    durationMs: Date.now() - batch.startedAt,
  };

  return {
    ...state,
    timeline: [...state.timeline, event],
    pendingTokenBatch: null,
  };
}

function appendTextSegment(
  message: ChatMessage,
  streamId: string,
  text: string,
  seq: number,
): ChatMessage {
  const segments = [...message.segments];
  const last = segments[segments.length - 1];

  if (last?.kind === 'text' && last.streamId === streamId) {
    const updated: TextSegment = {
      ...last,
      text: last.text + text,
      endSeq: seq,
    };
    segments[segments.length - 1] = updated;
    return { ...message, segments };
  }

  segments.push({
    kind: 'text',
    id: uid('txt'),
    text,
    streamId,
    startSeq: seq,
    endSeq: seq,
  });

  return { ...message, segments };
}

function getActiveAssistantMessage(state: ChatMachineState, streamId: string): ChatMessage | null {
  for (let i = state.messages.length - 1; i >= 0; i -= 1) {
    const msg = state.messages[i];
    if (msg.role === 'assistant' && msg.streamId === streamId) {
      return msg;
    }
  }
  return null;
}

function upsertContextHistory(
  histories: Record<string, ContextHistory>,
  contextId: string,
  snapshot: { seq: number; data: JsonObject; timestamp: number },
): Record<string, ContextHistory> {
  const existing = histories[contextId];
  const entry = {
    contextId,
    seq: snapshot.seq,
    data: snapshot.data,
    timestamp: snapshot.timestamp,
  };
  const snapshots = existing ? [...existing.snapshots, entry] : [entry];
  return {
    ...histories,
    [contextId]: {
      contextId,
      snapshots,
      cursor: snapshots.length - 1,
    },
  };
}

function applyServerMessage(state: ChatMachineState, message: ServerMessage): ChatMachineState {
  let next = { ...state, lastProcessedSeq: message.seq };

  switch (message.type) {
    case 'TOKEN': {
      next = flushTokenBatch(next);
      const batch = next.pendingTokenBatch;
      next.pendingTokenBatch = batch && batch.streamId === message.stream_id
        ? {
            ...batch,
            text: batch.text + message.text,
            tokenCount: batch.tokenCount + 1,
            endSeq: message.seq,
          }
        : {
            streamId: message.stream_id,
            startSeq: message.seq,
            endSeq: message.seq,
            text: message.text,
            tokenCount: 1,
            startedAt: Date.now(),
          };

      let assistant = getActiveAssistantMessage(next, message.stream_id);
      if (!assistant) {
        assistant = {
          id: uid('msg'),
          role: 'assistant',
          streamId: message.stream_id,
          segments: [],
          status: 'streaming',
        };
        next.messages = [...next.messages, assistant];
      }

      const updated = appendTextSegment(assistant, message.stream_id, message.text, message.seq);
      next.messages = next.messages.map((m) => (m.id === updated.id ? updated : m));
      break;
    }

    case 'TOOL_CALL': {
      next = flushTokenBatch(next);
      let assistant = getActiveAssistantMessage(next, message.stream_id);
      if (!assistant) {
        assistant = {
          id: uid('msg'),
          role: 'assistant',
          streamId: message.stream_id,
          segments: [],
          status: 'streaming',
        };
        next.messages = [...next.messages, assistant];
      }

      const toolSegment: ToolSegment = {
        kind: 'tool',
        id: uid('tool'),
        callId: message.call_id,
        toolName: message.tool_name,
        args: message.args,
        streamId: message.stream_id,
        seq: message.seq,
        status: 'pending',
      };

      const updatedMessage: ChatMessage = {
        ...assistant,
        segments: [...assistant.segments, toolSegment],
      };
      next.messages = next.messages.map((m) => (m.id === updatedMessage.id ? updatedMessage : m));

      next.timeline = [
        ...next.timeline,
        {
          id: uid('tl'),
          type: 'TOOL_CALL',
          seq: message.seq,
          timestamp: Date.now(),
          streamId: message.stream_id,
          callId: message.call_id,
          linkedCallId: message.call_id,
          summary: `Tool call: ${message.tool_name}`,
          detail: JSON.stringify(message.args, null, 2),
        },
      ];
      break;
    }

    case 'TOOL_RESULT': {
      next = flushTokenBatch(next);
      next.messages = next.messages.map((msg) => {
        if (msg.role !== 'assistant' || msg.streamId !== message.stream_id) return msg;
        return {
          ...msg,
          segments: msg.segments.map((segment) =>
            segment.kind === 'tool' && segment.callId === message.call_id
              ? { ...segment, result: message.result, status: 'complete' as const }
              : segment,
          ),
        };
      });

      next.timeline = [
        ...next.timeline,
        {
          id: uid('tl'),
          type: 'TOOL_RESULT',
          seq: message.seq,
          timestamp: Date.now(),
          streamId: message.stream_id,
          callId: message.call_id,
          linkedCallId: message.call_id,
          summary: `Tool result: ${message.call_id}`,
          detail: JSON.stringify(message.result, null, 2),
        },
      ];
      break;
    }

    case 'CONTEXT_SNAPSHOT': {
      next = flushTokenBatch(next);
      next.contextHistories = upsertContextHistory(next.contextHistories, message.context_id, {
        seq: message.seq,
        data: message.data,
        timestamp: Date.now(),
      });
      next.activeContextId = message.context_id;

      next.timeline = [
        ...next.timeline,
        {
          id: uid('tl'),
          type: 'CONTEXT_SNAPSHOT',
          seq: message.seq,
          timestamp: Date.now(),
          contextId: message.context_id,
          summary: `Context snapshot: ${message.context_id}`,
          detail: `${Object.keys(message.data).length} top-level keys`,
        },
      ];
      break;
    }

    case 'PING': {
      next = flushTokenBatch(next);
      next.timeline = [
        ...next.timeline,
        {
          id: uid('tl'),
          type: 'PING',
          seq: message.seq,
          timestamp: Date.now(),
          pingChallenge: message.challenge,
          summary: message.challenge
            ? `PING challenge=${message.challenge}`
            : 'PING (corrupt / empty challenge)',
        },
      ];
      break;
    }

    case 'STREAM_END': {
      next = flushTokenBatch(next);
      next.messages = next.messages.map((msg) =>
        msg.streamId === message.stream_id && msg.role === 'assistant'
          ? { ...msg, status: 'complete' as const }
          : msg,
      );
      next.timeline = [
        ...next.timeline,
        {
          id: uid('tl'),
          type: 'STREAM_END',
          seq: message.seq,
          timestamp: Date.now(),
          streamId: message.stream_id,
          summary: `Stream ended: ${message.stream_id}`,
        },
      ];
      break;
    }

    case 'ERROR': {
      next = flushTokenBatch(next);
      next.messages = next.messages.map((msg) =>
        msg.status === 'streaming' && msg.role === 'assistant'
          ? { ...msg, status: 'error' as const, errorText: message.message }
          : msg,
      );
      next.timeline = [
        ...next.timeline,
        {
          id: uid('tl'),
          type: 'ERROR',
          seq: message.seq,
          timestamp: Date.now(),
          errorCode: message.code,
          summary: `ERROR ${message.code}`,
          detail: message.message,
        },
      ];
      break;
    }

    default:
      break;
  }

  return next;
}

export function chatMachineReducer(
  state: ChatMachineState,
  action: ChatMachineAction,
): ChatMachineState {
  switch (action.type) {
    case 'CONNECTION_PHASE':
      return {
        ...state,
        connectionPhase: action.phase,
        reconnectAttempt: action.attempt ?? state.reconnectAttempt,
      };

    case 'USER_SENT': {
      const flushed = flushTokenBatch(state);
      const userMessage: ChatMessage = {
        id: uid('msg'),
        role: 'user',
        segments: [
          {
            kind: 'text',
            id: uid('txt'),
            text: action.content,
            streamId: 'user',
            startSeq: 0,
            endSeq: 0,
          },
        ],
        status: 'complete',
      };

      return {
        ...flushed,
        messages: [...flushed.messages, userMessage],
        timeline: [
          ...flushed.timeline,
          {
            id: uid('tl'),
            type: 'USER_MESSAGE',
            seq: flushed.lastProcessedSeq,
            timestamp: Date.now(),
            summary: `User: ${action.content.slice(0, 80)}`,
            detail: action.content,
          },
        ],
        lastProcessedSeq: 0,
        pendingTokenBatch: null,
      };
    }

    case 'SERVER_MESSAGE':
      return applyServerMessage(state, action.message);

    case 'PONG_SENT':
      return {
        ...state,
        timeline: [
          ...state.timeline,
          {
            id: uid('tl'),
            type: 'PONG',
            seq: action.seq,
            timestamp: Date.now(),
            pingChallenge: action.echo,
            summary: `PONG echo=${action.echo}`,
          },
        ],
      };

    case 'SELECT_EVENT':
      return { ...state, selectedEventId: action.eventId };

    case 'SELECT_SEGMENT':
      return { ...state, selectedSegmentId: action.segmentId };

    case 'SET_CONTEXT_CURSOR': {
      const history = state.contextHistories[action.contextId];
      if (!history) return state;
      const cursor = Math.max(0, Math.min(action.cursor, history.snapshots.length - 1));
      return {
        ...state,
        contextHistories: {
          ...state.contextHistories,
          [action.contextId]: { ...history, cursor },
        },
      };
    }

    default:
      return state;
  }
}

export function createInitialState(): ChatMachineState {
  return { ...initialChatMachineState };
}

export function findSegmentByCallId(
  messages: ChatMessage[],
  callId: string,
): { messageId: string; segment: MessageSegment } | null {
  for (const message of messages) {
    for (const segment of message.segments) {
      if (segment.kind === 'tool' && segment.callId === callId) {
        return { messageId: message.id, segment };
      }
    }
  }
  return null;
}

export function findTimelineEventForCall(
  timeline: TimelineEvent[],
  callId: string,
  type: 'TOOL_CALL' | 'TOOL_RESULT',
): TimelineEvent | undefined {
  return timeline.find((event) => event.type === type && event.callId === callId);
}
