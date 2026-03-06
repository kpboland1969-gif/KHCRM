'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';
import { parseApiResponse, formatApiError, getRetryAfterSeconds } from '@/lib/api/client';

type ProfileUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  disabled?: boolean | null;
  created_at?: string | null;
  username?: string | null;
};

function fallbackUsername(u: ProfileUser): string {
  if (u.username && u.username.trim()) return u.username.trim();

  if (u.email && u.email.includes('@')) {
    return u.email.split('@')[0];
  }

  if (u.full_name && u.full_name.trim()) {
    return u.full_name.trim().toLowerCase().replace(/\s+/g, '');
  }

  return 'user';
}

function extractUsersFromAdminUsersResponse(payload: any): any[] {
  const candidates = [
    payload?.data?.users,
    payload?.users,
    payload?.data,
    payload?.data?.data?.users,
    payload?.data?.data,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function roleRank(role: string | null | undefined) {
  if (role === 'admin') return 0;
  if (role === 'manager') return 1;
  return 2;
}

function sortUsersForAdminTable(list: ProfileUser[]): ProfileUser[] {
  return [...list].sort((a, b) => {
    const aDisabled = !!(a.disabled ?? false);
    const bDisabled = !!(b.disabled ?? false);

    if (aDisabled !== bDisabled) return aDisabled ? 1 : -1;

    const ar = roleRank(a.role);
    const br = roleRank(b.role);
    if (ar !== br) return ar - br;

    const ae = (a.email ?? '').toLowerCase();
    const be = (b.email ?? '').toLowerCase();
    return ae.localeCompare(be);
  });
}

function hardClearSupabaseSessionStorage() {
  try {
    if (typeof window !== 'undefined') {
      const ls = window.localStorage;
      const ss = window.sessionStorage;

      const shouldClearKey = (k: string) =>
        k.startsWith('sb-') ||
        k.includes('supabase') ||
        k.includes('auth-token') ||
        k.includes('access-token') ||
        k.includes('refresh-token');

      for (let i = ls.length - 1; i >= 0; i--) {
        const key = ls.key(i);
        if (key && shouldClearKey(key)) ls.removeItem(key);
      }

      for (let i = ss.length - 1; i >= 0; i--) {
        const key = ss.key(i);
        if (key && shouldClearKey(key)) ss.removeItem(key);
      }
    }
  } catch {
    // ignore
  }

  try {
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';').map((c) => c.trim());
      for (const c of cookies) {
        const eq = c.indexOf('=');
        const name = (eq >= 0 ? c.slice(0, eq) : c).trim();
        if (
          name.startsWith('sb-') ||
          name.includes('supabase') ||
          name.includes('auth') ||
          name.includes('token')
        ) {
          document.cookie = `${name}=; Max-Age=0; path=/`;
          document.cookie = `${name}=; Max-Age=0; path=/; samesite=lax`;
        }
      }
    }
  } catch {
    // ignore
  }
}

function normalizeUnknownError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (typeof e === 'string') return new Error(e);
  try {
    return new Error(JSON.stringify(e));
  } catch {
    return new Error('Unknown error');
  }
}

function Badge({
  children,
  color,
}: {
  children: string;
  color: 'green' | 'gray' | 'red' | 'blue';
}) {
  const cls =
    color === 'green'
      ? 'bg-green-50 text-green-700 ring-green-600/20'
      : color === 'red'
        ? 'bg-red-50 text-red-700 ring-red-600/20'
        : color === 'blue'
          ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
          : 'bg-gray-50 text-gray-700 ring-gray-600/20';

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {children}
    </span>
  );
}

function toIsoDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export default function AdminUsersClient() {
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [rowMessage, setRowMessage] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editNameById, setEditNameById] = useState<Record<string, string>>({});

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    return createClient(url, anon, { auth: { persistSession: true } });
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/users', { method: 'GET' });
      const parsed = await parseApiResponse<{ users: ProfileUser[] }>(res);

      if (!parsed.ok) {
        setError(formatApiError(parsed));
        return;
      }

      const list = extractUsersFromAdminUsersResponse(parsed) as ProfileUser[];
      const sorted = sortUsersForAdminTable(list);

      setUsers(sorted);
      setEditNameById((prev) => {
        const next: Record<string, string> = { ...prev };
        for (const u of sorted) {
          if (next[u.id] === undefined) next[u.id] = u.full_name ?? '';
        }
        return next;
      });
    } catch (e) {
      setError(normalizeUnknownError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      if (!supabase) {
        if (!cancelled) setCurrentUserId(null);
        return;
      }

      try {
        const { data } = await supabase.auth.getUser();
        if (!cancelled) setCurrentUserId(data?.user?.id ?? null);
      } catch {
        if (!cancelled) setCurrentUserId(null);
      }
    }

    void loadMe();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!inviteSuccess) return;
    const t = window.setTimeout(() => setInviteSuccess(null), 5000);
    return () => window.clearTimeout(t);
  }, [inviteSuccess]);

  useEffect(() => {
    if (!rowMessage) return;
    const t = window.setTimeout(() => setRowMessage(null), 5000);
    return () => window.clearTimeout(t);
  }, [rowMessage]);

  const updateUser = useCallback(
    async (
      userId: string,
      patch: Partial<Pick<ProfileUser, 'full_name' | 'role' | 'disabled'>>,
    ) => {
      setRowMessage(null);
      setRowBusyId(userId);

      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });

        const parsed = await parseApiResponse(res);
        if (!parsed.ok) {
          const retryAfter = getRetryAfterSeconds(res);
          const base = formatApiError(parsed);
          setRowMessage(retryAfter ? `${base} (Retry after ${retryAfter}s)` : base);
          return false;
        }

        await loadUsers();
        return true;
      } catch (e) {
        setRowMessage(normalizeUnknownError(e).message);
        return false;
      } finally {
        setRowBusyId(null);
      }
    },
    [loadUsers],
  );

  const onToggleDisabled = useCallback(
    async (u: ProfileUser) => {
      const isSelf = !!currentUserId && u.id === currentUserId;
      if (isSelf) {
        setRowMessage('You cannot disable your own account.');
        return;
      }

      const nextDisabled = !(u.disabled ?? false);
      const verb = nextDisabled ? 'Disable' : 'Enable';
      const ok = window.confirm(
        `${verb} this user?\n\n${nextDisabled ? 'Disabled users cannot log in.' : 'They will regain access.'}`,
      );
      if (!ok) return;

      await updateUser(u.id, { disabled: nextDisabled });
    },
    [currentUserId, updateUser],
  );

  const onChangeRole = useCallback(
    async (u: ProfileUser, nextRole: string) => {
      const isSelf = !!currentUserId && u.id === currentUserId;
      if (isSelf && nextRole !== 'admin') {
        setRowMessage('You cannot remove your own admin access.');
        return;
      }

      const ok = window.confirm(`Change role for ${u.email ?? u.id.slice(0, 8)} to "${nextRole}"?`);
      if (!ok) return;

      await updateUser(u.id, { role: nextRole });
    },
    [currentUserId, updateUser],
  );

  const onSaveName = useCallback(
    async (u: ProfileUser, nextName: string) => {
      const full_name = nextName.trim();
      if (!full_name) {
        setRowMessage('Full name cannot be empty.');
        return;
      }

      const ok = window.confirm(`Save new name for ${u.email ?? u.id.slice(0, 8)}?`);
      if (!ok) return;

      await updateUser(u.id, { full_name });
    },
    [updateUser],
  );

  const onInviteSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setInviteError(null);
      setInviteSuccess(null);

      const email = normalizeEmail(inviteEmail);
      const full_name = inviteName.trim();
      const role = inviteRole.trim();

      if (!email || !email.includes('@')) {
        setInviteError('Please enter a valid email.');
        return;
      }
      if (!full_name) {
        setInviteError('Please enter a full name.');
        return;
      }
      if (!role) {
        setInviteError('Please select a role.');
        return;
      }

      const alreadyExists = users.some((u) => normalizeEmail(u.email ?? '') === email);
      if (alreadyExists) {
        setInviteError('A user with this email already exists.');
        return;
      }

      setInviteBusy(true);
      try {
        const res = await fetch('/api/admin/users/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, full_name, role }),
        });

        const parsed = await parseApiResponse<{ user: ProfileUser; invited: boolean }>(res);

        if (!parsed.ok) {
          const retryAfter = getRetryAfterSeconds(res);
          const base = formatApiError(parsed);
          setInviteError(retryAfter ? `${base} (Retry after ${retryAfter}s)` : base);
          return;
        }

        setInviteSuccess(`Invited ${email}`);
        setInviteEmail('');
        setInviteName('');
        setInviteRole('user');
        await loadUsers();
      } catch (err) {
        setInviteError(normalizeUnknownError(err).message);
      } finally {
        setInviteBusy(false);
      }
    },
    [inviteEmail, inviteName, inviteRole, loadUsers, users],
  );

  const onLogout = useCallback(async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // ignore
    }

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }

    hardClearSupabaseSessionStorage();
    window.location.href = '/';
  }, [supabase]);

  const onResetPassword = useCallback(async (userId: string) => {
    const ok = window.confirm(
      'Send a password reset email for this user?\n\nThis will generate a reset link and email it to them.',
    );
    if (!ok) return;

    setRowMessage(null);
    setRowBusyId(userId);

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, {
        method: 'POST',
      });

      const parsed = await parseApiResponse<{ ok: boolean }>(res);
      if (!parsed.ok) {
        const retryAfter = getRetryAfterSeconds(res);
        const base = formatApiError(parsed);
        setRowMessage(retryAfter ? `${base} (Retry after ${retryAfter}s)` : base);
        return;
      }

      setRowMessage('Password reset email generated/sent.');
    } catch (e) {
      setRowMessage(normalizeUnknownError(e).message);
    } finally {
      setRowBusyId(null);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Settings (admin only)</h1>
          <p className="mt-1 text-sm text-gray-200">Manage users and access.</p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
        >
          Log out
        </button>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Invite user</h2>
            <p className="mt-1 text-sm text-gray-600">
              Sends a Supabase invite email and creates the profile.
            </p>
          </div>
        </div>

        <form onSubmit={onInviteSubmit} className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-700">Email</label>
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              type="email"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white"
              placeholder="user@company.com"
              autoComplete="email"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-700">Full name</label>
            <input
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              type="text"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white"
              placeholder="Full Name"
              autoComplete="name"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-700">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm text-gray-900 bg-white"
            >
              <option value="user">user</option>
              <option value="manager">manager</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div className="md:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={inviteBusy}
              className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {inviteBusy ? 'Inviting...' : 'Send invite'}
            </button>
          </div>
        </form>

        {inviteError ? <p className="mt-3 text-sm text-red-600">{inviteError}</p> : null}
        {inviteSuccess ? <p className="mt-3 text-sm text-green-700">{inviteSuccess}</p> : null}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white">Users</h2>

        <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">Full Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">Username</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">Role</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">Active</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">Created At</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10 bg-white/5">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-white/80" colSpan={7}>
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-red-200" colSpan={7}>
                    {error}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-white/80" colSpan={7}>
                    No users found. (If this is unexpected, check /api/admin/users response shape.)
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const active = !(u.disabled ?? false);
                  const isSelf = !!currentUserId && u.id === currentUserId;

                  return (
                    <tr
                      key={u.id}
                      className={(u.disabled ?? false) ? 'bg-red-500/10 opacity-70' : ''}
                    >
                      <td className="px-4 py-3 text-sm text-white/90">{u.email ?? ''}</td>
                      <td className="px-4 py-3 text-sm text-white/90">
                        <div className="flex items-center gap-2">
                          <input
                            value={editNameById[u.id] ?? ''}
                            onChange={(e) =>
                              setEditNameById((p) => ({ ...p, [u.id]: e.target.value }))
                            }
                            className="w-full max-w-[240px] rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm text-white/90"
                            disabled={rowBusyId === u.id}
                          />
                          <button
                            type="button"
                            disabled={rowBusyId === u.id}
                            onClick={() => void onSaveName(u, editNameById[u.id] ?? '')}
                            className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs font-medium text-white hover:bg-white/15 disabled:opacity-50"
                            title="Save name"
                          >
                            Save
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/90">{fallbackUsername(u)}</td>
                      <td className="px-4 py-3 text-sm text-white/90">
                        <select
                          value={u.role ?? 'user'}
                          disabled={rowBusyId === u.id || isSelf}
                          title={isSelf ? 'You cannot change your own role.' : undefined}
                          onChange={(e) => void onChangeRole(u, e.target.value)}
                          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm text-white/90"
                        >
                          <option value="user">user</option>
                          <option value="manager">manager</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {active ? <Badge color="green">Yes</Badge> : <Badge color="red">No</Badge>}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/80">{toIsoDate(u.created_at)}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={rowBusyId === u.id}
                            onClick={() => void onResetPassword(u.id)}
                            className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15 disabled:opacity-50"
                          >
                            {rowBusyId === u.id ? 'Working...' : 'Reset password'}
                          </button>
                          <button
                            type="button"
                            disabled={rowBusyId === u.id || isSelf}
                            title={isSelf ? 'You cannot disable your own account.' : undefined}
                            onClick={() => void onToggleDisabled(u)}
                            className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15 disabled:opacity-50"
                          >
                            {(u.disabled ?? false) ? 'Enable' : 'Disable'}
                          </button>
                          {isSelf ? (
                            <span className="text-xs text-white/60">This is you</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {rowMessage ? (
          <div className="mt-3 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-white/90">
            {rowMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
