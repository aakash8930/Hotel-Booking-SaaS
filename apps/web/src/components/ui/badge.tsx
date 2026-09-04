import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger';

const toneClasses: Record<Tone, string> = {
  brand: 'bg-brand-500/15 text-brand-300 border-brand-500/30',
  neutral: 'bg-surface-200 text-surface-700 border-surface-300',
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/15 text-red-400 border-red-500/30',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium tracking-wide',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
