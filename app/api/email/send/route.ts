import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendEmailSMTP } from '@/lib/email';

export const runtime = 'nodejs';

const BUCKET_ID = 'documents';

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

type SendEmailBody = {
  leadId: string;
  to: string;
  subject: string;
  body: string;
  documentIds: string[];
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as SendEmailBody | null;
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const leadId = String(payload.leadId ?? '').trim();
  const to = String(payload.to ?? '').trim();
  const subject = String(payload.subject ?? '').trim();
  const body = String(payload.body ?? '').trim();
  const documentIds = Array.isArray(payload.documentIds) ? payload.documentIds.map(String) : [];

  if (!leadId || !isUuidLike(leadId)) {
    return NextResponse.json({ ok: false, error: 'Invalid leadId' }, { status: 400 });
  }
  if (!to || !to.includes('@')) {
    return NextResponse.json({ ok: false, error: 'Invalid to address' }, { status: 400 });
  }
  if (!subject) {
    return NextResponse.json({ ok: false, error: 'Subject is required' }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json({ ok: false, error: 'Body is required' }, { status: 400 });
  }
  if (documentIds.length < 1 || documentIds.some((id) => !isUuidLike(id))) {
    return NextResponse.json(
      { ok: false, error: 'Select at least one valid document' },
      { status: 400 },
    );
  }

  // Ensure lead is accessible (RLS)
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('id,email')
    .eq('id', leadId)
    .maybeSingle();

  if (leadErr) {
    return NextResponse.json({ ok: false, error: leadErr.message }, { status: 500 });
  }
  if (!lead) {
    return NextResponse.json(
      { ok: false, error: 'Lead not found or you do not have access' },
      { status: 404 },
    );
  }

  // Fetch docs (support both file_name + filename; mime_type + content_type)
  const { data: docsRaw, error: docsErr } = await supabase
    .from('documents')
    .select('id,file_name,filename,storage_path,mime_type,content_type')
    .in('id', documentIds);

  if (docsErr) {
    return NextResponse.json({ ok: false, error: docsErr.message }, { status: 500 });
  }

  const docs = Array.isArray(docsRaw) ? (docsRaw as any[]) : [];
  if (docs.length !== documentIds.length) {
    return NextResponse.json(
      { ok: false, error: 'One or more documents could not be found' },
      { status: 400 },
    );
  }

  // Build attachment list
  const attachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [];
  const attachmentNames: string[] = [];

  for (const d of docs) {
    const storagePath = String(d.storage_path ?? '');
    const filename = String(d.file_name ?? d.filename ?? 'Document');
    const contentType = d.content_type
      ? String(d.content_type)
      : d.mime_type
        ? String(d.mime_type)
        : undefined;

    if (!storagePath) {
      return NextResponse.json(
        { ok: false, error: `Document missing storage_path: ${filename}` },
        { status: 500 },
      );
    }

    const { data, error } = await supabase.storage.from(BUCKET_ID).download(storagePath);
    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: `Failed to download attachment: ${filename}` },
        { status: 500 },
      );
    }

    const ab = await data.arrayBuffer();
    attachments.push({
      filename,
      content: Buffer.from(ab),
      contentType,
    });
    attachmentNames.push(filename);
  }

  // These are returned so the client can confirm logging happened
  let activityLogged = false;
  let activityError: any = null;

  try {
    const { messageId } = await sendEmailSMTP({
      to,
      subject,
      text: body,
      attachments,
    });

    // Activity log: should not block email send, but should be visible when it fails
    try {
      const attachmentsLabel =
        attachmentNames.length > 0
          ? `${attachmentNames.length} attachment${attachmentNames.length === 1 ? '' : 's'}: ${attachmentNames.join(', ')}`
          : 'No attachments';

      const activityRow = {
        lead_id: leadId,
        user_id: user.id,
        type: 'email_sent',
        body: [
          `Email sent to: ${to}`,
          `Subject: ${subject}`,
          `Attachments: ${attachmentNames.length ? attachmentNames.join(', ') : '(none)'}`,
          '',
          body,
        ].join('\n'),
      };

      const ins = await supabase.from('lead_activity').insert([activityRow]);
      if (ins.error) {
        console.error('[EmailSend] lead_activity insert error:', ins.error);
        activityError = ins.error;
      } else {
        activityLogged = true;
      }
    } catch (e: any) {
      console.error('[EmailSend] lead_activity insert threw:', e);
      activityError = e;
    }

    // Best-effort audit log (optional table)
    try {
      await supabase.from('document_email_log').insert([
        {
          lead_id: leadId,
          document_ids: documentIds,
          to_email: to,
          subject,
          body,
          sent_by: user.id,
          status: 'sent',
          provider_message_id: messageId ?? null,
          error: null,
        },
      ]);
    } catch {
      // no-op
    }

    return NextResponse.json({
      ok: true,
      messageId: messageId ?? null,
      activityLogged,
      activityError: activityLogged ? null : (activityError ?? null),
    });
  } catch (e: any) {
    const errMsg = e?.message || 'Failed to send email';

    // Best-effort audit log (optional table)
    try {
      await supabase.from('document_email_log').insert([
        {
          lead_id: leadId,
          document_ids: documentIds,
          to_email: to,
          subject,
          body,
          sent_by: user.id,
          status: 'failed',
          provider_message_id: null,
          error: errMsg,
        },
      ]);
    } catch {
      // no-op
    }

    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
