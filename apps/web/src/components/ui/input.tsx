import type { InputHTMLAttributes, TextareaHTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className, ...props }: InputProps) {
  return <input className={cn('input', error && 'input-error', className)} {...props} />;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ error, className, ...props }: TextareaProps) {
  return <textarea className={cn('input', error && 'input-error', className)} {...props} />;
}

interface FieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
}

export function FieldLabel({ className, children, ...props }: FieldLabelProps) {
  return (
    <label
      className={cn('block text-sm font-medium text-surface-700 mb-1.5', className)}
      {...props}
    >
      {children}
    </label>
  );
}
