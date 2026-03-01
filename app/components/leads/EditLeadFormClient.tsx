"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LeadRow } from "@/lib/types/leads";

export type Props = {
  lead: LeadRow;
};



import Link from "next/link";


import { Field, ReadOnlyField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type EditLeadFormState = {
  company_name: string;
  contact_person: string;
  title: string;
  phone: string;
  email: string;
  website: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  industry: string;
  status: string;
  follow_up_date: string; // YYYY-MM-DD
};

export default function EditLeadFormClient({ lead }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<EditLeadFormState>({
    company_name: lead.company_name ?? "",
    contact_person: lead.contact_person ?? "",
    title: lead.title ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    website: lead.website ?? "",
    address1: lead.address1 ?? "",
    address2: lead.address2 ?? "",
    city: lead.city ?? "",
    state: lead.state ?? "",
    zip: lead.zip ?? "",
    industry: lead.industry ?? "",
    status: lead.status ?? "",
    follow_up_date: lead.follow_up_date ? lead.follow_up_date.slice(0, 10) : "",
  });
  const [saving, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.ok) {
        router.push(`/dashboard/leads/${lead.id}`);
      } else {
        setError(result.error || "Failed to update lead");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="max-w-3xl space-y-6">
        <Field label={<span className="text-base font-semibold text-white/90 tracking-wide mb-1">Company Name</span>}>
          <Input name="company_name" value={form.company_name} onChange={handleChange} required disabled={saving} />
        </Field>
        <Field label={<span className="text-base font-semibold text-white/90 tracking-wide mb-1">Contact Person</span>}>
          <Input name="contact_person" value={form.contact_person} onChange={handleChange} required disabled={saving} />
        </Field>
        <Field label={<span className="text-base font-semibold text-white/90 tracking-wide mb-1">Title</span>}>
          <Input name="title" value={form.title} onChange={handleChange} disabled={saving} />
        </Field>
        <Field label={<span className="text-base font-semibold text-white/90 tracking-wide mb-1">Phone</span>}>
          <Input name="phone" value={form.phone} onChange={handleChange} disabled={saving} />
        </Field>
        <Field label={<span className="text-base font-semibold text-white/90 tracking-wide mb-1">Email</span>}>
          <Input name="email" value={form.email} onChange={handleChange} disabled={saving} />
        </Field>
        <Field label={<span className="text-base font-semibold text-white/90 tracking-wide mb-1">Website</span>}>
          <Input name="website" value={form.website} onChange={handleChange} disabled={saving} />
        </Field>
        <Field label={<span className="text-base font-semibold text-white/90 tracking-wide mb-1">Address 1</span>}>
          <Input name="address1" value={form.address1} onChange={handleChange} disabled={saving} />
        </Field>
        <Field label={<span className="text-base font-semibold text-white/90 tracking-wide mb-1">Address 2</span>}>
          <Input name="address2" value={form.address2} onChange={handleChange} disabled={saving} />
        </Field>
        <Field label={<span className="text-base font-semibold text-white/90 tracking-wide mb-1">City</span>}>
          <Input name="city" value={form.city} onChange={handleChange} disabled={saving} />
        </Field>
        <Field label={<span className="text-base font-semibold text-white/90 tracking-wide mb-1">State</span>}>
          <Input name="state" value={form.state} onChange={handleChange} disabled={saving} />
        </Field>
        <Field label={<span className="text-base font-semibold text-white/90 tracking-wide mb-1">Zip</span>}>
          <Input name="zip" value={form.zip} onChange={handleChange} disabled={saving} />
        </Field>
        <Field label={<span className="text-base font-semibold text-white/90 tracking-wide mb-1">Industry</span>}>
          <Select
            value={form.industry}
            onChange={(v) => setForm((f) => ({ ...f, industry: v }))}
            options={[
              { value: "", label: "Select industry" },
              { value: "construction", label: "Construction" },
              { value: "subcontractor", label: "Subcontractor" },
              { value: "manufacturing", label: "Manufacturing" },
              { value: "wholesale", label: "Wholesale" },
            ]}
            disabled={saving}
          />
        </Field>
        <Field label={<span className="text-base font-semibold text-white/90 tracking-wide mb-1">Status</span>}>
          <Select
            value={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            options={[
              { value: "", label: "Select status" },
              { value: "new_lead", label: "New Lead" },
              { value: "email_campaign", label: "Email Campaign" },
              { value: "warm_lead", label: "Warm Lead" },
              { value: "assessment_stage", label: "Assessment Stage" },
              { value: "onboarding", label: "Onboarding" },
              { value: "client", label: "Client" },
            ]}
            disabled={saving}
          />
        </Field>
        <Field label={<span className="text-base font-semibold text-white/90 tracking-wide mb-1">Follow Up Date</span>}>
          <Input type="date" name="follow_up_date" value={form.follow_up_date} onChange={handleChange} disabled={saving} />
        </Field>
        <ReadOnlyField label="Assigned User" value={lead.assigned_user_id} />
        <ReadOnlyField label="Created At" value={lead.created_at} />
        <ReadOnlyField label="Updated At" value={lead.updated_at} />
        <ReadOnlyField label="Lead ID" value={lead.id} />
        {error && <div style={{ color: "red" }}>{error}</div>}
        <div className="flex gap-2 mt-4">
          <button type="submit" disabled={saving} className="btn btn-primary">Save</button>
          <Link
            href={`/dashboard/leads/${lead.id}`}
            className="inline-flex"
            aria-disabled={saving}
            onClick={(e) => {
              if (saving) e.preventDefault();
            }}
          >
            <button type="button" disabled={saving} style={{ marginLeft: 8 }}>
              Cancel
            </button>
          </Link>
        </div>
      </div>
    </form>
  );
}
