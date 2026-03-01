import React from 'react';

export default function DocumentsTable({ documents, isAdmin, onDelete }: { documents: any[]; isAdmin: boolean; onDelete?: (id: string) => void }) {
  return (
    <table className="min-w-full text-sm border">
      <thead>
        <tr>
          <th>Filename</th>
          <th>Type</th>
          <th>Size</th>
          <th>Uploaded</th>
          {isAdmin && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {documents.map(doc => (
          <tr key={doc.id}>
            <td>{doc.filename}</td>
            <td>{doc.content_type}</td>
            <td>{doc.size_bytes ? (doc.size_bytes / 1024).toFixed(1) + ' KB' : ''}</td>
            <td>{doc.created_at ? new Date(doc.created_at).toLocaleString() : ''}</td>
            {isAdmin && onDelete && (
              <td>
                <button onClick={() => onDelete(doc.id)} className="text-red-500">Delete</button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
