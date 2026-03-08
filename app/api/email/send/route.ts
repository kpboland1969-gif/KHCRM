import 'server-only';

import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendEmailSMTP } from '@/lib/email';
import { jsonOk, jsonErr, safeErrorMessage } from '@/lib/api/response';
import { withRequestLogging } from '@/lib/api/requestLogger';

export const runtime = 'nodejs';

const BUCKET_ID = 'documents';

type SendEmailBody = {
  leadId: string;
  to: string;
  subject: string;
  body: string;
  documentIds: string[];
  force?: boolean;
  resendFromLogId?: string | null;
};

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function parsePayload(payload: unknown): SendEmailBody | null {
  if (!payload || typeof payload !== 'object') return null;

  const raw = payload as Record<string, unknown>;

  const leadId = String(raw.leadId ?? '').trim();
  const to = String(raw.to ?? '').trim();
  const subject = String(raw.subject ?? '').trim();
  const body = String(raw.body ?? '').trim();
  const documentIds = Array.isArray(raw.documentIds) ? raw.documentIds.map(String) : [];
  const force = raw.force === true;
  const resendFromLogId =
    raw.resendFromLogId === null || raw.resendFromLogId === undefined
      ? null
      : String(raw.resendFromLogId).trim();

  if (!leadId || !isUuidLike(leadId)) return null;
  if (!to) return null;
  if (!subject) return null;
  if (!body) return null;

  return {
    leadId,
    to,
    subject,
    body,
    documentIds,
    force,
    resendFromLogId,
  };
}

async function logEmailAudit(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  leadId: string;
  documentIds: string[];
  to: string;
  subject: string;
  body: string;
  sentBy: string;
  status: 'sent' | 'failed';
  providerMessageId: string | null;
  error: string | null;
}) {
  const {
    supabase,
    leadId,
    documentIds,
    to,
    subject,
    body,
    sentBy,
    status,
    providerMessageId,
    error,
  } = params;

  try {
    await supabase.from('document_email_log').insert([
      {
        lead_id: leadId,
        document_ids: documentIds,
        to_email: to,
        subject,
        body,
        sent_by: sentBy,
        status,
        provider_message_id: providerMessageId,
        error,
      },
    ]);
  } catch {
    // best-effort audit log
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonErr('Unauthorized', { status: 401, code: 'UNAUTHORIZED' });
  }

  const { rateLimit } = await import('@/lib/api/rateLimit');
  const rateLimitKey = `email_send:${user.id}`;
  const rl = rateLimit({ key: rateLimitKey, limit: 10, windowMs: 60_000 });

  if (!rl.allowed) {
    const res = jsonErr('Too many email send attempts. Please wait and try again.', {
      status: 429,
      code: 'RATE_LIMITED',
    });

    if (rl.retryAfterSeconds) {
      res.headers.set('Retry-After', rl.retryAfterSeconds.toString());
    }

    return res;
  }

  const rawPayload = (await req.json().catch(() => null)) as unknown;
  const parsed = parsePayload(rawPayload);

  if (!parsed) {
    return jsonErr('Invalid request body', { status: 400, code: 'VALIDATION_ERROR' });
  }

  const { leadId, to, subject, body, documentIds, force, resendFromLogId } = parsed;

  return withRequestLogging(
    {
      route: 'email_send',
      userId: user.id,
      leadId,
    },
    async () => {
      const normalizedTo = to.toLowerCase();
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

      const { data: recentRows, error: recentRowsError } = await supabase
        .from('document_email_log')
        .select('document_ids,to_email,sent_at,error,status')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (recentRowsError) {
        return jsonErr(safeErrorMessage(recentRowsError), {
          status: 500,
          code: 'INTERNAL_ERROR',
        });
      }

      const duplicate = (recentRows ?? []).some((row) => {
        if (row.error) return false;

        const statusValue = String(row.status ?? '').toLowerCase();
        if (!/(sent|success|ok)/.test(statusValue)) return false;

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
          {
            status: 409,
            code: 'DUPLICATE_RECENT_SEND',
          },
        );
      }

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

      const { data: docsRaw, error: docsErr } = await supabase
        .from('documents')
        .select('id,file_name,filename,storage_path,mime_type,content_type')
        .in('id', documentIds);

      if (docsErr) {
        return jsonErr(safeErrorMessage(docsErr), { status: 500, code: 'INTERNAL_ERROR' });
      }

      const docs = Array.isArray(docsRaw) ? docsRaw : [];

      if (docs.length !== documentIds.length) {
        return jsonErr('One or more documents could not be found', {
          status: 400,
          code: 'VALIDATION_ERROR',
        });
      }

      const attachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [];
      const attachmentNames: string[] = [];

      for (const doc of docs) {
        const storagePath = String(doc.storage_path ?? '');
        const filename = String(doc.file_name ?? doc.filename ?? 'Document');
        const contentType = doc.content_type
          ? String(doc.content_type)
          : doc.mime_type
            ? String(doc.mime_type)
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

        const arrayBuffer = await data.arrayBuffer();

        attachments.push({
          filename,
          content: Buffer.from(arrayBuffer),
          contentType,
        });

        attachmentNames.push(filename);
      }

      try {
        const { messageId } = await sendEmailSMTP({
          to,
          subject,
          text: body,
          attachments,
        });

        const activityType = resendFromLogId ? 'email_resent' : 'email_sent';

        const activityBody = [
          resendFromLogId ? `Email resent to: ${to}` : `Email sent to: ${to}`,
          `Subject: ${subject}`,
          `Attachments: ${attachmentNames.length ? attachmentNames.join(', ') : '(none)'}`,
          '',
          body,
        ].join('\n');

        let activityLogged = false;
        let activityError: string | null = null;

        const activityInsert = await supabase.from('lead_activity').insert([
          {
            lead_id: leadId,
            user_id: user.id,
            type: activityType,
            body: activityBody,
          },
        ]);

        if (activityInsert.error) {
          console.error('[EmailSend] lead_activity insert error:', activityInsert.error);
          activityError = safeErrorMessage(activityInsert.error);
        } else {
          activityLogged = true;
        }

        await logEmailAudit({
          supabase,
          leadId,
          documentIds,
          to,
          subject,
          body,
          sentBy: user.id,
          status: 'sent',
          providerMessageId: messageId ?? null,
          error: null,
        });

        return jsonOk({
          messageId: messageId ?? null,
          activityLogged,
          activityError,
        });
      } catch (error: unknown) {
        const errMsg = safeErrorMessage(error) || 'Failed to send email';

        await logEmailAudit({
          supabase,
          leadId,
          documentIds,
          to,
          subject,
          body,
          sentBy: user.id,
          status: 'failed',
          providerMessageId: null,
          error: errMsg,
        });

        return jsonErr(errMsg, { status: 500, code: 'INTERNAL_ERROR' });
      }
    },
  );
}
