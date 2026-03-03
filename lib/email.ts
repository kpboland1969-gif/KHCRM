import 'server-only';

export type SendEmailSMTPParams = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
};

/**
 * IMPORTANT:
 * We intentionally avoid `import nodemailer from "nodemailer"` here.
 * Turbopack on Windows can fail to resolve/bundle some Node-only deps under pnpm.
 * This runtime require keeps nodemailer server-only and avoids bundler resolution.
 */
function getNodemailer() {
  const _require = eval('require') as NodeRequire;

  return _require('nodemailer');
}

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function sendEmailSMTP(params: SendEmailSMTPParams) {
  const { to, subject, html, text, attachments } = params;

  const host = requiredEnv('SMTP_HOST');
  const port = Number(requiredEnv('SMTP_PORT'));
  const secure = String(process.env.SMTP_SECURE ?? 'true') === 'true';
  const user = requiredEnv('SMTP_USER');
  const pass = requiredEnv('SMTP_PASS');
  const from = requiredEnv('SMTP_FROM');

  const nodemailer = getNodemailer();

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text: text ?? (html ? undefined : ''),
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });

  return { messageId: info?.messageId ?? null };
}
