"use client";
import { useEffect, useState, useRef } from 'react';
import PaginationControls from './PaginationControls';
import { LeadTable } from './LeadTable';

const defaultPageSize = 25;
const defaultSort = 'followup';
const defaultDir = 'asc';

export default function LeadsFiltersClient({ initialState }: { initialState?: any }) {
  const [page, setPage] = useState(initialState?.page || 1);
  const [pageSize, setPageSize] = useState(initialState?.pageSize || defaultPageSize);
  const [sort, setSort] = useState(initialState?.sort || defaultSort);
  const [dir, setDir] = useState(initialState?.dir || defaultDir);
  const [status, setStatus] = useState(initialState?.status || 'all');
  const [industry, setIndustry] = useState(initialState?.industry || 'all');
  const [dueOnly, setDueOnly] = useState(initialState?.dueOnly || false);
  const [q, setQ] = useState(initialState?.q || '');
  const [leads, setLeads] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fetchLeads(params: any) {
    setLoading(true);
    setError(null);
    const url = new URL('/api/leads/list', window.location.origin);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'all') url.searchParams.set(k, String(v));
    });
    fetch(url.toString())
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setLeads(data.leads);
          setTotalPages(data.totalPages);
          setTotal(data.total);
        } else {
          setError(data.error || 'Failed to load leads');
        }
      })
      .catch(() => setError('Failed to load leads'))
      .finally(() => setLoading(false));
  }

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchLeads({ page, pageSize, sort, dir, status, industry, dueOnly, q });
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [page, pageSize, sort, dir, status, industry, dueOnly, q]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Search..."
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1); }}
        />
        <select
          className="border rounded px-2 py-1"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="warm_lead">Warm Lead</option>
          <option value="client">Client</option>
          <option value="lost">Lost</option>
        </select>
        <select
          className="border rounded px-2 py-1"
          value={industry}
          onChange={e => { setIndustry(e.target.value); setPage(1); }}
        >
          <option value="all">All Industries</option>
          <option value="tech">Tech</option>
          <option value="finance">Finance</option>
          <option value="health">Health</option>
          <option value="other">Other</option>
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={dueOnly}
            onChange={e => { setDueOnly(e.target.checked); setPage(1); }}
          />
          Follow-ups due only
        </label>
        <select
          className="border rounded px-2 py-1"
          value={sort}
          onChange={e => { setSort(e.target.value); setPage(1); }}
        >
          <option value="followup">Sort: Follow-Up Date</option>
          <option value="created">Sort: Created</option>
          <option value="company">Sort: Company Name</option>
        </select>
        <select
          className="border rounded px-2 py-1"
          value={dir}
          onChange={e => { setDir(e.target.value); setPage(1); }}
        >
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>
      </div>
      {loading && <div className="mb-2">Loading leads...</div>}
      {error && <div className="mb-2 text-red-500">{error}</div>}
      <LeadTable leads={leads} />
      <PaginationControls
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={p => setPage(p)}
        onPageSizeChange={size => { setPageSize(size); setPage(1); }}
      />
      <div className="mt-2 text-xs text-muted-foreground">Total: {total}</div>
    </div>
  );
}
