import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id || !isUuidLike(id)) {
    return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data: lead, error } = await supabase.from('leads').select('*').eq('id', id).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, lead });
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id || !isUuidLike(id)) {
    return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('leads').update(body).eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
