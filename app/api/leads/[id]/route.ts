
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Next.js 16 API route signature
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // UUID validation (copied from app)
  function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
  if (!isUuid(id)) {
    return NextResponse.json({ ok: false, error: "Invalid ID" }, { status: 400 });
  }
  const body = await req.json();
  // Only allow updating these fields
  const updatePayload: Record<string, any> = {};
  const allowed = [
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
  ];
  for (const key of allowed) {
    if (key === "follow_up_date") {
      // Convert empty string to null, else to ISO string (midnight UTC)
      if (!body.follow_up_date) {
        updatePayload.follow_up_date = null;
      } else {
        updatePayload.follow_up_date = new Date(body.follow_up_date + "T00:00:00Z").toISOString();
      }
    } else if (key in body) {
      updatePayload[key] = body[key];
    }
  }
  const supabase = await createSupabaseServerClient();
  const { data: _data, error } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", id)
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id });
}
