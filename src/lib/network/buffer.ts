import type { ServerMessage } from '@/types/protocol';

/**
 * Buffers out-of-order server messages and emits them in strict seq order.
 * Duplicate seq values are ignored after the first successful delivery.
 */
export class SeqBuffer {
  private readonly pending = new Map<number, ServerMessage>();
  private nextExpectedSeq: number;
  private lastDeliveredSeq: number;

  constructor(initialSeq = 0) {
    this.nextExpectedSeq = initialSeq + 1;
    this.lastDeliveredSeq = initialSeq;
  }

  get lastSeq(): number {
    return this.lastDeliveredSeq;
  }

  reset(lastSeq: number): void {
    this.pending.clear();
    this.lastDeliveredSeq = lastSeq;
    this.nextExpectedSeq = lastSeq + 1;
  }

  push(message: ServerMessage): ServerMessage[] {
    const { seq } = message;

    if (seq <= this.lastDeliveredSeq) {
      return [];
    }

    if (this.pending.has(seq)) {
      return [];
    }

    this.pending.set(seq, message);

    const ready: ServerMessage[] = [];
    while (this.pending.has(this.nextExpectedSeq)) {
      const next = this.pending.get(this.nextExpectedSeq)!;
      this.pending.delete(this.nextExpectedSeq);
      this.lastDeliveredSeq = next.seq;
      this.nextExpectedSeq = next.seq + 1;
      ready.push(next);
    }

    return ready;
  }

  pendingCount(): number {
    return this.pending.size;
  }
}
