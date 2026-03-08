import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(req: Request, context: RouteContext) {
  const { id: leadId } = await context.params;

  if (!leadId || !isUuidLike(leadId)) {
    return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: recentView, error: recentViewError } = await supabase
    .from('lead_activity')
    .select('id')
    .eq('lead_id', leadId)
    .eq('user_id', user.id)
    .eq('type', 'view')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1);

  if (recentViewError) {
    return NextResponse.json({ error: recentViewError.message }, { status: 500 });
  }

  if (Array.isArray(recentView) && recentView.length > 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { error: insertError } = await supabase.from('lead_activity').insert([
    {
      lead_id: leadId,
      user_id: user.id,
      type: 'view',
      body: null,
    },
  ]);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
