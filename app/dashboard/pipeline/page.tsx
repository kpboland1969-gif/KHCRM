import 'server-only';

import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type LeadRow = {
  id: string;
  status: string | null;
  company_name?: string | null;
  companyName?: string | null;
  contact_person?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
};

function pick<T extends Record<string, any>>(obj: T, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== null && v !== undefined && String(v).length > 0) return v as string;
  }
  return '';
}

function formatWhen(value: any) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

/**
 * Pipeline stages:
 * Phase-safe implementation: this is a VIEW over leads.status.
 * Later we can move these to a Settings table (Phase 9) if needed.
 */
const PIPELINE_STAGES: Array<{ key: string; label: string }> = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

function normalizeStatus(value: string | null | undefined) {
  const s = (value ?? '').trim().toLowerCase();
  if (!s) return 'new';

  // Allow legacy/freeform statuses to map into our canonical stages
  if (['new', 'lead', 'uncontacted'].includes(s)) return 'new';
  if (['contacted', 'attempted', 'reached'].includes(s)) return 'contacted';
  if (['qualified', 'good', 'ready'].includes(s)) return 'qualified';
  if (['proposal', 'quoted', 'quote', 'estimating'].includes(s)) return 'proposal';
  if (['won', 'closed_won', 'closed-won', 'customer'].includes(s)) return 'won';
  if (['lost', 'closed_lost', 'closed-lost', 'dead'].includes(s)) return 'lost';

  // Unknown statuses go to "new" for now so they don't disappear
  return 'new';
}

export default async function PipelinePage() {
  const supabase = await createSupabaseServerClient();

  // Auth gate (server-side). RLS will enforce data access regardless.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('[Pipeline] auth.getUser error:', userError);
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Auth Error</h1>
        <p className="mt-2 text-sm text-white/70">Could not verify your session.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Not Logged In</h1>
        <p className="mt-2 text-sm text-white/70">No server session found.</p>
      </div>
    );
  }

  // Keep select list conservative to avoid schema drift
  const { data, error } = await supabase
    .from('leads')
    .select('id,status,company_name,contact_person,email,phone,updated_at,created_at')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[Pipeline] leads query error:', error);
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Could Not Load Pipeline</h1>
        <p className="mt-2 text-sm text-white/70">{error.message}</p>
      </div>
    );
  }

  const leads: LeadRow[] = Array.isArray(data) ? (data as any) : [];

  const grouped = new Map<string, LeadRow[]>();
  for (const stage of PIPELINE_STAGES) grouped.set(stage.key, []);

  for (const lead of leads) {
    const key = normalizeStatus(lead.status);
    const bucket = grouped.get(key) ?? [];
    bucket.push(lead);
    grouped.set(key, bucket);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline</h1>
          <p className="mt-1 text-sm text-white/60">
            Board view over <span className="text-white/80">leads.status</span>
          </p>
        </div>

        <Link
          href="/dashboard/leads/new"
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.06]"
        >
          New Lead
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
        {PIPELINE_STAGES.map((stage) => {
          const items = grouped.get(stage.key) ?? [];
          return (
            <div key={stage.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-sm font-semibold text-white/90">{stage.label}</div>
                <div className="text-xs text-white/50">{items.length}</div>
              </div>

              <div className="mt-3 space-y-3">
                {items.length === 0 ? <div className="text-sm text-white/50">No leads</div> : null}

                {items.map((lead) => {
                  const company = pick(lead, ['company_name', 'companyName']);
                  const contact = pick(lead, ['contact_person', 'contactPerson']);
                  const updated = pick(lead, [
                    'updated_at',
                    'updatedAt',
                    'created_at',
                    'createdAt',
                  ]);

                  return (
                    <Link
                      key={lead.id}
                      href={`/dashboard/leads/${lead.id}`}
                      className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:bg-white/[0.06]"
                    >
                      <div className="text-sm font-medium text-white/90">
                        {company || 'Untitled Lead'}
                      </div>

                      {contact ? <div className="mt-1 text-xs text-white/70">{contact}</div> : null}

                      <div className="mt-2 text-[11px] text-white/50">
                        Updated: {formatWhen(updated) || '—'}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-white/40">Server session userId: {user.id}</div>
    </div>
  );
}
