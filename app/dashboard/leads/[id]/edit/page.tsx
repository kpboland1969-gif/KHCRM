import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LeadRow } from "@/lib/types/leads";
import EditLeadFormClient from "@/app/components/leads/EditLeadFormClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export default async function EditLeadPage({ params }: PageProps) {
  const { id: leadId } = await params;
  if (!isUuid(leadId)) notFound();

  const supabase = await createSupabaseServerClient();

  // IMPORTANT: select your real snake_case columns (same as detail page, but no join needed)
  const { data: lead, error } = await supabase
    .from("leads")
    .select(
      [
        "id",
        "assigned_user_id",
        "company_name",
        "contact_person",
        "title",
        "phone",
        "email",
        "website",
        "address1",
        "address2",
        "city",
        "state",
        "zip",
        "industry",
        "status",
        "follow_up_date",
      ].join(",")
    )
    .eq("id", leadId)
    .maybeSingle<LeadRow>();

  if (error) {
    console.error("[EditLeadPage] fetch error:", { leadId, error });
    throw new Error(error.message);
  }

  if (!lead) notFound();

  return <EditLeadFormClient lead={lead} />;
}
