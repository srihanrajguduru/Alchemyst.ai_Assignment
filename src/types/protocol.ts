import type { JsonObject } from './escapeHatch';

export type ClientMessage =
  | { type: 'USER_MESSAGE'; content: string }
  | { type: 'PONG'; echo: string }
  | { type: 'RESUME'; last_seq: number }
  | { type: 'TOOL_ACK'; call_id: string };

export type TokenMessage = {
  type: 'TOKEN';
  seq: number;
  text: string;
  stream_id: string;
};

export type ToolCallMessage = {
  type: 'TOOL_CALL';
  seq: number;
  call_id: string;
  tool_name: string;
  args: JsonObject;
  stream_id: string;
};

export type ToolResultMessage = {
  type: 'TOOL_RESULT';
  seq: number;
  call_id: string;
  result: JsonObject;
  stream_id: string;
};

export type ContextSnapshotMessage = {
  type: 'CONTEXT_SNAPSHOT';
  seq: number;
  context_id: string;
  data: JsonObject;
};

export type PingMessage = {
  type: 'PING';
  seq: number;
  challenge: string;
};

export type StreamEndMessage = {
  type: 'STREAM_END';
  seq: number;
  stream_id: string;
};

export type ErrorMessage = {
  type: 'ERROR';
  seq: number;
  code: string;
  message: string;
};

export type ServerMessage =
  | TokenMessage
  | ToolCallMessage
  | ToolResultMessage
  | ContextSnapshotMessage
  | PingMessage
  | StreamEndMessage
  | ErrorMessage;

export function isServerMessage(value: unknown): value is ServerMessage {
  if (typeof value !== 'object' || value === null) return false;
  const msg = value as { type?: unknown; seq?: unknown };
  return typeof msg.type === 'string' && typeof msg.seq === 'number';
}
