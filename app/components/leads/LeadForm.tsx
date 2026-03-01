"use client";
import { useState } from 'react';
import { Card } from '@/lib/ui/Card';
import { Button } from '@/lib/ui/Button';

const industries = [
  'construction',
  'subcontractor',
  'manufacturing',
  'wholesale',
];
const statuses = [
  'new_lead',
  'email_campaign',
  'warm_lead',
  'assessment_stage',
  'onboarding',
  'client',
];

export function LeadForm({ onSubmit, loading = false }: { onSubmit: (data: any) => void; loading?: boolean }) {
  const [form, setForm] = useState({
    company_name: '',
    contact_person: '',
    contact_title: '',
    phone: '',
    email: '',
    website: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip: '',
    industry: industries[0],
    status: statuses[0],
    follow_up_date: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto">
      <Card>
        <div className="grid grid-cols-2 gap-4">
          <input name="company_name" required placeholder="Company Name" value={form.company_name} onChange={handleChange} />
          <input name="contact_person" required placeholder="Contact Person" value={form.contact_person} onChange={handleChange} />
          <input name="contact_title" placeholder="Contact Title" value={form.contact_title} onChange={handleChange} />
          <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} />
          <input name="email" placeholder="Email" value={form.email} onChange={handleChange} />
          <input name="website" placeholder="Website" value={form.website} onChange={handleChange} />
          <input name="address_line1" placeholder="Address Line 1" value={form.address_line1} onChange={handleChange} />
          <input name="address_line2" placeholder="Address Line 2" value={form.address_line2} onChange={handleChange} />
          <input name="city" placeholder="City" value={form.city} onChange={handleChange} />
          <input name="state" placeholder="State" value={form.state} onChange={handleChange} />
          <input name="zip" placeholder="Zip" value={form.zip} onChange={handleChange} />
          <select name="industry" value={form.industry} onChange={handleChange}>{industries.map(i => <option key={i} value={i}>{i}</option>)}</select>
          <select name="status" value={form.status} onChange={handleChange}>{statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
          <input name="follow_up_date" type="date" value={form.follow_up_date} onChange={handleChange} />
        </div>
      </Card>
      <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Create Lead'}</Button>
    </form>
  );
}
