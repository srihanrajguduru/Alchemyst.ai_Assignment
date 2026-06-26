'use client';

import { memo, useMemo, useState } from 'react';
import type { JsonObject, JsonValue } from '@/types/escapeHatch';
import { cn } from '@/lib/utils/cn';
import type { DiffKind } from '@/lib/utils/jsonDiff';

type VirtualTreeProps = {
  data: JsonObject;
  diffPaths?: Map<string, DiffKind>;
  maxInitialKeys?: number;
};

type TreeNodeProps = {
  name: string;
  value: JsonValue;
  path: string;
  diffPaths?: Map<string, DiffKind>;
  depth: number;
};

const TreeNode = memo(function TreeNode({ name, value, path, diffPaths, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const diffKind = diffPaths?.get(path);

  const isExpandable =
    (typeof value === 'object' && value !== null) ||
    Array.isArray(value);

  const childEntries = useMemo(() => {
    if (Array.isArray(value)) {
      return value.slice(0, expanded ? value.length : 20).map((item, index) => ({
        key: String(index),
        value: item as JsonValue,
        path: `${path}[${index}]`,
      }));
    }
    if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value as JsonObject);
      const slice = expanded ? entries : entries.slice(0, 15);
      return slice.map(([key, item]) => ({
        key,
        value: item,
        path: path ? `${path}.${key}` : key,
      }));
    }
    return [];
  }, [value, path, expanded]);

  return (
    <div className="font-mono text-[11px]">
      <button
        type="button"
        className={cn(
          'flex w-full items-start gap-1 rounded px-1 py-0.5 text-left hover:bg-zinc-50',
          diffKind === 'added' && 'bg-emerald-50 text-emerald-900',
          diffKind === 'removed' && 'bg-red-50 text-red-900 line-through',
          diffKind === 'changed' && 'bg-amber-50 text-amber-900',
        )}
        onClick={() => isExpandable && setExpanded((v) => !v)}
      >
        <span className="text-zinc-400">{isExpandable ? (expanded ? '▼' : '▶') : '•'}</span>
        <span className="text-blue-700">{name}</span>
        {!isExpandable && (
          <span className="ml-1 break-all text-zinc-700">
            {typeof value === 'string' ? `"${value.slice(0, 120)}${value.length > 120 ? '…' : ''}"` : String(value)}
          </span>
        )}
      </button>
      {expanded && isExpandable && (
        <div className="ml-4 border-l border-zinc-100 pl-2">
          {childEntries.map((entry) => (
            <TreeNode
              key={entry.path}
              name={entry.key}
              value={entry.value}
              path={entry.path}
              diffPaths={diffPaths}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export const VirtualTree = memo(function VirtualTree({
  data,
  diffPaths,
}: VirtualTreeProps) {
  const topLevel = useMemo(() => Object.entries(data), [data]);

  return (
    <div className="max-h-[420px] overflow-auto rounded border border-zinc-100 bg-zinc-50 p-2">
      {topLevel.map(([key, value]) => (
        <TreeNode
          key={key}
          name={key}
          value={value}
          path={key}
          diffPaths={diffPaths}
          depth={0}
        />
      ))}
    </div>
  );
});
