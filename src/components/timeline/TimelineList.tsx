'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import type { TimelineEvent } from '@/types/machine';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { EventRow } from './EventRow';

type TimelineListProps = {
  events: TimelineEvent[];
  selectedEventId: string | null;
  onSelect: (eventId: string) => void;
};

export const TimelineList = memo(function TimelineList({
  events,
  selectedEventId,
  onSelect,
}: TimelineListProps) {
  const selectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedEventId || selectedEventId === selectedRef.current) return;
    selectedRef.current = selectedEventId;
    const el = document.getElementById(`timeline-${selectedEventId}`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedEventId]);

  const rendered = useMemo(
    () =>
      events.map((event) => (
        <EventRow
          key={event.id}
          event={event}
          selected={selectedEventId === event.id}
          linked={Boolean(event.linkedCallId)}
          onSelect={onSelect}
        />
      )),
    [events, selectedEventId, onSelect],
  );

  return (
    <ScrollArea className="flex-1 px-2 py-2" autoScroll>
      <div className="flex flex-col gap-2">{rendered}</div>
    </ScrollArea>
  );
});
