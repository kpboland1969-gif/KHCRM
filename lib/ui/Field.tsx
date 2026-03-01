import { cn } from '@/lib/ui/cn';
import { formLabelClass } from '@/components/ui/formStyles';
import { ReactNode } from 'react';

export function Field({
  label,
  children,
  className,
  ...props
}: {
  label: ReactNode;
  children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      <label className={"block mb-1 " + (typeof label === 'string' ? formLabelClass : '')}>{label}</label>
      <div className="rounded-[var(--radius-ctl)] bg-[var(--card)] border border-[var(--border)] focus-within:ring-2 focus-within:ring-[var(--focus)] transition">
        {children}
      </div>
    </div>
  );
}
