import { cn } from '@/lib/ui/cn';
import { ReactNode } from 'react';

type DataTableProps = {
  headers: ReactNode[];
  rows: ReactNode[][];
  className?: string;
};

export function DataTable({ headers, rows, className }: DataTableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-[var(--radius-card)] shadow-[var(--shadow-soft)]', className)}>
      <table className="min-w-full bg-[var(--card)] text-[var(--text)]">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left font-semibold border-b border-[var(--border-strong)] bg-[var(--card)]/90"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="hover:bg-[var(--card)]/80 transition group"
            >
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 border-b border-[var(--border)] group-hover:bg-[var(--card)]/60">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
