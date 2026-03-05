'use client';

import { useEffect, useMemo, useState } from 'react';

type UiError = {
  message: string;
  requestId?: string;
  retryAfterSeconds?: number | null;
  code?: string;
};

type Item = {
  id: string;
  type: string;
  message: string;
  metadata: any;
  created_at: string;
  created_by: string | null;
  username?: string;
};

function prettyType(t: string) {
  return t.replaceAll('_', ' ');
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function LeadActivityFeedClient({
  leadId,
  initialItems,
}: {
  leadId: string;
  initialItems: Item[];
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [error, setError] = useState<UiError | null>(null);

  // Log a view (server-side throttled)
  useEffect(() => {
    void fetch(`/api/leads/${leadId}/view`, { method: 'POST' }).catch(() => {});
  }, [leadId]);

  // Refresh hook (note form triggers this event)
  useEffect(() => {
    let lastRefresh = 0;
    const REFRESH_DEBOUNCE_MS = 500;
    const onRefresh = (e: Event) => {
      const ce = e as CustomEvent<{ leadId: string }>;
      if (ce.detail?.leadId !== leadId) return;
      const now = Date.now();
      if (now - lastRefresh < REFRESH_DEBOUNCE_MS) return;
      lastRefresh = now;
      (async () => {
        try {
          const { parseApiResponse, getRetryAfterSeconds, formatApiError } =
            await import('@/lib/api/client');
          const res = await fetch(`/api/leads/${leadId}/activity`);
          const retryAfterSeconds = getRetryAfterSeconds(res);
          const parsed = await parseApiResponse<Item[]>(res);
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
          setItems(parsed.data ?? []);
          setError(null);
        } catch (e: any) {
          setError({ message: e?.message || 'Failed to load activity' });
        }
      })();
    };
    window.addEventListener('khcrm:activity:refresh', onRefresh as EventListener);
    return () => {
      window.removeEventListener('khcrm:activity:refresh', onRefresh as EventListener);
    };
  }, [leadId]);

  const content = useMemo(() => items ?? [], [items]);

  return (
    <div className="max-h-[520px] overflow-auto rounded-xl border border-white/10">
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
      {content.length === 0 ? (
        <div className="p-4 text-sm text-white/70">No activity yet.</div>
      ) : (
        <ul className="divide-y divide-white/10">
          {content.map((a) => (
            <li key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-white/70">
                    {prettyType(a.type)}
                  </div>
                  <div className="mt-1 text-sm text-white">{a.message}</div>
                  {a.metadata && Object.keys(a.metadata).length > 0 ? (
                    <pre className="mt-2 overflow-auto rounded-lg bg-black/20 p-2 text-xs text-white/70">
                      {JSON.stringify(a.metadata, null, 2)}
                    </pre>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-white/70">{a.username ?? '—'}</div>
                  <div className="mt-1 text-xs text-white/50">
                    {a.created_at ? formatDate(a.created_at) : '—'}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
