'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AssigneeSelectClient({
  leadId,
  assignedUserId,
  disabled,
}: {
  leadId: string;
  assignedUserId: string | null;
  disabled?: boolean;
}) {
  const [users, setUsers] = useState<
    { id: string; full_name: string | null; email: string | null }[]
  >([]);
  const [value, setValue] = useState(assignedUserId ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (disabled) return;
    fetch('/api/users/assignable')
      .then((r) => r.json())
      .then((d) => {
        if (d?.users) setUsers(d.users);
      });
  }, [disabled]);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newVal = e.target.value;
    setValue(newVal);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_user_id: newVal || null }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.error || 'Failed to assign');
      } else {
        router.refresh();
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to assign');
    } finally {
      setLoading(false);
    }
  }

  return disabled ? null : (
    <div className="flex flex-col gap-1">
      <select
        value={value}
        onChange={handleChange}
        disabled={loading}
        className="rounded border border-white/20 bg-white/[0.04] px-2 py-1 text-xs text-white focus:outline-none"
      >
        <option value="">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.full_name || u.email || u.id}
          </option>
        ))}
      </select>
      {loading ? <span className="text-xs text-white/60">Saving…</span> : null}
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  );
}
