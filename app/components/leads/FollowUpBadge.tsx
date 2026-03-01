import { computeFollowUpLabel } from '@/lib/followups';

export default function FollowUpBadge({ followUpDate }: { followUpDate: string | null }) {
  const { label, kind } = computeFollowUpLabel(followUpDate);
  if (!label) return null;
  let color = 'bg-[var(--muted)] text-[var(--muted-foreground)]';
  if (kind === 'overdue') color = 'bg-[var(--danger)]/20 text-[var(--danger)]';
  if (kind === 'today') color = 'bg-[var(--primary)]/20 text-[var(--primary)]';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>{label}</span>
  );
}
