'use client';
import { useState, useMemo } from 'react';
import EmailSlideOver, { EmailSlideOverPrefill } from './EmailSlideOver';

type DocLite = { id: string; filename: string };
type EmailHistoryItem = {
  id: string;
  sent_at: string | null;
  to_email: string | null;
  subject: string | null;
  body: string | null;
  status: string | null;
  error: string | null;
  document_ids: unknown[] | null;
  attachments: { id: string; filename: string }[];
};

type Props = {
  leadId: string;
  leadEmail: string | null;
  documents: DocLite[];
  items: EmailHistoryItem[];
};

function getStatusBadge(item: EmailHistoryItem) {
  if (item.error && item.error.length > 0) {
    return (
      <span className="inline-block rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
        Error
      </span>
    );
  }
  const status = (item.status || '').toLowerCase();
  if (/(sent|success|ok)/.test(status)) {
    return (
      <span className="inline-block rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
        Sent
      </span>
    );
  }
  if (/(pending|queued)/.test(status)) {
    return (
      <span className="inline-block rounded bg-yellow-400/20 px-2 py-0.5 text-xs text-yellow-700">
        Pending
      </span>
    );
  }
  if (/(failed|error)/.test(status)) {
    return (
      <span className="inline-block rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-block rounded bg-white/10 px-2 py-0.5 text-xs text-white/60">
      Unknown
    </span>
  );
}

export default function EmailHistoryPanelClient({ leadId, leadEmail, documents, items }: Props) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<EmailSlideOverPrefill | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'sent' | 'pending' | 'error' | 'unknown'
  >('all');
  const [search, setSearch] = useState('');

  function getStatusCategory(item: EmailHistoryItem): 'sent' | 'pending' | 'error' | 'unknown' {
    if (item.error && item.error.length > 0) return 'error';
    const status = (item.status || '').toLowerCase();
    if (/(sent|success|ok)/.test(status)) return 'sent';
    if (/(pending|queued)/.test(status)) return 'pending';
    if (/(failed|error)/.test(status)) return 'error';
    return 'unknown';
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const category = getStatusCategory(item);
      if (statusFilter !== 'all' && category !== statusFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const to = (item.to_email ?? '').toLowerCase();
      const subject = (item.subject ?? '').toLowerCase();
      const attachments = item.attachments.map((a) => a.filename.toLowerCase()).join(' ');
      return to.includes(q) || subject.includes(q) || attachments.includes(q);
    });
  }, [items, statusFilter, search]);

  function handleResend(item: EmailHistoryItem) {
    setPrefill({
      to: item.to_email ?? leadEmail ?? '',
      subject: item.subject ?? '',
      body: item.body ?? '',
      documentIds: Array.isArray(item.document_ids)
        ? item.document_ids.map((id) => String(id))
        : [],
      resendFromLogId: item.id,
    });
    setOpen(true);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
        <div className="text-lg font-semibold">Email History</div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject or recipient…"
            className="rounded border border-white/20 bg-white/[0.04] px-2 py-1 text-xs text-white focus:outline-none"
            style={{ minWidth: 180 }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded border border-white/20 bg-white/[0.04] px-2 py-1 text-xs text-white focus:outline-none"
          >
            <option value="all">All</option>
            <option value="sent">Sent</option>
            <option value="pending">Pending</option>
            <option value="error">Error</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-white/70">No emails have been sent for this lead yet.</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-sm text-white/70">No emails match your filters.</div>
      ) : (
        <div className="space-y-4 mt-2">
          {filteredItems.map((row) => {
            const sentAt = row.sent_at ? new Date(row.sent_at).toLocaleString() : 'Unknown time';
            const toEmail = row.to_email || 'Unknown recipient';
            const subject = row.subject || '(No subject)';
            const error = row.error;
            return (
              <div
                key={row.id}
                className="rounded-xl border border-white/10 bg-white/[0.01] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-white/90">{sentAt}</div>
                    {getStatusBadge(row)}
                  </div>
                  <div className="mt-1 text-xs text-white/80">To: {toEmail}</div>
                  <div className="mt-1 text-xs text-white/80">Subject: {subject}</div>
                  {error ? <div className="mt-1 text-xs text-red-400">Error: {error}</div> : null}
                  <div className="mt-1 text-xs text-white/60">
                    Attachments:{' '}
                    {row.attachments.length > 0
                      ? row.attachments.map((a) => (
                          <span
                            key={a.id}
                            className="inline-block bg-white/10 rounded px-2 py-0.5 mr-1 text-white/80"
                          >
                            {a.filename}
                          </span>
                        ))
                      : 'No attachments'}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.08] px-3 py-1 text-xs font-medium text-white hover:bg-white/[0.15]"
                    onClick={() => handleResend(row)}
                  >
                    Resend
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <EmailSlideOver
        leadId={leadId}
        leadEmail={leadEmail}
        documents={documents}
        open={open}
        onOpenChange={setOpen}
        prefill={prefill ?? undefined}
      />
    </div>
  );
}
