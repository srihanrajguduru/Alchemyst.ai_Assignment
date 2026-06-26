'use client';

import type { DiffNode } from '@/lib/utils/jsonDiff';
import { cn } from '@/lib/utils/cn';

type DiffHighlighterProps = {
  diff: DiffNode[];
};

export function DiffHighlighter({ diff }: DiffHighlighterProps) {
  const changes = diff.filter((node) => node.kind !== 'unchanged');

  if (changes.length === 0) {
    return <p className="text-xs text-zinc-500">No changes from previous snapshot.</p>;
  }

  return (
    <div className="max-h-32 overflow-auto rounded border border-zinc-100 bg-white p-2 text-[11px]">
      {changes.slice(0, 50).map((node) => (
        <div
          key={node.path}
          className={cn(
            'border-b border-zinc-50 py-1 font-mono last:border-0',
            node.kind === 'added' && 'text-emerald-700',
            node.kind === 'removed' && 'text-red-700',
            node.kind === 'changed' && 'text-amber-700',
          )}
        >
          <span className="font-semibold">{node.kind}</span> {node.path}
        </div>
      ))}
      {changes.length > 50 && (
        <p className="pt-1 text-zinc-400">+{changes.length - 50} more changes</p>
      )}
    </div>
  );
}
