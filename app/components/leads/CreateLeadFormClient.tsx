"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/lib/ui/Card';
import { Button } from '@/lib/ui/Button';

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Industry = 'construction' | 'subcontractor' | 'manufacturing' | 'wholesale';
type Status = 'new_lead' | 'email_campaign' | 'warm_lead' | 'assessment_stage' | 'onboarding' | 'client';

export default function CreateLeadFormClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    follow_up_date: '' // ISO string from input[type=datetime-local]
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
        follow_up_date: form.follow_up_date ? new Date(form.follow_up_date).toISOString() : null
      };

      const res = await fetch('/api/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || 'Failed to create lead.');

      // Redirect to the new lead's detail page
      if (data?.id) {
        router.push(`/dashboard/leads/${data.id}`);
      } else {
        setOk('Lead created, but no ID returned.');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to create lead.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-4">
      <p className="mb-4 text-sm text-white/60">Editable fields are shown in highlighted boxes.</p>
      <div className="max-w-3xl space-y-6">
        <Field label={<span className="text-sm font-semibold text-white/90 tracking-wide mb-1">Company Name *</span>}>
          <Input
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            placeholder="Kendrick & Hayes"
          />
        </Field>
        <Field label={<span className="text-sm font-semibold text-white/90 tracking-wide mb-1">Contact Person *</span>}>
          <Input
            value={form.contact_person}
            onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
            placeholder="Jane Smith"
          />
        </Field>
        <Field label={<span className="text-sm font-semibold text-white/90 tracking-wide mb-1">Title</span>}>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label={<span className="text-sm font-semibold text-white/90 tracking-wide mb-1">Phone</span>}>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label={<span className="text-sm font-semibold text-white/90 tracking-wide mb-1">Email</span>}>
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label={<span className="text-sm font-semibold text-white/90 tracking-wide mb-1">Website</span>}>
          <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        </Field>
        <Field label={<span className="text-sm font-semibold text-white/90 tracking-wide mb-1">Address 1</span>}>
          <Input value={form.address1} onChange={(e) => setForm({ ...form, address1: e.target.value })} />
        </Field>
        <Field label={<span className="text-sm font-semibold text-white/90 tracking-wide mb-1">Address 2</span>}>
          <Input value={form.address2} onChange={(e) => setForm({ ...form, address2: e.target.value })} />
        </Field>
        <Field label={<span className="text-sm font-semibold text-white/90 tracking-wide mb-1">City</span>}>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <Field label={<span className="text-sm font-semibold text-white/90 tracking-wide mb-1">State</span>}>
          <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        </Field>
        <Field label={<span className="text-sm font-semibold text-white/90 tracking-wide mb-1">Zip</span>}>
          <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
        </Field>
        <Field label={<span className="text-sm font-semibold text-white/90 tracking-wide mb-1">Industry</span>}>
          <Select
            value={form.industry}
            onChange={(v: string) => setForm({ ...form, industry: v as Industry })}
            options={[
              { value: "construction", label: "Construction" },
              { value: "subcontractor", label: "Subcontractor" },
              { value: "manufacturing", label: "Manufacturing" },
              { value: "wholesale", label: "Wholesale" },
            ]}
          />
        </Field>
        <Field label={<span className="text-sm font-semibold text-white/90 tracking-wide mb-1">Status</span>}>
          <Select
            value={form.status}
            onChange={(v: string) => setForm({ ...form, status: v as Status })}
            options={[
              { value: "new_lead", label: "New Lead" },
              { value: "email_campaign", label: "Email Campaign" },
              { value: "warm_lead", label: "Warm Lead" },
              { value: "assessment_stage", label: "Assessment Stage" },
              { value: "onboarding", label: "Onboarding" },
              { value: "client", label: "Client" },
            ]}
          />
        </Field>
        <Field label={<span className="text-sm font-semibold text-white/90 tracking-wide mb-1">Follow-up Date</span>}>
          <Input
            type="datetime-local"
            value={form.follow_up_date}
            onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
          />
        </Field>
      </div>

      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
      {ok && <div className="mt-3 text-sm text-green-300">{ok}</div>}

      <div className="mt-4 flex gap-2">
        <Button onClick={submit} disabled={loading}>
          {loading ? 'Creating…' : 'Create Lead'}
        </Button>
      </div>
    </Card>
  );
}
