import { createSupabaseServerClient } from '@/lib/supabase-server';
import { UserRole } from '@/lib/getUserProfile';

export async function listDocuments(_userId: string, _role: UserRole) {
  const supabase = await createSupabaseServerClient();
  // Anyone authenticated can select
  return supabase.from('documents').select('*').order('created_at', { ascending: false });
}

export async function uploadDocumentToStorage(file: File, metadata: { filename: string; content_type: string; uploaded_by: string }) {
  const supabase = await createSupabaseServerClient();
  const documentId = crypto.randomUUID();
  const storagePath = `${documentId}/${metadata.filename}`;
  const { error } = await supabase.storage.from('documents').upload(storagePath, file, {
    contentType: metadata.content_type,
    upsert: false,
  });
  if (error) throw error;
  return { documentId, storagePath };
}

export async function createDocumentRecord(metadata: { id: string; filename: string; storage_path: string; content_type: string; size_bytes: number; uploaded_by: string }) {
  const supabase = await createSupabaseServerClient();
  return supabase.from('documents').insert([metadata]).select().single();
}

export async function getSignedDocumentUrl(storage_path: string, expiresSeconds: number = 60) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage.from('documents').createSignedUrl(storage_path, expiresSeconds);
  return data?.signedUrl ?? null; // Using optional chaining and nullish coalescing
}

export async function deleteDocument(documentId: string) {
  const supabase = await createSupabaseServerClient();
  // Get document row
  const { data: doc } = await supabase.from('documents').select('*').eq('id', documentId).maybeSingle();
  if (!doc) throw new Error('Document not found');
  // Delete from storage
  await supabase.storage.from('documents').remove([doc.storage_path]);
  // Delete from DB
  return supabase.from('documents').delete().eq('id', documentId);
}
