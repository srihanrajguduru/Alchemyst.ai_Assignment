'use client';

import type { ToolSegment } from '@/types/machine';
import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

type ToolCallCardProps = {
  segment: ToolSegment;
  selected: boolean;
  onSelect: () => void;
};

export function ToolCallCard({ segment, selected, onSelect }: ToolCallCardProps) {
  return (
    <Card
      id={`tool-${segment.callId}`}
      className={cn(
        'my-2 border-l-4 border-l-blue-500 transition-shadow',
        selected && 'ring-2 ring-blue-400',
        segment.status === 'pending' && 'border-l-amber-500',
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect();
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 py-2">
        <CardTitle className="font-mono text-xs">{segment.toolName}</CardTitle>
        <Badge className={segment.status === 'pending' ? 'border-amber-200 bg-amber-50 text-amber-800' : ''}>
          {segment.status === 'pending' ? 'waiting' : 'complete'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2 py-2 text-xs">
        <div>
          <div className="mb-1 font-medium text-zinc-500">Arguments</div>
          <pre className="overflow-x-auto rounded bg-zinc-50 p-2 font-mono text-[11px]">
            {JSON.stringify(segment.args, null, 2)}
          </pre>
        </div>
        {segment.result && (
          <div>
            <div className="mb-1 font-medium text-zinc-500">Result</div>
            <pre className="overflow-x-auto rounded bg-emerald-50 p-2 font-mono text-[11px]">
              {JSON.stringify(segment.result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
