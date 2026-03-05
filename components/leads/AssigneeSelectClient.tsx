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
    (async () => {
      try {
        const { parseApiResponse, getRetryAfterSeconds, formatApiError } =
          await import('@/lib/api/client');
        const res = await fetch('/api/users/assignable');
        const retryAfterSeconds = getRetryAfterSeconds(res);
        const parsed = await parseApiResponse(res);
        if (!res.ok || !parsed.ok) {
          setError(
            formatApiError({
              error: parsed.error,
              code: parsed.code,
              requestId: parsed.requestId,
              retryAfterSeconds,
            }),
          );
        } else if (parsed.data && Array.isArray(parsed.data)) {
          setUsers(parsed.data);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load users');
      }
    })();
  }, [disabled]);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newVal = e.target.value;
    setValue(newVal);
    setLoading(true);
    setError(null);
    try {
      const { parseApiResponse, getRetryAfterSeconds, formatApiError } =
        await import('@/lib/api/client');
      const res = await fetch(`/api/leads/${leadId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_user_id: newVal || null }),
      });
      const retryAfterSeconds = getRetryAfterSeconds(res);
      const parsed = await parseApiResponse(res);
      if (!res.ok || !parsed.ok) {
        setError(
          formatApiError({
            error: parsed.error,
            code: parsed.code,
            requestId: parsed.requestId,
            retryAfterSeconds,
          }),
        );
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
      {error ? (
        <div className="mb-2 rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-200">
          {(() => {
            const match = error.match(/Request ID: ([\w-]+)/);
            const requestId = match ? match[1] : null;
            const retryMatch = error.match(/Try again in (\d+) seconds/);
            const retryAfter = retryMatch ? retryMatch[1] : null;
            return (
              <>
                <div>{error.replace(/\nRequest ID: [\w-]+/, '')}</div>
                {retryAfter ? (
                  <div className="mt-1 text-xs text-yellow-200">
                    Retry after: {retryAfter} seconds
                  </div>
                ) : null}
                {requestId ? (
                  <div className="mt-2 text-xs text-white/70 flex items-center gap-2">
                    Request ID: <span className="font-mono">{requestId}</span>
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-white/10 text-xs text-white hover:bg-white/20"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(requestId);
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
              </>
            );
          })()}
        </div>
      ) : null}
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
