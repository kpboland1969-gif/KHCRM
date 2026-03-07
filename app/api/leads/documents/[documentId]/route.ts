import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

export async function DELETE(_req: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, disabled')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.disabled) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: doc, error: docError } = await supabase
    .from('lead_uploaded_documents')
    .select('id, uploaded_by, storage_bucket, storage_path')
    .eq('id', documentId)
    .maybeSingle();

  if (docError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const canDelete =
    profile.role === 'admin' || profile.role === 'manager' || doc.uploaded_by === user.id;

  if (!canDelete) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const bucket = doc.storage_bucket || 'lead_uploads';

  const { error: storageError } = await supabase.storage.from(bucket).remove([doc.storage_path]);

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from('lead_uploaded_documents')
    .delete()
    .eq('id', documentId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
