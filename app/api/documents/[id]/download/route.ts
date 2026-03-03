import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const BUCKET_ID = 'documents';

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// Next.js 16+ may type params as Promise<...>
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const params = await Promise.resolve(context.params as any);
  const id = String(params?.id ?? '');

  if (!id || !isUuidLike(id)) {
    return NextResponse.json({ ok: false, error: 'Invalid document id' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Match your schema: file_name (required), storage_path (required)
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id,file_name,storage_path,mime_type,content_type')
    .eq('id', id)
    .maybeSingle();

  if (docErr) {
    return NextResponse.json({ ok: false, error: docErr.message }, { status: 500 });
  }
  if (!doc) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const storagePath = String((doc as any).storage_path ?? '');
  const fileName = String((doc as any).file_name ?? 'document');
  const contentType = (doc as any).content_type
    ? String((doc as any).content_type)
    : (doc as any).mime_type
      ? String((doc as any).mime_type)
      : 'application/octet-stream';

  const { data, error: dlErr } = await supabase.storage.from(BUCKET_ID).download(storagePath);

  if (dlErr || !data) {
    return NextResponse.json(
      { ok: false, error: dlErr?.message ?? 'Download failed' },
      { status: 500 },
    );
  }

  const ab = await data.arrayBuffer();

  return new NextResponse(Buffer.from(ab), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName.replace(/"/g, '')}"`,
    },
  });
}
