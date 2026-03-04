'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

type Doc = { id: string; filename: string };

export default function EmailSlideOver(props: {
  // (removed illegal router line)
  leadId: string;
  leadEmail: string | null;
  documents: Doc[];
}) {
  const router = useRouter();
  const closePanel = () => {
    setOpen(false);
  };
  const { leadId, leadEmail, documents } = props;

  const [open, setOpen] = useState(false);

  const [to, setTo] = useState(leadEmail ?? '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMsg, setSentMsg] = useState<string | null>(null);
  const [lastSentByDocumentId, setLastSentByDocumentId] = useState<
    Record<string, { sent_at: string; to_email: string | null }>
  >({});

  // Keep "To" synced when opening a different lead
  useEffect(() => {
    setTo(leadEmail ?? '');
  }, [leadEmail]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const selectedDocs = useMemo(() => {
    const s = new Set(selectedIds);
    return documents.filter((d) => s.has(d.id));
  }, [documents, selectedIds]);

  function toggleDoc(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function resetComposer() {
    setSubject('');
    setBody('');
    setSelectedIds([]);
    setError(null);
    setSentMsg(null);
    setTo(leadEmail ?? '');
  }

  async function sendEmail() {
    setError(null);
    setSentMsg(null);

    const toTrim = to.trim();
    const subjectTrim = subject.trim();
    const bodyTrim = body.trim();

    if (!toTrim || !toTrim.includes('@')) {
      setError('Lead email is missing or invalid.');
      return;
    }
    if (!subjectTrim) {
      setError('Subject is required.');
      return;
    }
    if (!bodyTrim) {
      setError('Message body is required.');
      return;
    }
    if (selectedIds.length < 1) {
      setError('Select at least one document to attach.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          to: toTrim,
          subject: subjectTrim,
          body: bodyTrim,
          documentIds: selectedIds,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? 'Failed to send email');
        return;
      }

      // Success: close panel and refresh lead page so activity feed updates
      setSentMsg('Email sent successfully.');
      closePanel();
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to send email');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!leadId || !open) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/leads/${leadId}/document-last-sent`);

        if (!res.ok) return;

        const data = await res.json();

        if (!cancelled) {
          setLastSentByDocumentId(data?.lastSentByDocumentId ?? {});
        }
      } catch {
        // Last-sent UI is optional enhancement
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [leadId, open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetComposer();
          setOpen(true);
        }}
        disabled={!leadEmail}
        title={
          leadEmail
            ? 'Compose an email with document attachments'
            : 'This lead has no email address'
        }
        className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-white hover:bg-white/[0.10] disabled:opacity-50"
      >
        Email Documents
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-white/10 bg-[#0b0f19] shadow-2xl">
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
                <div>
                  <div className="text-lg font-semibold text-white">Compose Email</div>
                  <div className="mt-1 text-sm text-white/60">
                    Attach documents from the library and send via SMTP.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white hover:bg-white/[0.10]"
                >
                  Close
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-auto p-5">
                {error ? (
                  <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}

                {sentMsg ? (
                  <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                    {sentMsg}
                  </div>
                ) : null}

                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-white/80">To</div>
                    <input
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      placeholder="lead@example.com"
                      className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-white/20"
                    />
                    <div className="mt-1 text-xs text-white/50">
                      Prefilled from the lead. Editable if needed.
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-white/80">Subject</div>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Subject"
                      className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-white/20"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-medium text-white/80">Message</div>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Write your message…"
                      rows={10}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="text-sm font-semibold text-white/90">Attachments</div>
                      <div className="text-xs text-white/50">{selectedDocs.length} selected</div>
                    </div>

                    <div className="mt-3 max-h-[260px] overflow-auto rounded-xl border border-white/10">
                      {documents.length === 0 ? (
                        <div className="p-4 text-sm text-white/70">
                          No documents in the library yet. Ask an admin to upload documents first.
                        </div>
                      ) : (
                        documents.map((doc) => {
                          const checked = selectedIds.includes(doc.id);
                          return (
                            <label
                              key={doc.id}
                              className="flex cursor-pointer items-start gap-3 border-b border-white/10 bg-white/[0.01] px-4 py-3 last:border-b-0 hover:bg-white/[0.04]"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleDoc(doc.id)}
                                className="mt-1"
                              />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-white/90">
                                  {doc.filename}
                                </div>
                                <div className="mt-2">
                                  <a
                                    href={`/api/documents/${doc.id}/download`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-white/70 underline underline-offset-4 hover:text-white"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Download
                                  </a>
                                </div>
                                {/* Last sent info */}
                                {lastSentByDocumentId[doc.id] ? (
                                  <div className="mt-1 text-xs text-white/50">
                                    {(() => {
                                      const info = lastSentByDocumentId[doc.id];
                                      if (!info?.sent_at) return 'Last sent: —';

                                      try {
                                        const d = new Date(info.sent_at);
                                        const formatted = format(d, 'MMM d, yyyy h:mm a');
                                        return `Last sent: ${formatted}${
                                          info.to_email ? ` to ${info.to_email}` : ''
                                        }`;
                                      } catch {
                                        return `Last sent: ${info.sent_at}`;
                                      }
                                    })()}
                                  </div>
                                ) : null}
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>

                    {selectedDocs.length > 0 ? (
                      <div className="mt-3 text-xs text-white/60">
                        Selected:{' '}
                        <span className="text-white/80">
                          {selectedDocs.map((d) => d.filename).join(', ')}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-white/10 p-5">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void sendEmail()}
                    disabled={busy}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/[0.12] px-4 text-sm font-semibold text-white hover:bg-white/[0.18] disabled:opacity-50"
                  >
                    {busy ? 'Sending…' : 'Send'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={busy}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-white hover:bg-white/[0.10] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
                <div className="mt-2 text-xs text-white/50">
                  Sending logs an <code className="text-white/70">email_sent</code> activity
                  automatically.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
