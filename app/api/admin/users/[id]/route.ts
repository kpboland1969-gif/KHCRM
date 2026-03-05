import { NextRequest } from 'next/server';
import { jsonOk, jsonErr, safeErrorMessage } from '../../../../../lib/api/response';
import { createSupabaseServerClient } from '@/lib/supabase-server';

async function requireAdmin(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, username, role, is_admin, created_at')
    .eq('id', user.id)
    .single();
  if (!profile || !(profile.is_admin || profile.role === 'admin')) return null;
  return { user, profile };
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return jsonErr('Not authorized', { status: 403 });
    const { id: userId } = await context.params;
    const body = await req.json();
    const supabase = await createSupabaseServerClient();
    // Supabase does not support disabling users directly via admin API.
    // You may need to set a custom field or block sign-in via RLS or metadata.
    // Handle role change
    if (body.role === 'admin' || body.role === 'user') {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: body.role,
          is_admin: body.role === 'admin',
        })
        .eq('id', userId);
      if (profileError) return jsonErr(safeErrorMessage(profileError), { status: 500 });
    }
    // Handle profile updates
    const profileFields: any = {};
    if (body.fullName) profileFields.full_name = body.fullName;
    if (body.username) profileFields.username = body.username;
    if (Object.keys(profileFields).length) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileFields)
        .eq('id', userId);
      if (profileError) return jsonErr(safeErrorMessage(profileError), { status: 500 });
    }
    return jsonOk({ ok: true });
  } catch (e: any) {
    return jsonErr(safeErrorMessage(e), { status: 500 });
  }
}
