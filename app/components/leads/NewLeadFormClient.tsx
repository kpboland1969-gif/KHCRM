'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const INDUSTRIES = ['construction', 'subcontractor', 'manufacturing', 'wholesale'] as const;
const STATUSES = [
  'New Lead',
  'email campaign',
  'warm lead',
  'assessment stage',
  'onboarding',
  'client',
] as const;

type Industry = (typeof INDUSTRIES)[number];
type Status = (typeof STATUSES)[number];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-[var(--muted)] mb-1">{label}</div>
      {children}
    </label>
  );
}

export default function NewLeadFormClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  type UiError = {
    message: string;
    requestId?: string;
    retryAfterSeconds?: number | null;
    code?: string;
  };
  const [err, setErr] = useState<UiError | null>(null);

  const [form, setForm] = useState({
    company_name: '',
    contact_person: '',
    title: '',
    phone: '',
    email: '',
    website: '',
    street_address: '',
    address2: '',
    city: '',
    state: '',
    zip_code: '',
    industry: 'construction' as Industry,
    status: 'New Lead' as Status,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      const { parseApiResponse, getRetryAfterSeconds, formatApiError } =
        await import('@/lib/api/client');
      const res = await fetch('/api/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const retryAfterSeconds = getRetryAfterSeconds(res);
      const parsed = await parseApiResponse<{ leadId: string }>(res);
      if (!res.ok || !parsed.ok) {
        setErr({
          message: formatApiError({
            error: parsed.error,
            code: parsed.code,
            requestId: parsed.requestId,
            retryAfterSeconds,
          }),
          requestId: parsed.requestId,
          retryAfterSeconds,
          code: parsed.code,
        });
        setLoading(false);
        return;
      }
      // go to lead detail page
      router.push(`/dashboard/leads/${parsed.data?.leadId}`);
      router.refresh();
    } catch (e: any) {
      setErr({ message: e?.message || 'Failed to create lead' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {err ? (
        <div className="mb-2 rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-200">
          <div>{err.message}</div>
          {err.code === 'RATE_LIMITED' && err.retryAfterSeconds ? (
            <div className="mt-1 text-xs text-yellow-200">
              Retry after: {err.retryAfterSeconds} seconds
            </div>
          ) : null}
          {err.requestId ? (
            <div className="mt-2 text-xs text-white/70 flex items-center gap-2">
              Request ID: <span className="font-mono">{err.requestId}</span>
              <button
                type="button"
                className="px-2 py-1 rounded bg-white/10 text-xs text-white hover:bg-white/20"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(err.requestId!);
                  } catch {
                    // Intentionally ignore clipboard failures
                    return;
                  }
                }}
              >
                Copy
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Company Name *">
          <input
            className="border rounded px-2 py-1 w-full"
            value={form.company_name}
            onChange={(e) => set('company_name', e.target.value)}
          />
        </Field>

        <Field label="Contact Person *">
          <input
            className="border rounded px-2 py-1 w-full"
            value={form.contact_person}
            onChange={(e) => set('contact_person', e.target.value)}
          />
        </Field>

        <Field label="Title">
          <input
            className="border rounded px-2 py-1 w-full"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>

        <Field label="Phone">
          <input
            className="border rounded px-2 py-1 w-full"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </Field>

        <Field label="Email">
          <input
            className="border rounded px-2 py-1 w-full"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>

        <Field label="Website">
          <input
            className="border rounded px-2 py-1 w-full"
            value={form.website}
            onChange={(e) => set('website', e.target.value)}
          />
        </Field>

        <Field label="Street Address">
          <input
            className="border rounded px-2 py-1 w-full"
            value={form.street_address}
            onChange={(e) => set('street_address', e.target.value)}
          />
        </Field>

        <Field label="Address 2">
          <input
            className="border rounded px-2 py-1 w-full"
            value={form.address2}
            onChange={(e) => set('address2', e.target.value)}
          />
        </Field>

        <Field label="City">
          <input
            className="border rounded px-2 py-1 w-full"
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
          />
        </Field>

        <Field label="State">
          <input
            className="border rounded px-2 py-1 w-full"
            value={form.state}
            onChange={(e) => set('state', e.target.value)}
          />
        </Field>

        <Field label="Zip">
          <input
            className="border rounded px-2 py-1 w-full"
            value={form.zip_code}
            onChange={(e) => set('zip_code', e.target.value)}
          />
        </Field>

        <Field label="Industry">
          <select
            className="border rounded px-2 py-1 w-full"
            value={form.industry}
            onChange={(e) => set('industry', e.target.value as Industry)}
          >
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select
            className="border rounded px-2 py-1 w-full"
            value={form.status}
            onChange={(e) => set('status', e.target.value as Status)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex gap-2">
        <button
          className="px-3 py-2 rounded border border-[var(--border-strong)] bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 disabled:opacity-60"
          onClick={submit}
          disabled={loading || !form.company_name.trim() || !form.contact_person.trim()}
        >
          {loading ? 'Creating...' : 'Create Lead'}
        </button>

        <button
          className="px-3 py-2 rounded border border-[var(--border-strong)] hover:bg-white/5"
          onClick={() => router.push('/dashboard/leads')}
          disabled={loading}
        >
          Cancel
        </button>
      </div>

      <div className="text-xs text-[var(--muted)]">
        * Required fields: Company Name, Contact Person
      </div>
    </div>
  );
}
