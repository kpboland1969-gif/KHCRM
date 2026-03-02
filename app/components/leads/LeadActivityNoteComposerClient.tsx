"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/lib/ui/Button"; // Adjust import if needed

type Props = { leadId: string };

export default function LeadActivityNoteComposerClient({ leadId }: Props) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!message.trim()) {
      setError("Message required");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage("");
        router.refresh();
      } else {
        setError(data.error || "Failed to add note");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-2">
      <Textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Add a note…"
        disabled={pending}
        maxLength={2000}
        className="resize-vertical"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending || !message.trim()}>
          {pending ? "Adding…" : "Add Note"}
        </Button>
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>
    </form>
  );
}
