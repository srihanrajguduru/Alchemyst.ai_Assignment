'use client';

import { useMemo, useState } from 'react';
import type { TimelineEvent } from '@/types/machine';
import { ALL_TIMELINE_TYPES } from '@/types/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TimelineFilter } from './TimelineFilter';
import { TimelineList } from './TimelineList';

type TimelinePanelProps = {
  events: TimelineEvent[];
  selectedEventId: string | null;
  onSelect: (eventId: string) => void;
};

export function TimelinePanel({ events, selectedEventId, onSelect }: TimelinePanelProps) {
  const [search, setSearch] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<string>>(() => new Set(ALL_TIMELINE_TYPES));

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      if (!activeTypes.has(event.type)) return false;
      if (!query) return true;
      return (
        event.summary.toLowerCase().includes(query) ||
        (event.detail?.toLowerCase().includes(query) ?? false) ||
        event.type.toLowerCase().includes(query)
      );
    });
  }, [events, activeTypes, search]);

  const toggleType = (type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader>
        <CardTitle>Agent Trace Timeline</CardTitle>
      </CardHeader>
      <TimelineFilter
        activeTypes={activeTypes}
        search={search}
        onToggleType={toggleType}
        onSearchChange={setSearch}
      />
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <TimelineList events={filtered} selectedEventId={selectedEventId} onSelect={onSelect} />
      </CardContent>
    </Card>
  );
}
