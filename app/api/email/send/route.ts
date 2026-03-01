import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/getUserProfile';
import { sendEmailSMTP } from '@/lib/email';
import { getSignedDocumentUrl } from '@/lib/documents';
import { addEmailNote, addSystemNote } from '@/lib/notes';

export async function POST(req: NextRequest) {
  const profile = await getUserProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { leadId, to, subject, message, documentId } = body;
  let attachmentUrl, attachmentName;
  if (documentId) {
    // Fetch document metadata and signed URL
    // (Assume you have a function to get document by id, or fetch from DB)
    // For brevity, just use documentId as storage_path
    attachmentUrl = await getSignedDocumentUrl(documentId, 300);
    attachmentName = 'attachment';
  }
  const result = await sendEmailSMTP({
    to,
    subject,
    html: message,
    attachmentUrl,
    attachmentName,
  });
  if (result.success) {
    await addEmailNote(leadId, profile.id, `Email sent to ${to}\nSubject: ${subject}\nBody: ${message.substring(0, 100)}${attachmentName ? `\nAttachment: ${attachmentName}` : ''}`);
    return NextResponse.json({ success: true });
  } else {
    await addSystemNote(leadId, profile.id, `Email send failed: ${result.error}`);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
