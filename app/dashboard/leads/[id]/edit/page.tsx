import 'server-only';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type PageProps = {
  params: any;
};

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'email_campaign', label: 'Email Campaign' },
  { value: 'warm_lead', label: 'Warm Lead' },
  { value: 'assessment_stage', label: 'Assessment Stage' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'client', label: 'Client' },
];

const INDUSTRY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'construction', label: 'Construction' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'wholesale', label: 'Wholesale' },
];

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function inputClassName() {
  return 'h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-white/20';
}

function labelClassName() {
  return 'text-sm font-medium text-white/80';
}

function cardClassName() {
  return 'rounded-2xl border border-white/10 bg-white/[0.02] p-6';
}

function getString(formData: FormData, key: string) {
  const v = formData.get(key);
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length ? s : null;
}

function getAssigneeLabel(profile: {
  full_name: string | null;
  username: string | null;
  email: string | null;
}) {
  return profile.full_name || profile.username || profile.email || 'Unassigned';
}

export default async function EditLeadPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const leadId = resolvedParams?.id as string | undefined;

  if (!leadId || !isUuidLike(leadId)) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Lead Not Found</h1>
        <p className="mt-2 text-sm text-white/70">Invalid lead id.</p>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('[EditLead] auth.getUser error:', userError);
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Auth Error</h1>
        <p className="mt-2 text-sm text-white/70">Could not verify your session.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Not Logged In</h1>
        <p className="mt-2 text-sm text-white/70">No server session found.</p>
      </div>
    );
  }

  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const canManageAssignments = actorProfile?.role === 'admin' || actorProfile?.role === 'manager';

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select(
      'id,company_name,contact_person,title,phone,email,website,address1,address2,city,state,zip,industry,status,follow_up_date,assigned_user_id',
    )
    .eq('id', leadId)
    .maybeSingle();

  if (leadError) {
    console.error('[EditLead] lead query error:', leadError);
  }

  if (!lead) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Lead Not Found</h1>
        <p className="mt-2 text-sm text-white/70">
          The lead you are looking for does not exist or you do not have access.
        </p>
      </div>
    );
  }

  const { data: profileRows } = canManageAssignments
    ? await supabase
        .from('profiles')
        .select('id,full_name,username,email,disabled')
        .order('full_name', { ascending: true })
    : { data: [] as any[] };

  const assignableUsers = Array.isArray(profileRows)
    ? profileRows.filter((profile) => !profile.disabled)
    : [];

  async function updateLead(formData: FormData) {
    'use server';

    if (!leadId || typeof leadId !== 'string') {
      throw new Error('Invalid leadId');
    }

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect('/login');
    }

    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const canManageAssignments = actorProfile?.role === 'admin' || actorProfile?.role === 'manager';

    const { data: before, error: beforeError } = await supabase
      .from('leads')
      .select('status,follow_up_date,assigned_user_id')
      .eq('id', leadId)
      .maybeSingle();

    if (beforeError) {
      console.error('[EditLead] before read error:', beforeError);
    }

    const patch: Record<string, any> = {
      company_name: getString(formData, 'company_name'),
      contact_person: getString(formData, 'contact_person'),
      title: getString(formData, 'title'),
      phone: getString(formData, 'phone'),
      email: getString(formData, 'email'),
      website: getString(formData, 'website'),
      address1: getString(formData, 'address1'),
      address2: getString(formData, 'address2'),
      city: getString(formData, 'city'),
      state: getString(formData, 'state'),
      zip: getString(formData, 'zip'),
      industry: getString(formData, 'industry'),
      status: getString(formData, 'status'),
    };

    const followupDate = getString(formData, 'followup_at');
    patch.follow_up_date = followupDate ? `${followupDate}T00:00:00.000Z` : null;

    if (canManageAssignments) {
      patch.assigned_user_id = getString(formData, 'assigned_user_id');
    }

    const nextStatus = (patch.status ?? null) as string | null;
    const nextFollowUpDate = (patch.follow_up_date ?? null) as string | null;
    const nextAssignedUserId = canManageAssignments
      ? ((patch.assigned_user_id ?? null) as string | null)
      : ((before?.assigned_user_id ?? null) as string | null);

    const { error } = await supabase.from('leads').update(patch).eq('id', leadId);

    if (error) {
      console.error('[EditLead] update error:', error);
      redirect(`/dashboard/leads/${leadId}/edit?error=save_failed`);
    }

    const prevStatus = before?.status ?? null;
    const prevFollowUp = before?.follow_up_date ?? null;
    const prevAssignedUserId = before?.assigned_user_id ?? null;

    const activityRows: Array<{
      lead_id: string;
      user_id: string;
      type: string;
      body: string | null;
    }> = [];

    if (prevStatus !== nextStatus) {
      activityRows.push({
        lead_id: leadId,
        user_id: user.id,
        type: 'status_change',
        body: `Status changed from ${prevStatus ?? '—'} to ${nextStatus ?? '—'}.`,
      });
    }

    if (prevFollowUp !== nextFollowUpDate) {
      const fromText = prevFollowUp ? new Date(prevFollowUp).toLocaleDateString() : '—';
      const toText = nextFollowUpDate ? new Date(nextFollowUpDate).toLocaleDateString() : '—';

      activityRows.push({
        lead_id: leadId,
        user_id: user.id,
        type: 'followup_change',
        body: `Follow-up date changed from ${fromText} to ${toText}.`,
      });
    }

    if (prevAssignedUserId !== nextAssignedUserId) {
      const idsToLookup = [prevAssignedUserId, nextAssignedUserId].filter(
        (value): value is string => Boolean(value),
      );

      const labelById: Record<string, string> = {};

      if (idsToLookup.length > 0) {
        const { data: assigneeRows } = await supabase
          .from('profiles')
          .select('id,full_name,username,email')
          .in('id', idsToLookup);

        for (const profile of assigneeRows || []) {
          labelById[profile.id] = getAssigneeLabel(profile);
        }
      }

      const fromLabel = prevAssignedUserId
        ? labelById[prevAssignedUserId] || 'Unassigned'
        : 'Unassigned';
      const toLabel = nextAssignedUserId
        ? labelById[nextAssignedUserId] || 'Unassigned'
        : 'Unassigned';

      activityRows.push({
        lead_id: leadId,
        user_id: user.id,
        type: 'assignment_change',
        body: `Assigned user changed from ${fromLabel} to ${toLabel}.`,
      });
    }

    if (activityRows.length > 0) {
      const { error: actErr } = await supabase.from('lead_activity').insert(activityRows);

      if (actErr) {
        console.error('[EditLead] activity insert error:', actErr);
      }
    }

    redirect(`/dashboard/leads/${leadId}`);
  }

  const followupDateValue =
    (lead as any).follow_up_date && !Number.isNaN(new Date((lead as any).follow_up_date).getTime())
      ? new Date((lead as any).follow_up_date).toISOString().slice(0, 10)
      : '';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Edit Lead</h1>
          <div className="mt-1 text-sm text-white/60">ID: {lead.id}</div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/dashboard/leads/${lead.id}`}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.06]"
          >
            Cancel
          </Link>

          <button
            form="edit-lead-form"
            type="submit"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.10]"
          >
            Save
          </button>
        </div>
      </div>

      <div className={cardClassName()}>
        <div className="text-sm text-white/60">Editable fields are shown in highlighted boxes.</div>

        <form id="edit-lead-form" action={updateLead} className="mt-4 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className={labelClassName()}>
                Company Name <span className="text-white/50">*</span>
              </div>
              <input
                name="company_name"
                defaultValue={(lead.company_name ?? '') as string}
                className={inputClassName()}
                required
              />
            </div>

            <div className="space-y-2">
              <div className={labelClassName()}>
                Contact Person <span className="text-white/50">*</span>
              </div>
              <input
                name="contact_person"
                defaultValue={(lead.contact_person ?? '') as string}
                className={inputClassName()}
                required
              />
            </div>

            <div className="space-y-2">
              <div className={labelClassName()}>Title</div>
              <input
                name="title"
                defaultValue={(lead.title ?? '') as string}
                className={inputClassName()}
              />
            </div>

            <div className="space-y-2">
              <div className={labelClassName()}>Phone</div>
              <input
                name="phone"
                defaultValue={(lead.phone ?? '') as string}
                className={inputClassName()}
              />
            </div>

            <div className="space-y-2">
              <div className={labelClassName()}>Email</div>
              <input
                name="email"
                type="email"
                defaultValue={(lead.email ?? '') as string}
                className={inputClassName()}
              />
            </div>

            <div className="space-y-2">
              <div className={labelClassName()}>Website</div>
              <input
                name="website"
                defaultValue={(lead.website ?? '') as string}
                className={inputClassName()}
              />
            </div>

            <div className="space-y-2">
              <div className={labelClassName()}>Address 1</div>
              <input
                name="address1"
                defaultValue={(lead.address1 ?? '') as string}
                className={inputClassName()}
              />
            </div>

            <div className="space-y-2">
              <div className={labelClassName()}>Address 2</div>
              <input
                name="address2"
                defaultValue={(lead.address2 ?? '') as string}
                className={inputClassName()}
              />
            </div>

            <div className="space-y-2">
              <div className={labelClassName()}>City</div>
              <input
                name="city"
                defaultValue={(lead.city ?? '') as string}
                className={inputClassName()}
              />
            </div>

            <div className="space-y-2">
              <div className={labelClassName()}>State</div>
              <input
                name="state"
                defaultValue={(lead.state ?? '') as string}
                className={inputClassName()}
              />
            </div>

            <div className="space-y-2">
              <div className={labelClassName()}>Zip</div>
              <input
                name="zip"
                defaultValue={(lead.zip ?? '') as string}
                className={inputClassName()}
              />
            </div>

            <div className="space-y-2">
              <div className={labelClassName()}>Industry</div>
              <select
                name="industry"
                defaultValue={(lead.industry ?? '') as string}
                className={inputClassName()}
              >
                <option value="" disabled>
                  Select industry
                </option>
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className={labelClassName()}>Status</div>
              <select
                name="status"
                defaultValue={(lead.status ?? '') as string}
                className={inputClassName()}
              >
                <option value="" disabled>
                  Select status
                </option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {canManageAssignments ? (
              <div className="space-y-2">
                <div className={labelClassName()}>Assigned User</div>
                <select
                  name="assigned_user_id"
                  defaultValue={((lead as any).assigned_user_id ?? '') as string}
                  className={inputClassName()}
                >
                  <option value="">Unassigned</option>
                  {assignableUsers.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {getAssigneeLabel(profile)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="space-y-2">
              <div className={labelClassName()}>Follow-up Date</div>
              <input
                name="followup_at"
                type="date"
                defaultValue={followupDateValue}
                className={inputClassName()}
              />
            </div>
          </div>

          <div className="text-xs text-white/40">Server session userId: {user.id}</div>
        </form>
      </div>
    </div>
  );
}
