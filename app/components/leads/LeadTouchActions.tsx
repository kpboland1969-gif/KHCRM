"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LeadTouchActions({ leadId }: { leadId: string }) {
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function markTouched() {
    setLoading(true);
    await fetch(`/api/leads/${leadId}/touch`, { method: 'POST' });
    setLoading(false);
    router.refresh();
  }

  async function updateFollowUp() {
    if (!followUpDate) return;
    setLoading(true);
    await fetch(`/api/leads/${leadId}/followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followUpDate }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2 items-end mb-4">
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
          onChange={e => setFollowUpDate(e.target.value)}
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
  );
}
