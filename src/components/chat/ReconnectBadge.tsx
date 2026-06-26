'use client';

import { cn } from '@/lib/utils/cn';

type ReconnectBadgeProps = {
  phase: string;
  attempt: number;
};

export function ReconnectBadge({ phase, attempt }: ReconnectBadgeProps) {
  if (phase !== 'reconnecting' && phase !== 'connecting') return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 shadow-md',
      )}
      role="status"
      aria-live="polite"
    >
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
      {phase === 'connecting' ? 'Connecting…' : `Reconnecting… (attempt ${attempt + 1})`}
    </div>
  );
}
