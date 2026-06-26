'use client';

import type { ChatMessage } from '@/types/machine';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { MessageRow } from './MessageRow';

type MessageListProps = {
  messages: ChatMessage[];
  selectedSegmentId: string | null;
  onSelectSegment: (segmentId: string) => void;
  onSelectToolCall: (callId: string) => void;
};

export function MessageList({
  messages,
  selectedSegmentId,
  onSelectSegment,
  onSelectToolCall,
}: MessageListProps) {
  return (
    <ScrollArea className="flex-1 px-4 py-4" autoScroll>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-zinc-500">
            Send a message to start. Try &quot;summarize the Q3 report&quot; or &quot;analyze the correlation&quot;.
          </p>
        )}
        {messages.map((message) => (
          <MessageRow
            key={message.id}
            message={message}
            selectedSegmentId={selectedSegmentId}
            onSelectSegment={onSelectSegment}
            onSelectToolCall={onSelectToolCall}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
