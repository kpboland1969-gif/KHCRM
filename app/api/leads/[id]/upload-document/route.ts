import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export async function POST(request: Request, context: RouteContext) {
  const { id: leadId } = await context.params;
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
    .select('id, role, disabled')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.disabled) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, assigned_user_id')
    .eq('id', leadId)
    .maybeSingle();

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const canUpload =
    profile.role === 'admin' || profile.role === 'manager' || lead.assigned_user_id === user.id;

  if (!canUpload) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const fileEntry = formData.get('file');

  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  if (!isPdf(fileEntry)) {
    return NextResponse.json({ error: 'Only PDF uploads are allowed' }, { status: 400 });
  }

  if (fileEntry.size <= 0) {
    return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 });
  }

  const safeName = fileEntry.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${leadId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('lead_uploads')
    .upload(storagePath, fileEntry, {
      contentType: fileEntry.type || 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: insertError } = await supabase.from('lead_uploaded_documents').insert({
    lead_id: leadId,
    filename: fileEntry.name,
    storage_bucket: 'lead_uploads',
    storage_path: storagePath,
    content_type: fileEntry.type || 'application/pdf',
    size_bytes: fileEntry.size,
    uploaded_by: user.id,
  });

  if (insertError) {
    await supabase.storage.from('lead_uploads').remove([storagePath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
