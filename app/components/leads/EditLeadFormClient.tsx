"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LeadRow } from "@/lib/types/leads";

export type Props = {
  lead: LeadRow;
};



import Link from "next/link";

import { formLabelClass, formHintClass, formFieldClass, formSelectClass } from "@/components/ui/formStyles";
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
      <p className={formHintClass + " mb-4"}>
        Editable fields are shown in highlighted boxes.
      </p>
      <div>
        <label className={formLabelClass}>Company Name</label>
        <input className={formFieldClass} name="company_name" value={form.company_name} onChange={handleChange} required disabled={saving} />
      </div>
      <div>
        <label className={formLabelClass}>Contact Person</label>
        <input className={formFieldClass} name="contact_person" value={form.contact_person} onChange={handleChange} required disabled={saving} />
      </div>
      <div>
        <label className={formLabelClass}>Title</label>
        <input className={formFieldClass} name="title" value={form.title} onChange={handleChange} disabled={saving} />
      </div>
      <div>
        <label className={formLabelClass}>Phone</label>
        <input className={formFieldClass} name="phone" value={form.phone} onChange={handleChange} disabled={saving} />
      </div>
      <div>
        <label className={formLabelClass}>Email</label>
        <input className={formFieldClass} name="email" value={form.email} onChange={handleChange} disabled={saving} />
      </div>
      <div>
        <label className={formLabelClass}>Website</label>
        <input className={formFieldClass} name="website" value={form.website} onChange={handleChange} disabled={saving} />
      </div>
      <div>
        <label className={formLabelClass}>Address 1</label>
        <input className={formFieldClass} name="address1" value={form.address1} onChange={handleChange} disabled={saving} />
      </div>
      <div>
        <label className={formLabelClass}>Address 2</label>
        <input className={formFieldClass} name="address2" value={form.address2} onChange={handleChange} disabled={saving} />
      </div>
      <div>
        <label className={formLabelClass}>City</label>
        <input className={formFieldClass} name="city" value={form.city} onChange={handleChange} disabled={saving} />
      </div>
      <div>
        <label className={formLabelClass}>State</label>
        <input className={formFieldClass} name="state" value={form.state} onChange={handleChange} disabled={saving} />
      </div>
      <div>
        <label className={formLabelClass}>Zip</label>
        <input className={formFieldClass} name="zip" value={form.zip} onChange={handleChange} disabled={saving} />
      </div>
      <div>
        <label className={formLabelClass}>Industry</label>
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
          className={formSelectClass}
        />
      </div>
      <div>
        <label className={formLabelClass}>Status</label>
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
          className={formSelectClass}
        />
      </div>
      <div>
        <label className={formLabelClass}>Follow Up Date</label>
        <input className={formFieldClass} type="date" name="follow_up_date" value={form.follow_up_date} onChange={handleChange} disabled={saving} />
      </div>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <button type="submit" disabled={saving}>Save</button>
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
    </form>
  );
}
