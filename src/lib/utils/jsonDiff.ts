import type { JsonObject, JsonValue } from '@/types/escapeHatch';

export type DiffKind = 'added' | 'removed' | 'changed' | 'unchanged';

export type DiffNode = {
  path: string;
  kind: DiffKind;
  before?: JsonValue;
  after?: JsonValue;
};

export function diffJson(before: JsonObject, after: JsonObject, path = ''): DiffNode[] {
  const nodes: DiffNode[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of keys) {
    const nextPath = path ? `${path}.${key}` : key;
    const hasBefore = Object.prototype.hasOwnProperty.call(before, key);
    const hasAfter = Object.prototype.hasOwnProperty.call(after, key);

    if (!hasBefore && hasAfter) {
      nodes.push({ path: nextPath, kind: 'added', after: after[key] });
      continue;
    }

    if (hasBefore && !hasAfter) {
      nodes.push({ path: nextPath, kind: 'removed', before: before[key] });
      continue;
    }

    const left = before[key];
    const right = after[key];

    if (isObject(left) && isObject(right)) {
      nodes.push(...diffJson(left, right, nextPath));
      continue;
    }

    if (!jsonEqual(left, right)) {
      nodes.push({ path: nextPath, kind: 'changed', before: left, after: right });
    } else {
      nodes.push({ path: nextPath, kind: 'unchanged', before: left, after: right });
    }
  }

  return nodes;
}

export function summarizeDiff(nodes: DiffNode[]): { added: number; removed: number; changed: number } {
  return nodes.reduce(
    (acc, node) => {
      if (node.kind === 'added') acc.added += 1;
      if (node.kind === 'removed') acc.removed += 1;
      if (node.kind === 'changed') acc.changed += 1;
      return acc;
    },
    { added: 0, removed: 0, changed: 0 },
  );
}

function isObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function jsonEqual(a: JsonValue, b: JsonValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function flattenJsonKeys(obj: JsonObject, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    keys.push(next);
    if (isObject(value)) {
      keys.push(...flattenJsonKeys(value, next));
    }
  }
  return keys;
}
