import { cn } from '@/lib/ui/cn';
import { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'base' | 'primary' | 'danger';

const variantStyles: Record<ButtonVariant, string> = {
  base: 'bg-transparent text-[var(--text)] border border-[var(--border)]',
  primary:
    'bg-[var(--primary)] text-[var(--primary-ink)] shadow-[var(--shadow)] hover:bg-opacity-90',
  danger: 'bg-[var(--danger)] text-white shadow-[var(--shadow)] hover:bg-opacity-90',
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>(
  ({ className, variant = 'base', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'rounded-[var(--radius-ctl)] px-4 py-2 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] transition',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
