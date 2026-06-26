'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type ScrollAreaProps = {
  className?: string;
  children: ReactNode;
  autoScroll?: boolean;
};

export function ScrollArea({ className, children, autoScroll = false }: ScrollAreaProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoScroll || !ref.current) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [children, autoScroll]);

  return (
    <div ref={ref} className={cn('overflow-y-auto', className)}>
      {children}
    </div>
  );
}
