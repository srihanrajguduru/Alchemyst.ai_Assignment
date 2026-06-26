'use client';

import { useCallback } from 'react';
import { useAgentConnection } from '@/hooks/useAgentConnection';
import { findSegmentByCallId } from '@/lib/state/chatMachine';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ReconnectBadge } from '@/components/chat/ReconnectBadge';
import { InspectorPanel } from '@/components/inspector/InspectorPanel';
import { TimelinePanel } from '@/components/timeline/TimelinePanel';

export function AgentConsole() {
  const {
    state,
    sendUserMessage,
    selectEvent,
    selectSegment,
    setContextCursor,
    scrollTimelineToCall,
    wsUrl,
  } = useAgentConnection();

  const handleSelectEvent = useCallback(
    (eventId: string | null) => {
      selectEvent(eventId);
      if (!eventId) {
        selectSegment(null);
        return;
      }

      const event = state.timeline.find((item) => item.id === eventId);
      if (!event) return;

      if (event.type === 'TOOL_CALL' || event.type === 'TOOL_RESULT') {
        if (event.callId) {
          const match = findSegmentByCallId(state.messages, event.callId);
          if (match) selectSegment(match.segment.id);
        }
      }
    },
    [selectEvent, selectSegment, state.messages, state.timeline],
  );

  const handleSelectSegment = useCallback(
    (segmentId: string) => {
      selectSegment(segmentId);
    },
    [selectSegment],
  );

  const handleSelectToolCall = useCallback(
    (callId: string) => {
      scrollTimelineToCall(callId);
    },
    [scrollTimelineToCall],
  );

  return (
    <div className="flex h-screen flex-col bg-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Agent Console</h1>
          <p className="text-xs text-zinc-500">Connected to {wsUrl}</p>
        </div>
        <p className="text-xs text-zinc-400">
          last seq {state.lastProcessedSeq} · {state.timeline.length} timeline events
        </p>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-12">
        <div className="flex min-h-0 flex-col lg:col-span-5">
          <ChatPanel
            messages={state.messages}
            connectionPhase={state.connectionPhase}
            selectedSegmentId={state.selectedSegmentId}
            onSend={sendUserMessage}
            onSelectSegment={handleSelectSegment}
            onSelectToolCall={handleSelectToolCall}
          />
        </div>
        <div className="flex min-h-0 flex-col lg:col-span-4">
          <TimelinePanel
            events={state.timeline}
            selectedEventId={state.selectedEventId}
            onSelect={handleSelectEvent}
          />
        </div>
        <div className="flex min-h-0 flex-col lg:col-span-3">
          <InspectorPanel
            histories={state.contextHistories}
            activeContextId={state.activeContextId}
            onCursorChange={setContextCursor}
          />
        </div>
      </div>

      <ReconnectBadge phase={state.connectionPhase} attempt={state.reconnectAttempt} />
    </div>
  );
}
