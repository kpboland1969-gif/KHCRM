import { cn } from '@/lib/ui/cn';

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-[var(--card)] backdrop-blur-md rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] border border-[var(--border)] p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
