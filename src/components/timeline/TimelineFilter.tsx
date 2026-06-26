'use client';

import { ALL_TIMELINE_TYPES } from '@/types/ui';
import { cn } from '@/lib/utils/cn';

type TimelineFilterProps = {
  activeTypes: Set<string>;
  search: string;
  onToggleType: (type: string) => void;
  onSearchChange: (value: string) => void;
};

export function TimelineFilter({
  activeTypes,
  search,
  onToggleType,
  onSearchChange,
}: TimelineFilterProps) {
  return (
    <div className="space-y-2 border-b border-zinc-100 px-3 py-2">
      <input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search timeline…"
        className="w-full rounded border border-zinc-300 px-2 py-1 text-xs outline-none focus:border-zinc-500"
      />
      <div className="flex flex-wrap gap-1">
        {ALL_TIMELINE_TYPES.map((type) => {
          const active = activeTypes.has(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => onToggleType(type)}
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                active
                  ? 'border-blue-300 bg-blue-50 text-blue-800'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-500',
              )}
            >
              {type}
            </button>
          );
        })}
      </div>
    </div>
  );
}
