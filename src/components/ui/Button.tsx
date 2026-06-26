import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md';
};

export function Button({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2 text-xs' : 'h-10 px-4 text-sm',
        variant === 'default' && 'bg-zinc-900 text-white hover:bg-zinc-800',
        variant === 'ghost' && 'hover:bg-zinc-100',
        variant === 'outline' && 'border border-zinc-300 hover:bg-zinc-50',
        className,
      )}
      {...props}
    />
  );
}
