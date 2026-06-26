import type { JsonObject } from './escapeHatch';
import type { ServerMessage } from './protocol';

export type ConnectionPhase =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

export type ToolSegmentStatus = 'pending' | 'complete';

export type TextSegment = {
  kind: 'text';
  id: string;
  text: string;
  streamId: string;
  startSeq: number;
  endSeq: number;
};

export type ToolSegment = {
  kind: 'tool';
  id: string;
  callId: string;
  toolName: string;
  args: JsonObject;
  result?: JsonObject;
  streamId: string;
  seq: number;
  status: ToolSegmentStatus;
};

export type MessageSegment = TextSegment | ToolSegment;

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  streamId?: string;
  segments: MessageSegment[];
  status: 'streaming' | 'complete' | 'error';
  errorText?: string;
};

export type TimelineEventType =
  | 'TOKEN_BATCH'
  | 'TOOL_CALL'
  | 'TOOL_RESULT'
  | 'CONTEXT_SNAPSHOT'
  | 'PING'
  | 'PONG'
  | 'ERROR'
  | 'STREAM_END'
  | 'USER_MESSAGE';

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  seq: number;
  timestamp: number;
  streamId?: string;
  callId?: string;
  contextId?: string;
  summary: string;
  detail?: string;
  tokenCount?: number;
  durationMs?: number;
  linkedCallId?: string;
  pingChallenge?: string;
  errorCode?: string;
};

export type ContextSnapshot = {
  contextId: string;
  seq: number;
  data: JsonObject;
  timestamp: number;
};

export type ContextHistory = {
  contextId: string;
  snapshots: ContextSnapshot[];
  cursor: number;
};

export type ChatMachineState = {
  connectionPhase: ConnectionPhase;
  reconnectAttempt: number;
  lastProcessedSeq: number;
  messages: ChatMessage[];
  timeline: TimelineEvent[];
  contextHistories: Record<string, ContextHistory>;
  activeContextId: string | null;
  selectedEventId: string | null;
  selectedSegmentId: string | null;
  pendingTokenBatch: {
    streamId: string;
    startSeq: number;
    endSeq: number;
    text: string;
    tokenCount: number;
    startedAt: number;
  } | null;
};

export type ChatMachineAction =
  | { type: 'CONNECTION_PHASE'; phase: ConnectionPhase; attempt?: number }
  | { type: 'USER_SENT'; content: string }
  | { type: 'SERVER_MESSAGE'; message: ServerMessage }
  | { type: 'PONG_SENT'; seq: number; echo: string }
  | { type: 'SELECT_EVENT'; eventId: string | null }
  | { type: 'SELECT_SEGMENT'; segmentId: string | null }
  | { type: 'SET_CONTEXT_CURSOR'; contextId: string; cursor: number };

export const initialChatMachineState: ChatMachineState = {
  connectionPhase: 'idle',
  reconnectAttempt: 0,
  lastProcessedSeq: 0,
  messages: [],
  timeline: [],
  contextHistories: {},
  activeContextId: null,
  selectedEventId: null,
  selectedSegmentId: null,
  pendingTokenBatch: null,
};
