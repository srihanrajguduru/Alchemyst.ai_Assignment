'use client';

import { memo } from 'react';
import type { TimelineEvent } from '@/types/machine';
import { cn } from '@/lib/utils/cn';
import { TokenBatchRow } from './TokenBatchRow';

type EventRowProps = {
  event: TimelineEvent;
  selected: boolean;
  linked?: boolean;
  onSelect: (eventId: string) => void;
};

export const EventRow = memo(function EventRow({
  event,
  selected,
  linked,
  onSelect,
}: EventRowProps) {
  if (event.type === 'TOKEN_BATCH') {
    return <TokenBatchRow event={event} selected={selected} onSelect={onSelect} />;
  }

  const colorClass =
    event.type === 'TOOL_CALL'
      ? 'border-l-blue-500'
      : event.type === 'TOOL_RESULT'
        ? 'border-l-emerald-500 ml-4'
        : event.type === 'ERROR'
          ? 'border-l-red-500'
          : 'border-l-zinc-300';

  return (
    <button
      type="button"
      id={`timeline-${event.id}`}
      onClick={() => onSelect(event.id)}
      className={cn(
        'w-full rounded border border-zinc-100 border-l-4 px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-50',
        colorClass,
        selected && 'bg-blue-50 ring-1 ring-blue-300',
        linked && 'opacity-90',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-zinc-800">{event.type}</span>
        <span className="font-mono text-[10px] text-zinc-400">seq {event.seq}</span>
      </div>
      <div className="mt-1 text-zinc-600">{event.summary}</div>
      {event.detail && (
        <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-zinc-500">
          {event.detail.slice(0, 500)}
          {event.detail.length > 500 ? '…' : ''}
        </pre>
      )}
    </button>
  );
});
