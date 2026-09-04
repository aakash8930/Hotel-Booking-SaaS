import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glass?: boolean;
}

export function Card({ hover = true, glass = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border shadow-panel transition-colors duration-200',
        glass ? 'glass' : 'bg-surface-100 border-surface-200',
        hover && 'hover:border-surface-300',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
