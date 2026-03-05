'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/lib/ui/Card';
import { Button } from '@/lib/ui/Button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type Industry = 'construction' | 'subcontractor' | 'manufacturing' | 'wholesale';
type Status =
  | 'new_lead'
  | 'email_campaign'
  | 'warm_lead'
  | 'assessment_stage'
  | 'onboarding'
  | 'client';

export type CreateLeadFormClientProps = {
  userId: string;
};

export default function CreateLeadFormClient({ userId }: CreateLeadFormClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  type UiError = {
    message: string;
    requestId?: string;
    retryAfterSeconds?: number | null;
    code?: string;
  };
  const [error, setError] = useState<UiError | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [form, setForm] = useState({
    company_name: '',
    contact_person: '',
    title: '',
    phone: '',
    email: '',
    website: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    industry: 'construction' as Industry,
    status: 'new_lead' as Status,
    follow_up_date: '', // ISO string from input[type=datetime-local]
  });

  async function submit() {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      // basic client validation
      if (!form.company_name.trim()) throw new Error('Company name is required.');
      if (!form.contact_person.trim()) throw new Error('Contact person is required.');
      const payload = {
        ...form,
        assigned_user_id: userId,
        follow_up_date: form.follow_up_date ? new Date(form.follow_up_date).toISOString() : null,
      };
      const { parseApiResponse, getRetryAfterSeconds, formatApiError } =
        await import('@/lib/api/client');
      const res = await fetch('/api/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const retryAfterSeconds = getRetryAfterSeconds(res);
      const parsed = await parseApiResponse<{ id: string }>(res);
      if (!res.ok || !parsed.ok) {
        setError({
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
      // Redirect to the new lead's detail page
      if (parsed.data?.id) {
        router.push(`/dashboard/leads/${parsed.data.id}`);
      } else {
        setOk('Lead created, but no ID returned.');
      }
    } catch (e: any) {
      setError({ message: e?.message || 'Failed to create lead.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-4">
      <p className="mb-4 text-sm text-white/60">Editable fields are shown in highlighted boxes.</p>
      <div className="max-w-3xl space-y-6">
        <Field label="Company Name *">
          <Input
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            placeholder="Kendrick & Hayes"
          />
        </Field>
        <Field label="Contact Person *">
          <Input
            value={form.contact_person}
            onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
            placeholder="Jane Smith"
          />
        </Field>
        <Field label="Title">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Website">
          <Input
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </Field>
        <Field label="Address 1">
          <Input
            value={form.address1}
            onChange={(e) => setForm({ ...form, address1: e.target.value })}
          />
        </Field>
        <Field label="Address 2">
          <Input
            value={form.address2}
            onChange={(e) => setForm({ ...form, address2: e.target.value })}
          />
        </Field>
        <Field label="City">
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <Field label="State">
          <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        </Field>
        <Field label="Zip">
          <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
        </Field>
        <Field label="Industry">
          <Select
            value={form.industry}
            onChange={(v: string) => setForm({ ...form, industry: v as Industry })}
            options={[
              { value: 'construction', label: 'Construction' },
              { value: 'subcontractor', label: 'Subcontractor' },
              { value: 'manufacturing', label: 'Manufacturing' },
              { value: 'wholesale', label: 'Wholesale' },
            ]}
          />
        </Field>
        <Field label="Status">
          <Select
            value={form.status}
            onChange={(v: string) => setForm({ ...form, status: v as Status })}
            options={[
              { value: 'new_lead', label: 'New Lead' },
              { value: 'email_campaign', label: 'Email Campaign' },
              { value: 'warm_lead', label: 'Warm Lead' },
              { value: 'assessment_stage', label: 'Assessment Stage' },
              { value: 'onboarding', label: 'Onboarding' },
              { value: 'client', label: 'Client' },
            ]}
          />
        </Field>
        <Field label="Follow-up Date">
          <Input
            type="datetime-local"
            value={form.follow_up_date}
            onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
          />
        </Field>
      </div>

      {error ? (
        <div className="mb-2 rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-200">
          <div>{error.message}</div>
          {error.code === 'RATE_LIMITED' && error.retryAfterSeconds ? (
            <div className="mt-1 text-xs text-yellow-200">
              Retry after: {error.retryAfterSeconds} seconds
            </div>
          ) : null}
          {error.requestId ? (
            <div className="mt-2 text-xs text-white/70 flex items-center gap-2">
              Request ID: <span className="font-mono">{error.requestId}</span>
              <button
                type="button"
                className="px-2 py-1 rounded bg-white/10 text-xs text-white hover:bg-white/20"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(error.requestId!);
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
      {ok && <div className="mt-3 text-sm text-green-300">{ok}</div>}

      <div className="mt-4 flex gap-2">
        <Button onClick={submit} disabled={loading}>
          {loading ? 'Creating…' : 'Create Lead'}
        </Button>
      </div>
    </Card>
  );
}
