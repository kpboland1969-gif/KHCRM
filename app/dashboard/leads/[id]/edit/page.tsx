import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function pick(lead: any, keys: string[]) {
  for (const k of keys) {
    const v = lead?.[k];
    if (v !== null && v !== undefined && String(v).length > 0) return v;
  }
  return "";
}

function formatDateInput(value: any) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-white/90">
        {label} {required ? <span className="text-white/60">*</span> : null}
      </div>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-white/20"
      />
    </div>
  );
}

function firstExistingKey(row: Record<string, any>, candidates: string[]) {
  for (const k of candidates) {
    if (Object.prototype.hasOwnProperty.call(row, k)) return k;
  }
  return null;
}

export default async function LeadEditPage({ params }: PageProps) {
  const { id: leadId } = await params;

  if (!leadId || typeof leadId !== "string" || !isUuidLike(leadId)) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Lead Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">Invalid lead id.</p>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("[LeadEdit] auth.getUser error:", userError);
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Auth Error</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn’t verify your session on the server.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Not Logged In</h1>
        <p className="mt-2 text-sm text-muted-foreground">No server-side session found.</p>
      </div>
    );
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) {
    console.error("[LeadEdit] leads query error:", { leadId, userId: user.id, error: leadError });
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Could Not Load Lead</h1>
        <p className="mt-2 text-sm text-muted-foreground">{leadError.message}</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Lead Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The lead you are looking for does not exist or you do not have access.
        </p>
      </div>
    );
  }

  const l: any = lead;

  const companyName = pick(l, ["company_name", "companyName", "company", "name"]);
  const contactPerson = pick(l, [
    "contact_person",
    "contactPerson",
    "contact_name",
    "contactName",
    "primary_contact",
  ]);
  const title = pick(l, ["title", "job_title", "jobTitle"]);
  const phone = pick(l, ["phone", "phone_number", "phoneNumber"]);
  const email = pick(l, ["email"]);
  const website = pick(l, ["website", "url"]);
  const address1 = pick(l, ["address_1", "address1", "address_line_1", "addressLine1"]);
  const address2 = pick(l, ["address_2", "address2", "address_line_2", "addressLine2"]);
  const city = pick(l, ["city"]);
  const state = pick(l, ["state", "province", "region"]);
  const zip = pick(l, ["zip", "postal_code", "postalCode"]);
  const industry = pick(l, ["industry"]);
  const status = pick(l, ["status"]);
  const followupDateRaw = pick(l, [
    "followup_at",
    "followupAt",
    "follow_up_at",
    "follow_up_date",
    "followup_date",
  ]);
  const followupDate = formatDateInput(followupDateRaw);

  async function updateLead(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("[LeadEdit] updateLead auth error:", userError);
      redirect(`/dashboard/leads/${leadId}`);
    }

    // Re-fetch to discover which columns exist (prevents “unknown column” errors)
    const { data: current, error: currentError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .maybeSingle();

    if (currentError || !current) {
      console.error("[LeadEdit] updateLead fetch current error:", { leadId, error: currentError });
      redirect(`/dashboard/leads/${leadId}/edit`);
    }

    const row = current as Record<string, any>;
    const updates: Record<string, any> = {};

    const companyVal = String(formData.get("company_name") ?? "").trim();
    const contactVal = String(formData.get("contact_person") ?? "").trim();

    const setIfExists = (candidates: string[], value: string | null) => {
      const key = firstExistingKey(row, candidates);
      if (!key) return;
      updates[key] = value;
    };

    // Required-ish fields
    setIfExists(["company_name", "name", "company"], companyVal || null);
    setIfExists(["contact_person", "contact_name", "contact"], contactVal || null);

    // Optional fields
    setIfExists(["title", "job_title"], String(formData.get("title") ?? "").trim() || null);
    setIfExists(["phone", "phone_number"], String(formData.get("phone") ?? "").trim() || null);
    setIfExists(["email"], String(formData.get("email") ?? "").trim() || null);
    setIfExists(["website", "url"], String(formData.get("website") ?? "").trim() || null);
    setIfExists(["address_1", "address_line_1"], String(formData.get("address_1") ?? "").trim() || null);
    setIfExists(["address_2", "address_line_2"], String(formData.get("address_2") ?? "").trim() || null);
    setIfExists(["city"], String(formData.get("city") ?? "").trim() || null);
    setIfExists(["state", "province", "region"], String(formData.get("state") ?? "").trim() || null);
    setIfExists(["zip", "postal_code"], String(formData.get("zip") ?? "").trim() || null);
    setIfExists(["industry"], String(formData.get("industry") ?? "").trim() || null);
    setIfExists(["status"], String(formData.get("status") ?? "").trim() || null);

    const followup = String(formData.get("followup_at") ?? "").trim();
    const followupKey = firstExistingKey(row, ["followup_at", "follow_up_at", "follow_up_date", "followup_date"]);
    if (followupKey) {
      updates[followupKey] = followup ? new Date(followup).toISOString() : null;
    }

    if (Object.keys(updates).length === 0) {
      // Nothing to update (or schema mismatch)
      redirect(`/dashboard/leads/${leadId}`);
    }

    const { error } = await supabase.from("leads").update(updates).eq("id", leadId);

    if (error) {
      console.error("[LeadEdit] update error:", { leadId, userId: user.id, error, updates });
      redirect(`/dashboard/leads/${leadId}/edit`);
    }

    // Success: return to locked detail view
    redirect(`/dashboard/leads/${leadId}`);
  }

  return (
    <div className="p-6">
      <form action={updateLead}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Edit Lead</h1>
            <p className="mt-1 text-sm text-white/60">ID: {leadId}</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/leads/${leadId}`}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.06]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.09]"
            >
              Save
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="text-sm text-white/60">Editable fields are shown in highlighted boxes.</div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Company Name" name="company_name" defaultValue={companyName} required />
            <Field label="Contact Person" name="contact_person" defaultValue={contactPerson} required />
            <Field label="Title" name="title" defaultValue={title} />
            <Field label="Phone" name="phone" defaultValue={phone} />
            <Field label="Email" name="email" defaultValue={email} type="email" />
            <Field label="Website" name="website" defaultValue={website} />
            <Field label="Address 1" name="address_1" defaultValue={address1} />
            <Field label="Address 2" name="address_2" defaultValue={address2} />
            <Field label="City" name="city" defaultValue={city} />
            <Field label="State" name="state" defaultValue={state} />
            <Field label="Zip" name="zip" defaultValue={zip} />
            <Field label="Industry" name="industry" defaultValue={industry} />
            <Field label="Status" name="status" defaultValue={status} />
            <Field label="Follow-up Date" name="followup_at" defaultValue={followupDate} type="date" />
          </div>

          <div className="mt-6 text-xs text-white/50">Server session userId: {user.id}</div>
        </div>
      </form>
    </div>
  );
}
