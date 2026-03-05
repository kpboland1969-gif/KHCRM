'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Step = 'loading' | 'need_password' | 'done' | 'error';

function getErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

export default function CompleteInviteClient() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    return createClient(url, anon, { auth: { persistSession: true } });
  }, []);

  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setStep('loading');
      setError(null);

      try {
        /**
         * Supabase invite links may arrive in one of two shapes:
         *  - PKCE/code flow: URL has ?code=...
         *  - Hash token flow: URL has #access_token=...
         *
         * auth-helpers will often handle the code exchange automatically,
         * but we still verify that a session exists.
         */
        if (!supabase) {
          throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
        }

        // 1) If code flow is used, exchange it for a session.
        // Supabase invite links commonly include: ?code=...
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) throw exchangeErr;

          // Clean URL after exchange to avoid confusion on refresh
          url.searchParams.delete('code');
          window.history.replaceState({}, '', url.toString());
        }

        // 2) If hash flow is used (older): #access_token=...
        // Supabase JS typically reads hash automatically when calling getSession.
        const { data, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;

        if (!data.session) {
          throw new Error(
            'No session found from invite link. Open the invite link in an incognito window or log out first.',
          );
        }

        if (!cancelled) setStep('need_password');
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e));
          setStep('error');
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function onSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError('Supabase client not configured.');
      return;
    }

    const client = supabase;

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== password2) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const { error: updateErr } = await client.auth.updateUser({ password });
      if (updateErr) throw updateErr;

      setStep('done');

      // Send them somewhere useful after completion.
      // If your app routes differ, adjust to your login/dashboard route.
      window.location.href = '/dashboard';
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-xl font-semibold text-gray-900">Complete your invite</h1>
      <p className="mt-2 text-sm text-gray-600">
        Set a password to finish activating your account.
      </p>

      {step === 'loading' ? (
        <div className="mt-6 rounded-md border bg-white p-4 text-sm text-gray-700">
          Validating invite link...
        </div>
      ) : null}

      {step === 'error' ? (
        <div className="mt-6 rounded-md border bg-white p-4">
          <p className="text-sm text-red-600">{error}</p>
          <p className="mt-3 text-sm text-gray-700">
            Tip: open the invite link in an incognito window, or log out of your current account
            first.
          </p>
        </div>
      ) : null}

      {step === 'need_password' ? (
        <form onSubmit={onSetPassword} className="mt-6 rounded-md border bg-white p-4">
          <label className="block text-xs font-medium text-gray-700">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm text-gray-900"
            autoComplete="new-password"
          />

          <label className="mt-4 block text-xs font-medium text-gray-700">Confirm password</label>
          <input
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm text-gray-900"
            autoComplete="new-password"
          />

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Saving...' : 'Set password'}
          </button>
        </form>
      ) : null}

      {step === 'done' ? (
        <div className="mt-6 rounded-md border bg-white p-4 text-sm text-green-700">
          Password set. Redirecting...
        </div>
      ) : null}
    </div>
  );
}
