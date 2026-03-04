'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function FollowUpsFiltersClient({
  isAdmin,
  scope,
  range,
  search,
  assignee,
}: {
  isAdmin: boolean;
  scope: string;
  range: string;
  search: string;
  assignee?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(search ?? '');
  const [selectedScope, setSelectedScope] = useState(scope);
  const [selectedRange, setSelectedRange] = useState(range);
  const [selectedAssignee, setSelectedAssignee] = useState(assignee ?? '');

  function updateParams(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    router.push(`/dashboard/follow-ups?${sp.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2 items-center">
      {isAdmin ? (
        <select
          value={selectedScope}
          onChange={(e) => {
            setSelectedScope(e.target.value);
            updateParams({ scope: e.target.value });
          }}
          className="rounded border border-white/20 bg-white/[0.04] px-2 py-1 text-xs text-white focus:outline-none"
        >
          <option value="mine">Mine</option>
          <option value="all">All</option>
        </select>
      ) : null}
      <select
        value={selectedRange}
        onChange={(e) => {
          setSelectedRange(e.target.value);
          updateParams({ range: e.target.value });
        }}
        className="rounded border border-white/20 bg-white/[0.04] px-2 py-1 text-xs text-white focus:outline-none"
      >
        <option value="all">All</option>
        <option value="overdue">Overdue</option>
        <option value="today">Today</option>
        <option value="next7">Next 7</option>
        <option value="next30">Next 30</option>
      </select>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => updateParams({ q })}
        placeholder="Search company/contact/email…"
        className="rounded border border-white/20 bg-white/[0.04] px-2 py-1 text-xs text-white focus:outline-none"
        style={{ minWidth: 180 }}
      />
    </div>
  );
}
