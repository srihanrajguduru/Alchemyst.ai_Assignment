import assert from 'node:assert/strict';
import test from 'node:test';
import { diffJson, summarizeDiff } from './jsonDiff.ts';

test('diffJson detects added, removed, and changed keys', () => {
  const before = { a: 1, b: 2, nested: { x: 1 } };
  const after = { a: 1, c: 3, nested: { x: 2 } };
  const nodes = diffJson(before, after);
  const summary = summarizeDiff(nodes);

  assert.ok(nodes.some((n) => n.path === 'b' && n.kind === 'removed'));
  assert.ok(nodes.some((n) => n.path === 'c' && n.kind === 'added'));
  assert.ok(nodes.some((n) => n.path === 'nested.x' && n.kind === 'changed'));
  assert.equal(summary.removed, 1);
  assert.equal(summary.added, 1);
  assert.equal(summary.changed, 1);
});

test('diffJson marks identical values as unchanged', () => {
  const nodes = diffJson({ keep: 'same' }, { keep: 'same' });
  assert.ok(nodes.every((n) => n.kind === 'unchanged'));
});
