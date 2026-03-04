import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await context.params;

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userData?.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = userData.user.id;

  // Rate limiting (Phase 10.4)
  const { rateLimit } = await import('@/lib/api/rateLimit');
  const perLeadKey = `lead_view:${userId}:${leadId}`;
  const globalKey = `lead_view:${userId}`;
  const perLead = rateLimit({ key: perLeadKey, limit: 3, windowMs: 60_000 });
  const global = rateLimit({ key: globalKey, limit: 30, windowMs: 60_000 });
  if (!perLead.allowed || !global.allowed) {
    const retryAfterSeconds = Math.max(
      perLead.retryAfterSeconds ?? 1,
      global.retryAfterSeconds ?? 1,
    );
    const res = NextResponse.json(
      {
        ok: false,
        error: 'Too many view log attempts. Please wait and try again.',
        code: 'RATE_LIMITED',
      },
      { status: 429 },
    );
    res.headers.set('Retry-After', retryAfterSeconds.toString());
    return res;
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: lastView, error: lastViewErr } = await supabase
    .from('lead_activity')
    .select('id, created_at')
    .eq('lead_id', leadId)
    .eq('type', 'view')
    .eq('user_id', userId)
    .gte('created_at', tenMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastViewErr && lastView?.id) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const userAgent = req.headers.get('user-agent') ?? null;
  const referer = req.headers.get('referer') ?? null;

  const { error: insErr } = await supabase.from('lead_activity').insert({
    lead_id: leadId,
    type: 'view',
    body: null,
    user_id: userId,
  });

  if (insErr) {
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, skipped: false });
}
