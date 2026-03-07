'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import PaginationControls from './PaginationControls';
import { formFieldClass, formSelectClass } from '@/components/ui/formStyles';
import { Select } from '@/components/ui/select';
import { LeadTable } from './LeadTable';

const defaultPageSize = 25;
const defaultSort = 'followup';
const defaultDir = 'asc';

type LeadsFiltersClientProps = {
  initialState?: {
    page?: number;
    pageSize?: number;
    sort?: string;
    dir?: string;
    status?: string;
    industry?: string;
    dueOnly?: boolean;
    q?: string;
    scope?: string;
    assignedFilter?: string;
  };
  initialLeads?: any[];
  currentUserId: string;
  currentRole: string;
};

export default function LeadsFiltersClient({
  initialState,
  initialLeads = [],
  currentUserId,
  currentRole,
}: LeadsFiltersClientProps) {
  const [page, setPage] = useState(initialState?.page || 1);
  const [pageSize, setPageSize] = useState(initialState?.pageSize || defaultPageSize);
  const [sort, setSort] = useState(initialState?.sort || defaultSort);
  const [dir, setDir] = useState(initialState?.dir || defaultDir);
  const [status, setStatus] = useState(initialState?.status || 'all');
  const [industry, setIndustry] = useState(initialState?.industry || 'all');
  const [dueOnly, setDueOnly] = useState(initialState?.dueOnly || false);
  const [q, setQ] = useState(initialState?.q || '');
  const [scope, setScope] = useState(
    initialState?.scope || (currentRole === 'user' ? 'mine' : 'all'),
  );
  const [assignedFilter, setAssignedFilter] = useState(initialState?.assignedFilter || 'all');
  const [leads, setLeads] = useState<any[]>(initialLeads);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(initialLeads.length);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didSkipInitialFetchRef = useRef(false);

  const isManagerOrAdmin = currentRole === 'manager' || currentRole === 'admin';

  function fetchLeads(params: Record<string, string | number | boolean>) {
    setLoading(true);
    setError(null);

    const url = new URL('/api/leads/list', window.location.origin);

    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'all') {
        url.searchParams.set(k, String(v));
      }
    });

    fetch(url.toString())
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          const nextLeads = Array.isArray(data.leads) ? data.leads : [];
          setLeads(nextLeads);
          setTotalPages(data.totalPages || 1);
          setTotal(data.total || nextLeads.length);
        } else {
          setError(data.error || 'Failed to load leads');
        }
      })
      .catch(() => setError('Failed to load leads'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!didSkipInitialFetchRef.current && initialLeads.length > 0) {
      didSkipInitialFetchRef.current = true;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchLeads({ page, pageSize, sort, dir, status, industry, dueOnly, q, scope });
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [page, pageSize, sort, dir, status, industry, dueOnly, q, scope, initialLeads.length]);

  const visibleLeads = useMemo(() => {
    return leads.filter((lead) => {
      const assignedUserId =
        typeof lead?.assigned_user_id === 'string' ? lead.assigned_user_id : null;

      if (scope === 'mine' && assignedUserId !== currentUserId) return false;
      if (scope === 'unassigned' && assignedUserId) return false;

      if (assignedFilter === 'assigned' && !assignedUserId) return false;
      if (assignedFilter === 'unassigned' && assignedUserId) return false;
      if (assignedFilter === 'mine' && assignedUserId !== currentUserId) return false;

      return true;
    });
  }, [assignedFilter, currentUserId, leads, scope]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <input
          className={formFieldClass}
          placeholder="Search..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />

        <Select
          value={status}
          onChange={(v: string) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'new', label: 'New' },
            { value: 'warm_lead', label: 'Warm Lead' },
            { value: 'client', label: 'Client' },
            { value: 'lost', label: 'Lost' },
          ]}
          className={formSelectClass}
        />

        <Select
          value={industry}
          onChange={(v: string) => {
            setIndustry(v);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'All Industries' },
            { value: 'tech', label: 'Tech' },
            { value: 'finance', label: 'Finance' },
            { value: 'health', label: 'Health' },
            { value: 'other', label: 'Other' },
          ]}
          className={formSelectClass}
        />

        <Select
          value={assignedFilter}
          onChange={(v: string) => {
            setAssignedFilter(v);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'All Assignment States' },
            { value: 'assigned', label: 'Assigned Only' },
            { value: 'unassigned', label: 'Unassigned Only' },
            { value: 'mine', label: 'Assigned To Me' },
          ]}
          className={formSelectClass}
        />

        {isManagerOrAdmin ? (
          <Select
            value={scope}
            onChange={(v: string) => {
              setScope(v);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'Visibility: All Visible Leads' },
              { value: 'mine', label: 'Visibility: My Leads' },
              { value: 'unassigned', label: 'Visibility: Unassigned Leads' },
            ]}
            className={formSelectClass}
          />
        ) : null}

        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={dueOnly}
            onChange={(e) => {
              setDueOnly(e.target.checked);
              setPage(1);
            }}
          />
          Follow-ups due only
        </label>

        <Select
          value={sort}
          onChange={(v: string) => {
            setSort(v);
            setPage(1);
          }}
          options={[
            { value: 'followup', label: 'Sort: Follow-Up Date' },
            { value: 'created', label: 'Sort: Created' },
            { value: 'company', label: 'Sort: Company Name' },
          ]}
          className={formSelectClass}
        />

        <select
          className="rounded border px-2 py-1"
          value={dir}
          onChange={(e) => {
            setDir(e.target.value);
            setPage(1);
          }}
        >
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>
      </div>

      {loading && <div className="mb-2">Loading leads...</div>}
      {error && <div className="mb-2 text-red-500">{error}</div>}

      <LeadTable leads={visibleLeads} />

      <PaginationControls
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <div className="mt-2 text-xs text-muted-foreground">
        Showing: {visibleLeads.length} of {total}
      </div>
    </div>
  );
}
