import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/getUserProfile';
import { uploadDocumentToStorage, createDocumentRecord } from '@/lib/documents';

export async function POST(req: NextRequest) {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  const { documentId, storagePath } = await uploadDocumentToStorage(file, {
    filename: file.name,
    content_type: file.type,
    uploaded_by: profile.id,
  });
  const { data, error } = await createDocumentRecord({
    id: documentId,
    filename: file.name,
    storage_path: storagePath,
    content_type: file.type,
    size_bytes: file.size,
    uploaded_by: profile.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data });
}
