"use client";
import { useEffect, useState } from 'react';
import DocumentUploader from './DocumentUploader';
import DocumentsTable from './DocumentsTable';

export default function DocumentsClient({ role, userId: _userId }: { role: string; userId: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchDocuments() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/documents/list');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch {
      setError('Failed to load documents');
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div>
      {role === 'admin' && <DocumentUploader onUpload={fetchDocuments} />}
      {loading ? (
        <div>Loading documents...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <DocumentsTable documents={documents} isAdmin={role === 'admin'} />
      )}
    </div>
  );
}
