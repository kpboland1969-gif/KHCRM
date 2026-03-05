'use client';

import { useCallback, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

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

export default function LogoutButton() {
  const [busy, setBusy] = useState(false);

  // Client-side Supabase (anon key) is enough to sign out.
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    return createClient(url, anon, { auth: { persistSession: true } });
  }, []);

  const onLogout = useCallback(async () => {
    setBusy(true);

    // 1) Try normal signOut
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // ignore
    }

    // 2) Best-effort server logout (safe even if route doesn't exist yet)
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }

    // 3) Hard clear client storage/cookies
    hardClearSupabaseSessionStorage();

    // 4) Hard redirect
    window.location.href = '/';
  }, [supabase]);

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={busy}
      className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
      title="Log out"
    >
      {busy ? 'Logging out...' : 'Log out'}
    </button>
  );
}
