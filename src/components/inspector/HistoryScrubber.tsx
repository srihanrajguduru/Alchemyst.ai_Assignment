'use client';

type HistoryScrubberProps = {
  cursor: number;
  total: number;
  onChange: (cursor: number) => void;
};

export function HistoryScrubber({ cursor, total, onChange }: HistoryScrubberProps) {
  if (total <= 1) {
    return <p className="text-xs text-zinc-500">Snapshot 1 of 1</p>;
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="rounded border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-40"
        disabled={cursor <= 0}
        onClick={() => onChange(cursor - 1)}
      >
        ← Prev
      </button>
      <input
        type="range"
        min={0}
        max={total - 1}
        value={cursor}
        onChange={(event) => onChange(Number(event.target.value))}
        className="flex-1"
      />
      <button
        type="button"
        className="rounded border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-40"
        disabled={cursor >= total - 1}
        onClick={() => onChange(cursor + 1)}
      >
        Next →
      </button>
      <span className="whitespace-nowrap text-xs text-zinc-500">
        {cursor + 1} / {total}
      </span>
    </div>
  );
}
