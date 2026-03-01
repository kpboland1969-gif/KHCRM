"use client";

import { useState } from 'react';
import { Card } from '@/lib/ui/Card';
import { Button } from '@/lib/ui/Button';
import { Field } from '@/lib/ui/Field';

type Industry = 'construction' | 'subcontractor' | 'manufacturing' | 'wholesale';
type Status = 'new_lead' | 'email_campaign' | 'warm_lead' | 'assessment_stage' | 'onboarding' | 'client';

export default function CreateLeadFormClient({ userId }: { userId: string }) {
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

      setOk('Lead created.');
      setForm((prev) => ({
        ...prev,
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
        industry: 'construction',
        status: 'new_lead',
        follow_up_date: ''
      }));
    } catch (e: any) {
      setError(e?.message || 'Failed to create lead.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Company Name *">
          <input
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            placeholder="Kendrick & Hayes"
          />
        </Field>

        <Field label="Contact Person *">
          <input
            value={form.contact_person}
            onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
            placeholder="Jane Smith"
          />
        </Field>

        <Field label="Title">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>

        <Field label="Phone">
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>

        <Field label="Email">
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>

        <Field label="Website">
          <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        </Field>

        <Field label="Address 1">
          <input value={form.address1} onChange={(e) => setForm({ ...form, address1: e.target.value })} />
        </Field>

        <Field label="Address 2">
          <input value={form.address2} onChange={(e) => setForm({ ...form, address2: e.target.value })} />
        </Field>

        <Field label="City">
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>

        <Field label="State">
          <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        </Field>

        <Field label="Zip">
          <input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
        </Field>

        <Field label="Industry">
          <select
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value as Industry })}
          >
            <option value="construction">Construction</option>
            <option value="subcontractor">Subcontractor</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="wholesale">Wholesale</option>
          </select>
        </Field>

        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
          >
            <option value="new_lead">New Lead</option>
            <option value="email_campaign">Email Campaign</option>
            <option value="warm_lead">Warm Lead</option>
            <option value="assessment_stage">Assessment Stage</option>
            <option value="onboarding">Onboarding</option>
            <option value="client">Client</option>
          </select>
        </Field>

        <Field label="Follow-up Date">
          <input
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
