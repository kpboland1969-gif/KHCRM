import 'server-only';

import Link from 'next/link';
import LeadDocumentsClient from '@/components/leads/LeadDocumentsClient';
import EmailSlideOver from '@/components/leads/EmailSlideOver';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logServerError } from '@/lib/leads/activity.server';
import AssigneeSelectClient from '@/components/leads/AssigneeSelectClient';

function getActorLabel(params: { actorId: string | null | undefined; currentUserId: string }) {
  const { actorId, currentUserId } = params;

  if (!actorId) return 'System';
  if (actorId === currentUserId) return 'You';
  return `User ${actorId.slice(0, 8)}`;
}

type PageProps = {
  params: Promise<{ id: string }>;
};

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function formatDateInput(value: string | null | undefined) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatWhen(value: string | null | undefined) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

type LockedFieldProps = {
  label: string;
  value: string | null | undefined;
  type?: string;
};

function LockedField(props: LockedFieldProps) {
  const { label, value, type = 'text' } = props;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-white/90">{label}</div>
      <input
        type={type}
        readOnly
        disabled
        value={value ?? ''}
        className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/90 outline-none disabled:opacity-100"
      />
    </div>
  );
}

type EmailLogRow = {
  id: string;
  sent_at: string | null;
  to_email: string | null;
  subject: string | null;
  status: string | null;
  error: string | null;
  provider_message_id: string | null;
  sent_by: string | null;
  document_ids: unknown[] | null;
};

async function fetchEmailLogRows(supabase: any, leadId: string): Promise<EmailLogRow[]> {
  const { data, error } = await supabase
    .from('document_email_log')
    .select('id,sent_at,to_email,subject,status,error,provider_message_id,document_ids,sent_by')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false })
    .limit(25);

  if (error) {
    console.error('[LeadDetail] email log query error:', error);
    return [];
  }

  return Array.isArray(data)
    ? data.map((row: any) => ({
        id: String(row.id),
        sent_at: row.sent_at ?? null,
        to_email: row.to_email ?? null,
        subject: row.subject ?? null,
        status: row.status ?? null,
        error: row.error ?? null,
        provider_message_id: row.provider_message_id ?? null,
        sent_by: row.sent_by ?? null,
        document_ids: row.document_ids ?? null,
      }))
    : [];
}

