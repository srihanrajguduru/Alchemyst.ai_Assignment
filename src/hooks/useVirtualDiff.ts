import { useMemo } from 'react';
import { diffJson, summarizeDiff } from '@/lib/utils/jsonDiff';
import type { ContextHistory } from '@/types/machine';

export function useVirtualDiff(history: ContextHistory | null) {
  return useMemo(() => {
    if (!history || history.snapshots.length === 0) {
      return { current: null, previous: null, diff: [], summary: { added: 0, removed: 0, changed: 0 } };
    }

    const cursor = Math.max(0, Math.min(history.cursor, history.snapshots.length - 1));
    const current = history.snapshots[cursor];
    const previous = cursor > 0 ? history.snapshots[cursor - 1] : null;

    if (!previous) {
      return {
        current,
        previous: null,
        diff: [],
        summary: { added: Object.keys(current.data).length, removed: 0, changed: 0 },
      };
    }

    const diff = diffJson(previous.data, current.data);
    return {
      current,
      previous,
      diff,
      summary: summarizeDiff(diff),
    };
  }, [history]);
}
