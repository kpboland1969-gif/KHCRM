import 'server-only';

import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendEmailSMTP } from '@/lib/email';
import { jsonOk, jsonErr, safeErrorMessage } from '@/lib/api/response';
import { withRequestLogging } from '@/lib/api/requestLogger';

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
    return jsonErr('Unauthorized', { status: 401, code: 'UNAUTHORIZED' });
  }

  const payload = (await req.json().catch(() => null)) as any;
  if (!payload) {
    return jsonErr('Invalid JSON body', { status: 400, code: 'VALIDATION_ERROR' });
  }

  const leadId = String(payload.leadId ?? '').trim();
  const to = String(payload.to ?? '').trim();
  const subject = String(payload.subject ?? '').trim();
  const body = String(payload.body ?? '').trim();
  const documentIds = Array.isArray(payload.documentIds) ? payload.documentIds.map(String) : [];
  const force = payload.force === true;
  const resendFromLogId = payload.resendFromLogId ?? null;

  // Duplicate guard
  const normalizedTo = to.toLowerCase();
  const now = Date.now();
  const tenMinutesAgo = now - 10 * 60 * 1000;
  const { data: recentRows } = await supabase
    .from('document_email_log')
    .select('document_ids,to_email,sent_at,error,status')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false })
    .limit(50);

  const duplicate = (recentRows ?? []).some((row) => {
    if (row.error) return false;
    const status = (row.status || '').toLowerCase();
    if (!/(sent|success|ok)/.test(status)) return false;
    if (
      String(row.to_email ?? '')
        .trim()
        .toLowerCase() !== normalizedTo
    )
      return false;
    if (new Date(row.sent_at).getTime() < tenMinutesAgo) return false;
    const sentDocIds = Array.isArray(row.document_ids) ? row.document_ids.map(String) : [];
    return sentDocIds.some((id) => documentIds.includes(id));
  });

  if (duplicate && !force) {
    return jsonErr('Recently sent these documents to this recipient. Confirm resend to proceed.', {
      status: 409,
      code: 'DUPLICATE_RECENT_SEND',
    });
  }

  // Ensure lead is accessible (RLS)
  return await withRequestLogging(
    {
      route: 'email_send',
      userId: (() => {
        // Get user id from supabase auth
        // This logic is duplicated from above for logging
        // but does not change business logic
        // If user is not authenticated, will be null
        // This is safe for logging only
        // The actual logic below will still validate auth
        // and return jsonErr if not authenticated
        // This is only for logging
        // If you want to avoid duplicate supabase client creation, you can refactor
        // but for now, keep logic unchanged
        return null;
      })(),
      leadId: null,
    },
    async () => {
      const supabase = await createSupabaseServerClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return jsonErr('Unauthorized', { status: 401, code: 'UNAUTHORIZED' });
      }

      const payload = (await req.json().catch(() => null)) as any;
      if (!payload) {
        return jsonErr('Invalid JSON body', { status: 400, code: 'VALIDATION_ERROR' });
      }

      const leadId = String(payload.leadId ?? '').trim();
      const to = String(payload.to ?? '').trim();
      const subject = String(payload.subject ?? '').trim();
      const body = String(payload.body ?? '').trim();
      const documentIds = Array.isArray(payload.documentIds) ? payload.documentIds.map(String) : [];
      const force = payload.force === true;
      const resendFromLogId = payload.resendFromLogId ?? null;

      // Duplicate guard
      const normalizedTo = to.toLowerCase();
      const now = Date.now();
      const tenMinutesAgo = now - 10 * 60 * 1000;
      const { data: recentRows } = await supabase
        .from('document_email_log')
        .select('document_ids,to_email,sent_at,error,status')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(50);

      const duplicate = (recentRows ?? []).some((row) => {
        if (row.error) return false;
        const status = (row.status || '').toLowerCase();
        if (!/(sent|success|ok)/.test(status)) return false;
        if (
          String(row.to_email ?? '')
            .trim()
            .toLowerCase() !== normalizedTo
        )
          return false;
        if (new Date(row.sent_at).getTime() < tenMinutesAgo) return false;
        const sentDocIds = Array.isArray(row.document_ids) ? row.document_ids.map(String) : [];
        return sentDocIds.some((id) => documentIds.includes(id));
      });

      if (duplicate && !force) {
        return jsonErr(
          'Recently sent these documents to this recipient. Confirm resend to proceed.',
          { status: 409, code: 'DUPLICATE_RECENT_SEND' },
        );
      }

      // Ensure lead is accessible (RLS)
      const { data: lead, error: leadErr } = await supabase
        .from('leads')
        .select('id,email')
        .eq('id', leadId)
        .maybeSingle();

      if (leadErr) {
        return jsonErr(safeErrorMessage(leadErr), { status: 500, code: 'INTERNAL_ERROR' });
      }
      if (!lead) {
        return jsonErr('Lead not found or you do not have access', { status: 404 });
      }

      // Fetch docs (support both file_name + filename; mime_type + content_type)
      const { data: docsRaw, error: docsErr } = await supabase
        .from('documents')
        .select('id,file_name,filename,storage_path,mime_type,content_type')
        .in('id', documentIds);

      if (docsErr) {
        return jsonErr(safeErrorMessage(docsErr), { status: 500, code: 'INTERNAL_ERROR' });
      }

      const docs = Array.isArray(docsRaw) ? (docsRaw as any[]) : [];
      if (docs.length !== documentIds.length) {
        return jsonErr('One or more documents could not be found', {
          status: 400,
          code: 'VALIDATION_ERROR',
        });
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
          return jsonErr(`Document missing storage_path: ${filename}`, {
            status: 500,
            code: 'INTERNAL_ERROR',
          });
        }

        const { data, error } = await supabase.storage.from(BUCKET_ID).download(storagePath);
        if (error || !data) {
          return jsonErr(`Failed to download attachment: ${filename}`, {
            status: 500,
            code: 'INTERNAL_ERROR',
          });
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

        // Activity logging
        const activityType = resendFromLogId ? 'email_resent' : 'email_sent';
        const activityBody = resendFromLogId
          ? `Resent from history log ${resendFromLogId}. Subject: "${subject}". To: ${to}. Attachments: ${documentIds.join(', ')}`
          : `Subject: "${subject}". To: ${to}. Attachments: ${documentIds.join(', ')}`;

        await supabase.from('lead_activity').insert([
          {
            lead_id: leadId,
            user_id: user.id,
            type: activityType,
            body: activityBody,
          },
        ]);

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

        return jsonOk({
          messageId: messageId ?? null,
          activityLogged,
          activityError: activityLogged ? null : (activityError ?? null),
        });
      } catch (e: any) {
        const errMsg = safeErrorMessage(e) || 'Failed to send email';

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

        return jsonErr(errMsg, { status: 500, code: 'INTERNAL_ERROR' });
      }
    },
  );
}
