import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AssignableUser = { id: string; full_name: string | null; email: string | null };

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  const { data: users, error: usersErr } = await supabase
    .from('profiles')
    .select('id,full_name,email')
    .order('full_name', { ascending: true });
  if (usersErr) {
    return NextResponse.json({ ok: false, error: usersErr.message }, { status: 500 });
  }
  return NextResponse.json({ users: users ?? [] });
}
