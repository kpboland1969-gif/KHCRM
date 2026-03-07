'use client';

import { useState } from 'react';

type LeadDocument = {
  id: string;
  filename: string;
  storage_path: string;
  created_at?: string;
};

export default function LeadDocumentsClient({
  leadId,
  documents,
}: {
  leadId: string;
  documents: LeadDocument[];
}) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const file = formData.get('file');

    if (!file) return;

    setUploading(true);

    try {
      const res = await fetch(`/api/leads/${leadId}/upload-document`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Upload failed');
        setUploading(false);
        return;
      }

      window.location.reload();
    } catch (err) {
      alert('Upload failed');
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleUpload} className="flex items-center gap-3">
        <input type="file" name="file" accept="application/pdf" required className="text-sm" />

        <button
          disabled={uploading}
          className="rounded-lg border border-white/10 px-3 py-1 text-sm hover:bg-white/10"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      <div className="space-y-2">
        {documents.length === 0 && <div className="text-sm text-white/60">No documents yet.</div>}

        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2"
          >
            <div className="text-sm">{doc.filename}</div>

            <a
              href={`/api/documents/download?path=${encodeURIComponent(
                doc.storage_path,
              )}&bucket=lead_uploads`}
              target="_blank"
              className="text-xs text-blue-400 hover:underline"
            >
              Download
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
