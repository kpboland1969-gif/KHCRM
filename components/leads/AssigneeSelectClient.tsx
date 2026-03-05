'use client';

import { useCallback, useEffect, useState } from 'react';
import { parseApiResponse, formatApiError, getRetryAfterSeconds } from '@/lib/api/client';

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  disabled?: boolean | null;
};

function extractUsersFromAdminUsersResponse(payload: any): UserRow[] {
  // Supports multiple common response shapes:
  // 1) { ok: true, data: { users: [...] } }
  // 2) { ok: true, users: [...] }
  // 3) { ok: true, data: [...] }
  // 4) { ok: true, data: { data: { users: [...] } } } (double wrapped)
  const candidates = [
    payload?.data?.users,
    payload?.users,
    payload?.data,
    payload?.data?.data?.users,
    payload?.data?.data,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c as UserRow[];
  }
  return [];
}

function getErrorMessage(e: unknown): string {
  if (!e) return 'Unknown error';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return 'Unknown error';
  }
}

export default function AssigneeSelectClient(props: {
  leadId: string;
  assignedUserId: string | null;
}) {
  const { leadId, assignedUserId } = props;

  const [users, setUsers] = useState<UserRow[]>([]);
  const [value, setValue] = useState<string>(assignedUserId ?? '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setValue(assignedUserId ?? '');
  }, [assignedUserId]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/users', { method: 'GET' });
      const parsed = await parseApiResponse(res);

      if (!parsed.ok) {
        setError(formatApiError(parsed));
        return;
      }

      const raw = extractUsersFromAdminUsersResponse(parsed);
      setUsers(raw.filter((u) => !u?.disabled));
    } catch (e) {
      // formatApiError expects an API-shaped object
      setError(formatApiError({ error: getErrorMessage(e) }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const labelFor = useCallback((u: UserRow) => {
    return u.full_name || u.email || u.id.slice(0, 8);
  }, []);

  const onChange = useCallback(
    async (next: string) => {
      setValue(next);
      setSavedMsg(null);
      setError(null);
      setSaving(true);

      try {
        const payload = { assigned_to: next === '' ? null : next };

        const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const parsed = await parseApiResponse(res);
        if (!parsed.ok) {
          const retryAfter = getRetryAfterSeconds(res);
          const base = formatApiError(parsed);
          setError(retryAfter ? `${base} (Retry after ${retryAfter}s)` : base);
          return;
        }

        setSavedMsg('Saved');
      } catch (e) {
        setError(formatApiError({ error: getErrorMessage(e) }));
      } finally {
        setSaving(false);
      }
    },
    [leadId],
  );

  if (loading) {
    return <div className="text-sm text-white/70">Loading users…</div>;
  }

  return (
    <div className="space-y-2">
      <select
        value={value}
        onChange={(e) => void onChange(e.target.value)}
        disabled={saving}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/90 outline-none disabled:opacity-60"
      >
        <option value="">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {labelFor(u)}
            {u.role ? ` (${u.role})` : ''}
          </option>
        ))}
      </select>

      {saving ? <div className="text-xs text-white/60">Saving…</div> : null}
      {savedMsg ? <div className="text-xs text-green-300">{savedMsg}</div> : null}
      {error ? <div className="text-xs text-red-300">{error}</div> : null}
    </div>
  );
}
