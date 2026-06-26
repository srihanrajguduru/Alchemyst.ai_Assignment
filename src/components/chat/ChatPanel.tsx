'use client';

import type { ChatMessage } from '@/types/machine';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';

type ChatPanelProps = {
  messages: ChatMessage[];
  connectionPhase: string;
  selectedSegmentId: string | null;
  onSend: (content: string) => void;
  onSelectSegment: (segmentId: string) => void;
  onSelectToolCall: (callId: string) => void;
};

export function ChatPanel({
  messages,
  connectionPhase,
  selectedSegmentId,
  onSend,
  onSelectSegment,
  onSelectToolCall,
}: ChatPanelProps) {
  const connected = connectionPhase === 'connected';

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Agent Chat</CardTitle>
        <Badge
          className={
            connected
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }
        >
          {connectionPhase}
        </Badge>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <MessageList
          messages={messages}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={onSelectSegment}
          onSelectToolCall={onSelectToolCall}
        />
        <ChatInput onSend={onSend} disabled={connectionPhase !== 'connected'} />
      </CardContent>
    </Card>
  );
}
