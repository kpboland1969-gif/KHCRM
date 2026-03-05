import { requireAdmin } from '@/lib/api/adminGuard';
import { jsonOk, jsonErr, safeErrorMessage } from '@/lib/api/response';

import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.res;

    const { supabase } = guard;

    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,username,role,is_admin,disabled,created_at')
      .order('created_at', { ascending: false });

    if (error) return jsonErr(safeErrorMessage(error), { status: 500, code: 'DB_ERROR' });
    return jsonOk(data ?? []);
  } catch (e) {
    return jsonErr(safeErrorMessage(e), { status: 500, code: 'UNKNOWN' });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonErr('Not authorized', { status: 403 });
    const body = await req.json();
    const { email, password, fullName, role } = body;
    if (!email || !password || !fullName || !role) {
      return jsonErr('Missing required fields', { status: 400 });
    }
    // Use Supabase Admin API to create user
    // TODO: Replace with actual admin client if available
    // For now, use server client (must have service role key for admin)
    const supabase = await createSupabaseServerClient();
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (userError || !user) return jsonErr(safeErrorMessage(userError), { status: 500 });
    // Upsert profile
    const username = email.split('@')[0];
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.user.id,
      full_name: fullName,
      username,
      role,
      is_admin: role === 'admin',
      email,
    });
    if (profileError) return jsonErr(safeErrorMessage(profileError), { status: 500 });
    return jsonOk({ userId: user.user.id });
  } catch (e: any) {
    return jsonErr(safeErrorMessage(e), { status: 500 });
  }
}
