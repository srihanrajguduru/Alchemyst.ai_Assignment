'use client';

import { useMemo } from 'react';
import type { ContextHistory } from '@/types/machine';
import type { DiffKind } from '@/lib/utils/jsonDiff';
import { useVirtualDiff } from '@/hooks/useVirtualDiff';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DiffHighlighter } from './DiffHighlighter';
import { HistoryScrubber } from './HistoryScrubber';
import { VirtualTree } from './VirtualTree';

type InspectorPanelProps = {
  histories: Record<string, ContextHistory>;
  activeContextId: string | null;
  onCursorChange: (contextId: string, cursor: number) => void;
};

export function InspectorPanel({
  histories,
  activeContextId,
  onCursorChange,
}: InspectorPanelProps) {
  const history = activeContextId ? histories[activeContextId] ?? null : null;
  const { current, diff, summary } = useVirtualDiff(history);

  const diffPaths = useMemo(() => {
    const map = new Map<string, DiffKind>();
    for (const node of diff) {
      map.set(node.path, node.kind);
    }
    return map;
  }, [diff]);

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Context Inspector</CardTitle>
        {activeContextId && <Badge>{activeContextId}</Badge>}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
        {!history || !current ? (
          <p className="text-sm text-zinc-500">
            Context snapshots appear here when the agent sends CONTEXT_SNAPSHOT events.
          </p>
        ) : (
          <>
            <HistoryScrubber
              cursor={history.cursor}
              total={history.snapshots.length}
              onChange={(cursor) => onCursorChange(history.contextId, cursor)}
            />
            <div className="flex gap-2 text-[11px] text-zinc-600">
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800">+{summary.added}</span>
              <span className="rounded bg-red-50 px-2 py-0.5 text-red-800">−{summary.removed}</span>
              <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">~{summary.changed}</span>
            </div>
            <DiffHighlighter diff={diff} />
            <VirtualTree data={current.data} diffPaths={diffPaths} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
