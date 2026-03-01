import { Card } from '@/lib/ui/Card';
import { Button } from '@/lib/ui/Button';
import { getLeadNotes, addManualNote } from '@/lib/notes';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import React from 'react';

export default async function NotesPanel({ leadId, userId, username }: { leadId: string; userId: string; username: string }) {
  const { data: notes } = await getLeadNotes(leadId);

  async function addNoteAction(formData: FormData) {
    'use server';
    const content = formData.get('content');
    if (!content || typeof content !== 'string' || !content.trim()) return;
    await addManualNote(leadId, userId, `${username}: ${content}`);
    revalidatePath(`/dashboard/leads/${leadId}`);
  }

  return (
    <Card className="flex flex-col h-full max-h-[500px]">
      <div className="flex-1 overflow-y-auto space-y-2 p-2">
        {(notes || []).map((note) => (
          <div key={note.id} className="rounded bg-[var(--card)] p-2 text-xs">
            <div className="font-semibold mb-1">{note.type}</div>
            <div>{note.content}</div>
            <div className="text-[var(--muted)] text-right">{new Date(note.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <form action={addNoteAction} className="flex gap-2 p-2 border-t border-[var(--border)]">
        <input
          className="flex-1"
          name="content"
          placeholder="Add a note..."
          autoComplete="off"
        />
        <Button type="submit">
          Add
        </Button>
      </form>
    </Card>
  );
}
