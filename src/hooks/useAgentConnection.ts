'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { SeqBuffer } from '@/lib/network/buffer';
import { getBackoffDelayMs } from '@/lib/network/backoff';
import {
  chatMachineReducer,
  createInitialState,
  findTimelineEventForCall,
} from '@/lib/state/chatMachine';
import type { ChatMachineAction, ChatMachineState } from '@/types/machine';
import type { ClientMessage } from '@/types/protocol';
import { isServerMessage } from '@/types/protocol';

const DEFAULT_WS_URL = 'ws://localhost:4747/ws';

export type AgentConnection = {
  state: ChatMachineState;
  sendUserMessage: (content: string) => void;
  selectEvent: (eventId: string | null) => void;
  selectSegment: (segmentId: string | null) => void;
  setContextCursor: (contextId: string, cursor: number) => void;
  scrollTimelineToCall: (callId: string) => void;
  wsUrl: string;
};

export function useAgentConnection(wsUrl = DEFAULT_WS_URL): AgentConnection {
  const [state, dispatch] = useReducer(chatMachineReducer, undefined, createInitialState);
  const wsRef = useRef<WebSocket | null>(null);
  const bufferRef = useRef(new SeqBuffer(0));
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);
  const attemptRef = useRef(0);
  const lastSeqRef = useRef(0);
  const connectRef = useRef<() => void>(() => {});
  const replayActiveRef = useRef(false);
  const replayEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showReconnect, setShowReconnect] = useState(false);

  const dispatchAction = useCallback((action: ChatMachineAction) => {
    dispatch(action);
  }, []);

  const sendRaw = useCallback((message: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }, []);

  const markReplayActive = useCallback(() => {
    replayActiveRef.current = true;
    if (replayEndTimerRef.current) {
      clearTimeout(replayEndTimerRef.current);
    }
    replayEndTimerRef.current = setTimeout(() => {
      replayActiveRef.current = false;
      replayEndTimerRef.current = null;
    }, 300);
  }, []);

  const respondToProtocolMessage = useCallback(
    (message: import('@/types/protocol').ServerMessage) => {
      // RESUME replays historical PING/TOOL_CALL frames — only answer live traffic.
      if (replayActiveRef.current) return;
      if (message.seq <= bufferRef.current.lastSeq) return;

      if (message.type === 'PING' && message.challenge) {
        sendRaw({ type: 'PONG', echo: message.challenge });
      }

      if (message.type === 'TOOL_CALL') {
        sendRaw({ type: 'TOOL_ACK', call_id: message.call_id });
      }
    },
    [sendRaw],
  );

  const processOrderedMessage = useCallback(
    (message: import('@/types/protocol').ServerMessage) => {
      lastSeqRef.current = message.seq;

      if (message.type === 'PING' && message.challenge) {
        dispatchAction({ type: 'PONG_SENT', seq: message.seq, echo: message.challenge });
      }

      dispatchAction({ type: 'SERVER_MESSAGE', message });
    },
    [dispatchAction],
  );

  const drainBuffer = useCallback(
    (incoming: Parameters<typeof bufferRef.current.push>[0]) => {
      const ready = bufferRef.current.push(incoming);
      for (const message of ready) {
        processOrderedMessage(message);
      }
    },
    [processOrderedMessage],
  );

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      return;
    }

    dispatchAction({
      type: 'CONNECTION_PHASE',
      phase: attemptRef.current > 0 ? 'reconnecting' : 'connecting',
      attempt: attemptRef.current,
    });

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
      setShowReconnect(false);
      dispatchAction({ type: 'CONNECTION_PHASE', phase: 'connected', attempt: 0 });

      if (lastSeqRef.current > 0) {
        // Mark that the next few frames are a replay from the server so we don't
        // respond (PONG / TOOL_ACK) to historical frames. This avoids double-ack
        // behaviour in chaos mode when the server replays events after RESUME.
        markReplayActive();
        sendRaw({ type: 'RESUME', last_seq: lastSeqRef.current });
      }
    };

    ws.onmessage = (event) => {
      try {
        const parsed: unknown = JSON.parse(String(event.data));
        if (!isServerMessage(parsed)) return;

        // Respond to live protocol frames (PONG / TOOL_ACK) if appropriate.
        // respondToProtocolMessage ignores replayed frames when replayActiveRef is set.
        respondToProtocolMessage(parsed);

        drainBuffer(parsed);
      } catch {
        // Ignore malformed frames
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (intentionalCloseRef.current) {
        dispatchAction({ type: 'CONNECTION_PHASE', phase: 'disconnected' });
        return;
      }

      dispatchAction({
        type: 'CONNECTION_PHASE',
        phase: 'reconnecting',
        attempt: attemptRef.current,
      });

      window.setTimeout(() => setShowReconnect(true), 300);

      const delay = getBackoffDelayMs(attemptRef.current);
      attemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(() => connectRef.current(), delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [dispatchAction, drainBuffer, sendRaw, wsUrl]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    intentionalCloseRef.current = false;
    connect();

    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const sendUserMessage = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      bufferRef.current.reset(0);
      lastSeqRef.current = 0;
      dispatchAction({ type: 'USER_SENT', content: trimmed });
      sendRaw({ type: 'USER_MESSAGE', content: trimmed });
    },
    [dispatchAction, sendRaw],
  );

  const selectEvent = useCallback(
    (eventId: string | null) => {
      dispatchAction({ type: 'SELECT_EVENT', eventId });
    },
    [dispatchAction],
  );

  const selectSegment = useCallback(
    (segmentId: string | null) => {
      dispatchAction({ type: 'SELECT_SEGMENT', segmentId });
    },
    [dispatchAction],
  );

  const setContextCursor = useCallback(
    (contextId: string, cursor: number) => {
      dispatchAction({ type: 'SET_CONTEXT_CURSOR', contextId, cursor });
    },
    [dispatchAction],
  );

  const scrollTimelineToCall = useCallback(
    (callId: string) => {
      const event = findTimelineEventForCall(state.timeline, callId, 'TOOL_CALL');
      if (event) {
        dispatchAction({ type: 'SELECT_EVENT', eventId: event.id });
      }
    },
    [dispatchAction, state.timeline],
  );

  return {
    state: { ...state, connectionPhase: showReconnect ? 'reconnecting' : state.connectionPhase },
    sendUserMessage,
    selectEvent,
    selectSegment,
    setContextCursor,
    scrollTimelineToCall,
    wsUrl,
  };
}
