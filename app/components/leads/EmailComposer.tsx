"use client";
import { useState } from 'react';

export default function EmailComposer({ leadId, userId: _userId, leadEmail, selectedDocumentId, onSent }: { leadId: string; userId: string; leadEmail: string; selectedDocumentId?: string; onSent: () => void }) {
  const [to, setTo] = useState(leadEmail);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSuccess(false);
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId,
        to,
        subject,
        message,
        documentId: selectedDocumentId,
      }),
    });
    if (res.ok) {
      setSuccess(true);
      setSubject('');
      setMessage('');
      onSent();
    } else {
      setError('Failed to send email');
    }
    setSending(false);
  }

  return (
    <form onSubmit={handleSend} className="space-y-2 mb-4">
      <div>
        <label className="block font-semibold">To</label>
        <input className="w-full" value={to} onChange={e => setTo(e.target.value)} required />
      </div>
      <div>
        <label className="block font-semibold">Subject</label>
        <input className="w-full" value={subject} onChange={e => setSubject(e.target.value)} required />
      </div>
      <div>
        <label className="block font-semibold">Message</label>
        <textarea className="w-full" value={message} onChange={e => setMessage(e.target.value)} required rows={4} />
      </div>
      <button type="submit" className="btn" disabled={sending}>{sending ? 'Sending...' : 'Send Email'}</button>
      {error && <div className="text-red-500">{error}</div>}
      {success && <div className="text-green-600">Email sent!</div>}
    </form>
  );
}
