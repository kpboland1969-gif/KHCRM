'use client';

import { useState } from 'react';

export type LeadNoteFormClientProps = { leadId: string };

export default function LeadNoteFormClient({ leadId }: LeadNoteFormClientProps) {
  type UiError = {
    message: string;
    requestId?: string;
    retryAfterSeconds?: number | null;
    code?: string;
  };
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  async function submit() {
    const trimmed = message.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const { parseApiResponse, getRetryAfterSeconds, formatApiError } =
        await import('@/lib/api/client');
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const retryAfterSeconds = getRetryAfterSeconds(res);
      const parsed = await parseApiResponse<{ id: string }>(res);
      if (!res.ok || !parsed.ok) {
        setError({
          message: formatApiError({
            error: parsed.error,
            code: parsed.code,
            requestId: parsed.requestId,
            retryAfterSeconds,
          }),
          requestId: parsed.requestId,
          retryAfterSeconds,
          code: parsed.code,
        });
        return;
      }
      setMessage('');
      window.dispatchEvent(new CustomEvent('khcrm:activity:refresh', { detail: { leadId } }));
    } catch (e: any) {
      setError({ message: e?.message || 'Failed to add note' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        className="w-full rounded-xl border border-white/15 bg-white/[0.06] p-3 text-sm text-white placeholder-white/40 outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20"
        rows={4}
        placeholder="Write a note…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={saving}
      />
      {error ? (
        <div className="mb-2 rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-200">
          <div>{error.message}</div>
          {error.code === 'RATE_LIMITED' && error.retryAfterSeconds ? (
            <div className="mt-1 text-xs text-yellow-200">
              Retry after: {error.retryAfterSeconds} seconds
            </div>
          ) : null}
          {error.requestId ? (
            <div className="mt-2 text-xs text-white/70 flex items-center gap-2">
              Request ID: <span className="font-mono">{error.requestId}</span>
              <button
                type="button"
                className="px-2 py-1 rounded bg-white/10 text-xs text-white hover:bg-white/20"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(error.requestId!);
                  } catch {
                    // Intentionally ignore clipboard failures
                    return;
                  }
                }}
              >
                Copy
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        onClick={submit}
        disabled={saving || !message.trim()}
        className="rounded-xl border border-white/20 bg-white/[0.08] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Add Note'}
      </button>
    </div>
  );
}
