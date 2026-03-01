"use client";
import { useRef, useState } from 'react';

export default function DocumentUploader({ onUpload }: { onUpload: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!fileInput.current?.files?.[0]) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', fileInput.current.files[0]);
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      onUpload();
    } else {
      setError('Upload failed');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleUpload} className="flex gap-2 items-center mb-4">
      <input type="file" ref={fileInput} accept=".pdf,.doc,.docx" />
      <button type="submit" disabled={loading} className="btn">
        {loading ? 'Uploading...' : 'Upload'}
      </button>
      {error && <span className="text-red-500 ml-2">{error}</span>}
    </form>
  );
}
