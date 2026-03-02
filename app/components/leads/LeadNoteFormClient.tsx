"use client";

import { useState } from "react";

export default function LeadNoteFormClient({ leadId }: { leadId: string }) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = message.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok: true; id: string }
        | { ok: false; error: string }
        | null;

      if (!res.ok || !json || (json as any).ok === false) {
        setError((json as any)?.error ?? "Failed to add note");
        return;
      }

      setMessage("");

      window.dispatchEvent(
        new CustomEvent("khcrm:activity:refresh", { detail: { leadId } })
      );
    } catch {
      setError("Failed to add note");
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
      {error ? <div className="text-sm text-red-300">{error}</div> : null}
      <button
        type="button"
        onClick={submit}
        disabled={saving || !message.trim()}
        className="rounded-xl border border-white/20 bg-white/[0.08] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving…" : "Add Note"}
      </button>
    </div>
  );
}
