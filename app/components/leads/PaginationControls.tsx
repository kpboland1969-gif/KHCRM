"use client";
import React from 'react';

export default function PaginationControls({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  return (
    <div className="flex items-center gap-4 mt-4">
      <button
        className="px-2 py-1 rounded border"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        Prev
      </button>
      <span>Page {page} of {totalPages}</span>
      <button
        className="px-2 py-1 rounded border"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
      </button>
      <select
        className="ml-4 border rounded px-2 py-1"
        value={pageSize}
        onChange={e => onPageSizeChange(Number(e.target.value))}
      >
        {[25, 50, 100].map(size => (
          <option key={size} value={size}>{size} per page</option>
        ))}
      </select>
    </div>
  );
}
