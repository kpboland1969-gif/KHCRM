import { cn } from '@/lib/ui/cn';

export function TopBar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <header
      className={cn(
        'w-full flex items-center h-16 px-6 bg-[var(--card)]/80 border-b border-[var(--border-strong)] shadow-[var(--shadow-soft)] backdrop-blur-md',
        className
      )}
      {...props}
    >
      {children}
    </header>
  );
}
