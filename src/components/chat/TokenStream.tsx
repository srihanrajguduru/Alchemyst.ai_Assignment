'use client';

import { cn } from '@/lib/utils/cn';

type TokenStreamProps = {
  text: string;
  selected: boolean;
  segmentId: string;
  onSelect: () => void;
};

export function TokenStream({ text, selected, segmentId, onSelect }: TokenStreamProps) {
  return (
    <span
      id={`segment-${segmentId}`}
      className={cn(
        'whitespace-pre-wrap break-words',
        selected && 'rounded bg-yellow-100 px-0.5',
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect();
      }}
    >
      {text}
    </span>
  );
}
