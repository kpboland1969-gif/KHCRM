import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function isUuid(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const leadId = id;
  if (!isUuid(leadId)) {
    return NextResponse.json({ ok: false, error: 'Invalid lead id' }, { status: 400 });
  }

  const { message } = await req.json();
  if (!message || typeof message !== 'string' || !message.trim() || message.length > 2000) {
    return NextResponse.json({ ok: false, error: 'Invalid message' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Confirm lead is accessible (RLS enforced)
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  // Insert note
  const { error: insertError } = await supabase.from('lead_activity').insert([
    {
      lead_id: leadId,
      type: 'note',
      body: message.trim(),
      user_id: user.id,
    },
  ]);

  if (insertError) {
    return NextResponse.json({ ok: false, error: 'Failed to add note' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
