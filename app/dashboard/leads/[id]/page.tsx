
import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function formatValue(value: string | null) {
  return value && value.trim().length > 0 ? value : "—";
}

export default async function LeadDetailPage({ params }: PageProps) {
  const { id: leadId } = await params;
  if (!isUuid(leadId)) notFound();

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("leads")
    .select(`
      id,
      assigned_user_id,
      company_name,
      contact_person,
      title,
      phone,
      email,
      website,
      address1,
      address2,
      city,
      state,
      zip,
      industry,
      status,
      follow_up_date,
      created_at,
      updated_at,
      assigned_user:profiles!leads_assigned_user_id_fkey (
        id,
        full_name,
        username
      )
    `)
    .eq("id", leadId)
    .maybeSingle();

  if (error) {
    console.error("Lead detail fetch error:", { leadId, error });
    throw new Error(error.message);
  }

  if (!data) notFound();

  const lead = data;
  // assigned_user is an object: { id, full_name }
  // assigned_user is an object: { id, full_name }
  const assignedUserRow = Array.isArray(lead.assigned_user)
    ? lead.assigned_user[0]
    : lead.assigned_user;
  const assignedUser =
    assignedUserRow?.full_name ?? assignedUserRow?.username ?? "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {formatValue(lead.company_name)}
          </h1>
          <div className="text-sm opacity-70">
            {lead.status ? `Status: ${lead.status}` : "Lead details"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/dashboard/leads">Back</Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/leads/${leadId}/edit`}>Edit</Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Contact */}
        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium">Contact</div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="opacity-70">Name</dt>
              <dd className="text-right">{formatValue(lead.contact_person)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-70">Title</dt>
              <dd className="text-right">{formatValue(lead.title)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-70">Phone</dt>
              <dd className="text-right">{formatValue(lead.phone)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-70">Email</dt>
              <dd className="text-right">{formatValue(lead.email)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-70">Website</dt>
              <dd className="text-right">{formatValue(lead.website)}</dd>
            </div>
          </dl>
        </div>

        {/* Status / Follow-up */}
        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium">Status</div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="opacity-70">Status</dt>
              <dd className="text-right">{formatValue(lead.status)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-70">Industry</dt>
              <dd className="text-right">{formatValue(lead.industry)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-70">Follow-up</dt>
              <dd className="text-right">{formatDateTime(lead.follow_up_date)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-70">Assigned User</dt>
              <dd className="text-right">{assignedUser}</dd>
            </div>
          </dl>
        </div>

        {/* Address */}
        <div className="rounded-lg border p-4 lg:col-span-2">
          <div className="text-sm font-medium">Address</div>
          <div className="mt-3 text-sm space-y-1">
            <div>{formatValue(lead.address1)}</div>
            <div>{formatValue(lead.address2)}</div>
            <div>
              {formatValue(lead.city)}, {formatValue(lead.state)} {formatValue(lead.zip)}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="rounded-lg border p-4 lg:col-span-2">
          <div className="text-sm font-medium">Metadata</div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="opacity-70">Created</dt>
              <dd className="text-right">{formatDateTime(lead.created_at ?? null)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-70">Updated</dt>
              <dd className="text-right">{formatDateTime(lead.updated_at ?? null)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="opacity-70">Lead ID</dt>
              <dd className="text-right break-all">{lead.id}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
