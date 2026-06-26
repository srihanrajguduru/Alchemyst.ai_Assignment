import assert from 'node:assert/strict';
import test from 'node:test';
import { SeqBuffer } from './buffer.ts';
import type { ServerMessage } from '../../types/protocol.ts';

function token(seq: number, text: string): ServerMessage {
  return { type: 'TOKEN', seq, text, stream_id: 's1' };
}

test('SeqBuffer delivers in-order messages immediately', () => {
  const buffer = new SeqBuffer(0);
  const first = buffer.push(token(1, 'a'));
  assert.equal(first.length, 1);
  assert.equal(first[0].seq, 1);
  assert.equal(buffer.lastSeq, 1);
});

test('SeqBuffer buffers out-of-order messages', () => {
  const buffer = new SeqBuffer(0);
  assert.equal(buffer.push(token(3, 'c')).length, 0);
  assert.equal(buffer.push(token(2, 'b')).length, 0);
  const ready = buffer.push(token(1, 'a'));
  assert.equal(ready.length, 3);
  assert.deepEqual(ready.map((m) => m.seq), [1, 2, 3]);
});

test('SeqBuffer deduplicates repeated seq values', () => {
  const buffer = new SeqBuffer(0);
  buffer.push(token(1, 'a'));
  const dup = buffer.push(token(1, 'a'));
  assert.equal(dup.length, 0);
  assert.equal(buffer.lastSeq, 1);
});

test('SeqBuffer ignores seq at or below last delivered', () => {
  const buffer = new SeqBuffer(5);
  assert.equal(buffer.push(token(5, 'old')).length, 0);
  assert.equal(buffer.push(token(4, 'older')).length, 0);
  const next = buffer.push(token(6, 'new'));
  assert.equal(next.length, 1);
});

test('SeqBuffer reset clears pending state', () => {
  const buffer = new SeqBuffer(0);
  buffer.push(token(3, 'c'));
  buffer.reset(0);
  const ready = buffer.push(token(1, 'a'));
  assert.equal(ready.length, 1);
  assert.equal(buffer.pendingCount(), 0);
});
