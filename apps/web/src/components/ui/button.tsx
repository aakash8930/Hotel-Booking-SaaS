import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-brand-400 to-brand-600 text-surface-50 shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 hover:from-brand-300 hover:to-brand-500 active:translate-y-0 active:shadow-none',
  secondary:
    'bg-surface-100 text-surface-800 border border-surface-300 hover:bg-surface-200 active:bg-surface-300',
  ghost: 'text-surface-700 hover:bg-surface-100 hover:text-surface-900 active:bg-surface-200',
  outline:
    'bg-transparent text-brand-300 border border-brand-500/40 hover:border-brand-400 hover:bg-brand-500/10',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm rounded-lg gap-1.5',
  md: 'px-6 py-3 text-base rounded-xl gap-2',
  lg: 'px-8 py-4 text-lg rounded-xl gap-2',
};

const base =
  'inline-flex items-center justify-center font-semibold transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-surface-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

interface LinkProps extends CommonProps {
  href: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  href,
  ...props
}: ButtonProps | LinkProps) {
  const classes = cn(base, variantClasses[variant], sizeClasses[size], className);

  if (href) {
    const linkProps = props as Omit<LinkProps, 'href' | keyof CommonProps>;
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <Link href={href} className={classes} {...(linkProps as any)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
