'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types/machine';
import { cn } from '@/lib/utils/cn';
import { TokenStream } from './TokenStream';
import { ToolCallCard } from './ToolCallCard';

type MessageRowProps = {
  message: ChatMessage;
  selectedSegmentId: string | null;
  onSelectSegment: (segmentId: string) => void;
  onSelectToolCall: (callId: string) => void;
};

export function MessageRow({
  message,
  selectedSegmentId,
  onSelectSegment,
  onSelectToolCall,
}: MessageRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedSegmentId || !rowRef.current) return;
    const toolMatch = message.segments.find(
      (segment): segment is Extract<typeof segment, { kind: 'tool' }> =>
        segment.kind === 'tool' && segment.id === selectedSegmentId,
    );
    const selector = toolMatch
      ? `#tool-${toolMatch.callId}`
      : `#segment-${selectedSegmentId}`;
    const el = rowRef.current.querySelector(selector);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedSegmentId, message.segments]);

  return (
    <div
      ref={rowRef}
      className={cn(
        'rounded-lg px-4 py-3',
        message.role === 'user' ? 'bg-zinc-100' : 'bg-white border border-zinc-100',
      )}
    >
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {message.role === 'user' ? 'You' : 'Agent'}
        {message.status === 'streaming' && (
          <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        )}
      </div>
      <div className="text-sm leading-relaxed text-zinc-900">
        {message.segments.map((segment) => {
          if (segment.kind === 'text') {
            return (
              <TokenStream
                key={segment.id}
                segmentId={segment.id}
                text={segment.text}
                selected={selectedSegmentId === segment.id}
                onSelect={() => onSelectSegment(segment.id)}
              />
            );
          }

          return (
            <ToolCallCard
              key={segment.id}
              segment={segment}
              selected={selectedSegmentId === segment.id}
              onSelect={() => {
                onSelectSegment(segment.id);
                onSelectToolCall(segment.callId);
              }}
            />
          );
        })}
        {message.errorText && (
          <p className="mt-2 text-sm text-red-600">{message.errorText}</p>
        )}
      </div>
    </div>
  );
}