export default async function LeadDetailPage({ params }: PageProps) {
  const { id: leadId } = await params;

  if (!leadId || typeof leadId !== 'string' || !isUuidLike(leadId)) {
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
    logServerError('[LeadDetail] auth.getUser error:', userError);
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
    .from('leads')
    .select(`*, assigned_user:profiles!leads_assigned_user_id_fkey(id, full_name, username, email)`)
    .eq('id', leadId)
    .maybeSingle();

  if (leadError) {
    logServerError('[LeadDetail] leads query error:', leadError);
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

  const leadEmail = typeof lead.email === 'string' ? lead.email : null;

  const { data: docsRaw, error: docsErr } = await supabase
    .from('documents')
    .select('id,filename')
    .order('created_at', { ascending: false })
    .limit(500);

  if (docsErr) {
    console.error('[LeadDetail] documents query error:', docsErr);
  }

  const documents = Array.isArray(docsRaw)
    ? docsRaw.map((d: any) => ({
        id: String(d.id),
        filename: String(d.filename ?? 'Document'),
      }))
    : [];

  const { data: leadDocsRaw, error: leadDocsError } = await supabase
    .from('lead_uploaded_documents')
    .select('id, filename, storage_path, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (leadDocsError) {
    console.error('[LeadDetail] lead documents query error:', leadDocsError);
  }

  const leadDocuments = Array.isArray(leadDocsRaw)
    ? leadDocsRaw.map((d: any) => ({
        id: String(d.id),
        filename: String(d.filename ?? 'Document'),
        storage_path: String(d.storage_path ?? ''),
        created_at: d.created_at ?? null,
      }))
    : [];

  await fetchEmailLogRows(supabase, leadId);

  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recentView, error: recentViewError } = await supabase
    .from('lead_activity')
    .select('id')
    .eq('lead_id', leadId)
    .eq('user_id', user.id)
    .eq('type', 'view')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!recentViewError && (!Array.isArray(recentView) || recentView.length === 0)) {
    const { error: insertViewError } = await supabase.from('lead_activity').insert([
      {
        lead_id: leadId,
        type: 'view',
        body: null,
        user_id: user.id,
      },
    ]);

    if (insertViewError) {
      logServerError('[LeadDetail] view logging error:', insertViewError);
    }
  } else if (recentViewError) {
    logServerError('[LeadDetail] view logging error:', recentViewError);
  }

  const activityRes = await supabase
    .from('lead_activity')
    .select('id,lead_id,user_id,type,body,created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (activityRes.error) {
    logServerError('[LeadDetail] activity query error:', activityRes.error);
  }

  const activity = Array.isArray(activityRes.data) ? activityRes.data : [];

  const companyName = typeof lead.company_name === 'string' ? lead.company_name : '';
  const contactPerson = typeof lead.contact_person === 'string' ? lead.contact_person : '';
  const title = typeof lead.title === 'string' ? lead.title : '';
  const phone = typeof lead.phone === 'string' ? lead.phone : '';
  const email = typeof lead.email === 'string' ? lead.email : '';
  const website = typeof lead.website === 'string' ? lead.website : '';
  const address1 = typeof lead.address1 === 'string' ? lead.address1 : '';
  const address2 = typeof lead.address2 === 'string' ? lead.address2 : '';
  const city = typeof lead.city === 'string' ? lead.city : '';
  const state = typeof lead.state === 'string' ? lead.state : '';
  const zip = typeof lead.zip === 'string' ? lead.zip : '';
  const industry = typeof lead.industry === 'string' ? lead.industry : '';
  const status = typeof lead.status === 'string' ? lead.status : '';
  const followupDate = formatDateInput(
    typeof lead.follow_up_date === 'string' ? lead.follow_up_date : null,
  );

  const assignedUserId = typeof lead.assigned_user_id === 'string' ? lead.assigned_user_id : null;

  const assignedUserLabel =
    (lead as any).assigned_user?.full_name ||
    (lead as any).assigned_user?.username ||
    (lead as any).assigned_user?.email ||
    'Unassigned';

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const canManageAssignments = profile?.role === 'admin' || profile?.role === 'manager';

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Lead</h1>
          <p className="mt-1 text-sm text-white/60">ID: {leadId}</p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/dashboard/leads/${leadId}/edit`}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.06]"
          >
            Edit
          </Link>
          <EmailSlideOver leadId={leadId} leadEmail={leadEmail} documents={documents} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="text-sm text-white/60">
          Fields are locked on this page. Click{' '}
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-2 text-sm font-semibold">Assigned User</div>

          {canManageAssignments ? (
            <AssigneeSelectClient leadId={leadId} assignedUserId={assignedUserId} />
          ) : (
            <div className="text-sm text-white/80">{assignedUserLabel}</div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-baseline justify-between gap-4">
            <div className="text-lg font-semibold">Activity</div>
            <div className="text-xs text-white/50">{activity.length} items</div>
          </div>

          <div className="mt-3">
            {activity.length === 0 ? (
              <div className="text-sm text-white/70">No activity yet.</div>
            ) : (
              <div className="max-h-[260px] space-y-2 overflow-y-auto pr-2">
                {activity.map((item) => {
                  const actorLabel = getActorLabel({
                    actorId: (item as any).user_id,
                    currentUserId: user.id,
                  });

                  const type = (item as any).type as string | undefined;
                  const title =
                    type === 'view'
                      ? `Viewed by ${actorLabel}`
                      : type === 'note'
                        ? `Note by ${actorLabel}`
                        : type === 'email_sent'
                          ? `Email sent by ${actorLabel}`
                          : `${(type ?? 'Activity').toString()} by ${actorLabel}`;

                  const bodyText = ((item as any).body as string | undefined) ?? '';
                  const createdAt = (item as any).created_at;

                  return (
                    <div
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
                      key={(item as any).id ?? `${type ?? 'activity'}-${String(createdAt ?? '')}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="text-sm font-medium leading-tight text-white/90">
                          {title}
                        </div>
                        <div className="text-xs text-white/50">{formatWhen(createdAt)}</div>
                      </div>

                      {type === 'note' ? (
                        <div className="mt-1 whitespace-pre-wrap text-sm text-white/80">
                          {bodyText}
                        </div>
                      ) : null}

                      {type === 'email_sent' ? (
                        <div className="mt-1 whitespace-pre-wrap text-sm text-white/80">
                          {bodyText}
                        </div>
                      ) : null}

                      {type === 'view' ? (
                        <div className="mt-1 text-sm text-white/70">This lead was opened.</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Lead Documents</div>
        </div>

        <div className="mt-4">
          <LeadDocumentsClient leadId={leadId} documents={leadDocuments} />
        </div>
      </div>

      <div className="text-xs text-white/40">Server session userId: {user.id}</div>
    </div>
  );
}
