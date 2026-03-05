import { requireAdmin } from '@/lib/api/adminGuard';
import { jsonOk, jsonErr, safeErrorMessage } from '@/lib/api/response';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.res;

    const { id } = await context.params;
    if (!id) return jsonErr('Missing user id', { status: 400, code: 'MISSING_ID' });

    // Fetch user email from profiles
    const { supabase } = guard;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id,email')
      .eq('id', id)
      .maybeSingle();

    if (profileError) {
      return jsonErr(safeErrorMessage(profileError), { status: 500, code: 'DB_ERROR' });
    }
    if (!profile?.email) {
      return jsonErr('User email not found', { status: 404, code: 'NOT_FOUND' });
    }

    // Use Supabase admin client to generate a password reset link (Supabase v2)
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: profile.email,
    });
    if (error) {
      return jsonErr(safeErrorMessage(error), { status: 500, code: 'INVITE_FAILED' });
    }

    // Optionally, you can return the link or just success
    return jsonOk({ id });
  } catch (e) {
    return jsonErr(safeErrorMessage(e), { status: 500, code: 'UNKNOWN' });
  }
}
