"use client";
import { useEffect, useState } from 'react';

export default function DocumentPicker({ leadId: _leadId, userId: _userId, onSelect }: { leadId: string; userId: string; onSelect: (doc: any) => void }) {
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/documents/list')
      .then(res => res.json())
      .then(data => setDocuments(data.documents || []));
  }, []);

  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Attach Document</label>
      <select onChange={e => {
        const doc = documents.find(d => d.id === e.target.value);
        if (doc) onSelect(doc);
      }} className="w-full">
        <option value="">Select a document...</option>
        {documents.map(doc => (
          <option key={doc.id} value={doc.id}>{doc.filename}</option>
        ))}
      </select>
    </div>
  );
}
