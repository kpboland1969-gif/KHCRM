'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type LeadTouchActionsProps = { leadId: string };

type UiError = {
  message: string;
  requestId?: string;
  retryAfterSeconds?: number | null;
  code?: string;
};

export default function LeadTouchActions({ leadId }: LeadTouchActionsProps) {
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const router = useRouter();

  async function markTouched() {
    setLoading(true);
    setError(null);
    try {
      const { parseApiResponse, getRetryAfterSeconds, formatApiError } =
        await import('@/lib/api/client');
      const res = await fetch(`/api/leads/${leadId}/touch`, { method: 'POST' });
      const retryAfterSeconds = getRetryAfterSeconds(res);
      const parsed = await parseApiResponse<any>(res);
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
        setLoading(false);
        return;
      }
      setError(null);
      router.refresh();
    } catch (e: any) {
      setError({ message: e?.message || 'Failed to mark touched' });
    } finally {
      setLoading(false);
    }
  }

  async function updateFollowUp() {
    if (!followUpDate) return;
    setLoading(true);
    setError(null);
    try {
      const { parseApiResponse, getRetryAfterSeconds, formatApiError } =
        await import('@/lib/api/client');
      const res = await fetch(`/api/leads/${leadId}/followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followUpDate }),
      });
      const retryAfterSeconds = getRetryAfterSeconds(res);
      const parsed = await parseApiResponse<any>(res);
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
        setLoading(false);
        return;
      }
      setError(null);
      router.refresh();
    } catch (e: any) {
      setError({ message: e?.message || 'Failed to update follow-up' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 mb-4">
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
      <div className="flex gap-2 items-end">
        <button
          className="px-3 py-1 rounded bg-[var(--primary)] text-white font-semibold disabled:opacity-50"
          onClick={markTouched}
          disabled={loading}
          type="button"
        >
          Mark Touched
        </button>
        <div>
          <label className="block text-xs mb-1">Follow-Up Date</label>
          <input
            type="datetime-local"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
        <button
          className="px-3 py-1 rounded bg-[var(--primary)] text-white font-semibold disabled:opacity-50"
          onClick={updateFollowUp}
          disabled={loading || !followUpDate}
          type="button"
        >
          Update Follow-Up
        </button>
      </div>
    </div>
  );
}
