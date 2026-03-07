'use client';

import { useMemo, useState } from 'react';

type LeadDocument = {
  id: string;
  filename: string;
  storage_path: string;
  created_at?: string | null;
};

export default function LeadDocumentsClient({
  leadId,
  documents,
}: {
  leadId: string;
  documents: LeadDocument[];
}) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      const left = a.created_at ? new Date(a.created_at).getTime() : 0;
      const right = b.created_at ? new Date(b.created_at).getTime() : 0;
      return right - left;
    });
  }, [documents]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return;
    }

    setUploading(true);

    try {
      const response = await fetch(`/api/leads/${leadId}/upload-document`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        alert(body?.error || 'Upload failed');
        setUploading(false);
        return;
      }

      window.location.reload();
    } catch {
      alert('Upload failed');
      setUploading(false);
    }
  }

  async function handleDelete(documentId: string) {
    const confirmed = window.confirm('Delete this lead document?');
    if (!confirmed) {
      return;
    }

    setDeletingId(documentId);

    try {
      const response = await fetch(`/api/leads/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        alert(body?.error || 'Delete failed');
        setDeletingId(null);
        return;
      }

      window.location.reload();
    } catch {
      alert('Delete failed');
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleUpload} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="file"
          name="file"
          accept="application/pdf"
          required
          className="block text-sm text-white/80 file:mr-4 file:rounded-lg file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-white/[0.12]"
        />

        <button
          type="submit"
          disabled={uploading}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-white hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Add Document'}
        </button>
      </form>

      <div className="space-y-2">
        {sortedDocuments.length === 0 ? (
          <div className="text-sm text-white/60">No lead-specific documents yet.</div>
        ) : null}

        {sortedDocuments.map((doc) => (
          <div
            key={doc.id}
            className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="text-sm font-medium text-white/90">{doc.filename}</div>
              <div className="text-xs text-white/50">
                {doc.created_at ? new Date(doc.created_at).toLocaleString() : 'Uploaded recently'}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`/api/leads/documents/${doc.id}/download`}
                className="text-sm text-blue-300 hover:text-blue-200 hover:underline"
              >
                Download
              </a>

              <button
                type="button"
                onClick={() => handleDelete(doc.id)}
                disabled={deletingId === doc.id}
                className="text-sm text-red-300 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId === doc.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
