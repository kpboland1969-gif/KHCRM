import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  attachActorLabels,
  fetchLeadActivity,
  getActorLabelMap,
  insertLeadNote,
  logLeadViewIfNeededServer,
  logServerError,
  type LeadActivityDisplayRow,
} from "@/lib/leads/activity.server";

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

function formatWhen(value: any) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

type LockedFieldProps = {
  label: string;
  value: any;
  type?: string;
};

function LockedField(props: LockedFieldProps) {
  const { label, value, type = "text" } = props;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-white/90">{label}</div>
      <input
        type={type}
        readOnly
        disabled
        value={value ?? ""}
        className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/90 outline-none disabled:opacity-100"
      />
    </div>
  );
}

function ActivityItem(props: { item: LeadActivityDisplayRow }) {
  const { item } = props;

  const titleBase =
    item.type === "note" ? "Note" : item.type === "view" ? "Viewed" : String(item.type);

  const title = `${titleBase} by ${item.actor_label}`;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm font-medium text-white/90">{title}</div>
        <div className="text-xs text-white/50">{formatWhen(item.created_at)}</div>
      </div>

      {item.type === "note" ? (
        <div className="mt-2 whitespace-pre-wrap text-sm text-white/80">
          {item.body || ""}
        </div>
      ) : null}

      {item.type === "view" ? (
        <div className="mt-2 text-sm text-white/70">This lead was opened.</div>
      ) : null}
    </div>
  );
}

export default async function LeadDetailPage({ params }: PageProps) {
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
    logServerError("[LeadDetail] auth.getUser error:", userError);
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
    logServerError("[LeadDetail] leads query error:", leadError);
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
          The lead does not exist or you do not have access.
        </p>
      </div>
    );
  }

  // View logging (10-min dedupe). Never blocks rendering.
  const viewRes = await logLeadViewIfNeededServer({
    supabase,
    leadId,
    userId: user.id,
    dedupeMinutes: 10,
  });
  if (viewRes.error) {
    logServerError("[LeadDetail] view logging error:", viewRes.error);
  }

  // Activity feed (newest first)
  const activityRes = await fetchLeadActivity({ supabase, leadId, limit: 50 });
  if (activityRes.error) {
    logServerError("[LeadDetail] activity query error:", activityRes.error);
  }

  const rawRows = activityRes.rows;

  const actorIds = rawRows.map((r) => r.user_id).filter((x): x is string => Boolean(x));
  const labelMap = await getActorLabelMap({ supabase, userIds: actorIds });

  const activity = attachActorLabels({
    rows: rawRows,
    currentUserId: user.id,
    labelMap,
  });

  async function addNote(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logServerError("[LeadDetail] addNote auth error:", userError);
      redirect(`/dashboard/leads/${leadId}`);
    }

    const body = String(formData.get("note") ?? "").trim();
    if (!body) redirect(`/dashboard/leads/${leadId}`);

    const res = await insertLeadNote({ supabase, leadId, userId: user.id, body });
    if (res.error) {
      logServerError("[LeadDetail] addNote insert error:", res.error);
    }

    redirect(`/dashboard/leads/${leadId}`);
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

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Lead</h1>
          <p className="mt-1 text-sm text-white/60">ID: {leadId}</p>
        </div>

        <Link
          href={`/dashboard/leads/${leadId}/edit`}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.06]"
        >
          Edit
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="text-sm text-white/60">
          Fields are locked on this page. Click{" "}
          <span className="font-medium text-white/80">Edit</span> to make changes.
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <LockedField label="Company Name *" value={companyName} />
          <LockedField label="Contact Person *" value={contactPerson} />
          <LockedField label="Title" value={title} />
          <LockedField label="Phone" value={phone} />
          <LockedField label="Email" value={email} type="email" />
          <LockedField label="Website" value={website} />
          <LockedField label="Address 1" value={address1} />
          <LockedField label="Address 2" value={address2} />
          <LockedField label="City" value={city} />
          <LockedField label="State" value={state} />
          <LockedField label="Zip" value={zip} />
          <LockedField label="Industry" value={industry} />
          <LockedField label="Status" value={status} />
          <LockedField label="Follow-up Date" value={followupDate} type="date" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="text-lg font-semibold">Add Note</div>

          <form action={addNote} className="mt-4 space-y-3">
            <textarea
              name="note"
              rows={4}
              placeholder="Write a note…"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-white/20"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.09]"
            >
              Save Note
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-baseline justify-between gap-4">
            <div className="text-lg font-semibold">Activity</div>
            <div className="text-xs text-white/50">{activity.length} items</div>
          </div>

          <div className="mt-4 space-y-3">
            {activity.length === 0 ? (
              <div className="text-sm text-white/70">No activity yet.</div>
            ) : null}

            {activity.map((item) => (
              <ActivityItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>

      <div className="text-xs text-white/40">Server session userId: {user.id}</div>
    </div>
  );
}