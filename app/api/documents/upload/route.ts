import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET_ID = 'documents';

function safePathSegment(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    // Admin gate (only admin can upload)
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json(
        { success: false, message: 'Profile lookup failed', error: profileErr },
        { status: 500 },
      );
    }

    const isAdmin = !!profile && (profile.is_admin === true || profile.role === 'admin');
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Only admin can upload documents' },
        { status: 403 },
      );
    }

    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'Missing file field (expected form-data key: file)' },
        { status: 400 },
      );
    }

    const originalName = (file.name || 'document').trim() || 'document';
    const fileName = originalName; // DB requires file_name NOT NULL
    const mimeType = (file.type || '').trim() || null;

    const bytes = Buffer.from(await file.arrayBuffer());
    const sizeBytes = bytes.byteLength;

    // unique storage path
    const storagePath = `${user.id}/${Date.now()}_${safePathSegment(originalName)}`;

    // Upload to Storage
    const { error: uploadErr } = await supabase.storage.from(BUCKET_ID).upload(storagePath, bytes, {
      contentType: mimeType ?? 'application/octet-stream',
      upsert: false,
    });

    if (uploadErr) {
      return NextResponse.json(
        { success: false, message: 'Storage upload failed', error: uploadErr },
        { status: 500 },
      );
    }

    // Insert DB row (match your schema: file_name, mime_type, etc.)
    const { data: docRow, error: docErr } = await supabase
      .from('documents')
      .insert([
        {
          file_name: fileName,
          // keep filename populated too for legacy reads (nullable column)
          filename: fileName,
          storage_path: storagePath,
          mime_type: mimeType,
          content_type: mimeType,
          size_bytes: sizeBytes,
          uploaded_by: user.id,
        },
      ])
      .select('id, file_name, storage_path')
      .single();

    if (docErr || !docRow) {
      // cleanup storage if DB insert fails
      await supabase.storage.from(BUCKET_ID).remove([storagePath]);
      return NextResponse.json(
        { success: false, message: 'DB insert failed', error: docErr },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      document: {
        id: docRow.id,
        file_name: docRow.file_name,
        storage_path: docRow.storage_path,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: 'Unexpected error', error: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
