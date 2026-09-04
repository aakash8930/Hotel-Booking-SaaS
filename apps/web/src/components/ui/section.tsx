import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Section({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn('section', className)} {...props}>
      {children}
    </section>
  );
}

export function Container({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('container-custom', className)} {...props}>
      {children}
    </div>
  );
}
