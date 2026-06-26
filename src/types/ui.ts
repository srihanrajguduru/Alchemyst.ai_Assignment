export type TimelineFilterState = {
  types: Set<string>;
  search: string;
};

export const ALL_TIMELINE_TYPES = [
  'TOKEN_BATCH',
  'TOOL_CALL',
  'TOOL_RESULT',
  'CONTEXT_SNAPSHOT',
  'PING',
  'PONG',
  'ERROR',
  'STREAM_END',
  'USER_MESSAGE',
] as const;
