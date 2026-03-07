import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
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
    .select('id, lead_id, filename, storage_bucket, storage_path')
    .eq('id', documentId)
    .maybeSingle();

  if (docError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  if (profile.role === 'user') {
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, assigned_user_id')
      .eq('id', doc.lead_id)
      .maybeSingle();

    if (leadError || !lead || lead.assigned_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const bucket = doc.storage_bucket || 'lead_uploads';

  const { data: signed, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(doc.storage_path, 60);

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json(
      { error: signedError?.message || 'Failed to create download URL' },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl, 303);
}
