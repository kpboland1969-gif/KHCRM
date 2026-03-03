import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type ActivityRow = {
  id: string;
  type: string;
  body: string;
  created_at: string;
  user_id: string | null;
};

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await context.params;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('lead_activity')
    .select('id,type,body,created_at,user_id')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const rows = (data ?? []) as ActivityRow[];
  // No profiles join, so just return user_id and body
  return NextResponse.json({ ok: true, items: rows });
}
