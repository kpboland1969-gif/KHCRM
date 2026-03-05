import { NextRequest } from 'next/server';
import { jsonOk, jsonErr, safeErrorMessage } from '../../../../lib/api/response';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// Helper to check admin status
async function requireAdmin(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  // Prefer is_admin, fallback to role
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, username, role, is_admin, created_at')
    .eq('id', user.id)
    .single();
  if (!profile || !(profile.is_admin || profile.role === 'admin')) return null;
  return { user, profile };
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return jsonErr('Not authorized', { status: 403 });
    const supabase = await createSupabaseServerClient();
    // Get all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, role, is_admin, created_at, email');
    if (error) return jsonErr(safeErrorMessage(error), { status: 500 });
    // TODO: Optionally fetch emails from auth.users if not in profiles
    return jsonOk({ users: profiles });
  } catch (e: any) {
    return jsonErr(safeErrorMessage(e), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
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
