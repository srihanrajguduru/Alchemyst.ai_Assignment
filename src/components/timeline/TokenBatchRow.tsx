'use client';

import { memo, useState } from 'react';
import type { TimelineEvent } from '@/types/machine';
import { cn } from '@/lib/utils/cn';

type TokenBatchRowProps = {
  event: TimelineEvent;
  selected: boolean;
  onSelect: (eventId: string) => void;
};

export const TokenBatchRow = memo(function TokenBatchRow({
  event,
  selected,
  onSelect,
}: TokenBatchRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'rounded border border-zinc-100 px-3 py-2 text-xs',
        selected && 'border-blue-300 bg-blue-50',
      )}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => onSelect(event.id)}
      >
        <span className="font-mono text-zinc-700">{event.summary}</span>
        <span className="text-zinc-400">seq {event.seq}</span>
      </button>
      <button
        type="button"
        className="mt-1 text-[11px] text-blue-600 hover:underline"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? 'Hide tokens' : 'Expand tokens'}
      </button>
      {expanded && event.detail && (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-2 font-mono text-[11px]">
          {event.detail}
        </pre>
      )}
    </div>
  );
});
