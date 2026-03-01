import nodemailer from 'nodemailer';

export async function sendEmailSMTP({ to, subject, html, text, attachmentUrl, attachmentName }: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}) {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT!);
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;
  const from = process.env.SMTP_FROM || user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const mailOptions: any = {
    from,
    to,
    subject,
    html,
    text,
  };
  if (attachmentUrl && attachmentName) {
    mailOptions.attachments = [{ filename: attachmentName, path: attachmentUrl }];
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, info };
  } catch (error) {
    return { success: false, error };
  }
}
