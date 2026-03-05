'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/lib/ui/Button';

export type LeadActivityNoteComposerClientProps = { leadId: string };

export default function LeadActivityNoteComposerClient({
  leadId,
}: LeadActivityNoteComposerClientProps) {
  const [message, setMessage] = useState('');
  type UiError = {
    message: string;
    requestId?: string;
    retryAfterSeconds?: number | null;
    code?: string;
  };
  const [error, setError] = useState<UiError | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!message.trim()) {
      setError({ message: 'Message required' });
      return;
    }
    startTransition(async () => {
      try {
        const { parseApiResponse, getRetryAfterSeconds, formatApiError } =
          await import('@/lib/api/client');
        const res = await fetch(`/api/leads/${leadId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
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
        setError(null);
        router.refresh();
      } catch (e: any) {
        setError({ message: e?.message || 'Failed to add note' });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Add a note…"
        disabled={pending}
        maxLength={2000}
        className="resize-vertical"
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
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending || !message.trim()}>
          {pending ? 'Adding…' : 'Add Note'}
        </Button>
      </div>
    </form>
  );
}
