/**
 * Single documented escape hatch for dynamic JSON payloads from the agent protocol.
 * Tool args/results and context snapshots are schema-less at runtime.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };
