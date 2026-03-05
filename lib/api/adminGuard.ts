import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { jsonErr } from '@/lib/api/response';

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false as const,
      res: jsonErr('Not authenticated', { status: 401, code: 'UNAUTHENTICATED' }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,is_admin,role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false as const,
      res: jsonErr('Failed to load profile', { status: 500, code: 'PROFILE_LOOKUP_FAILED' }),
    };
  }

  const isAdmin = !!profile?.is_admin || profile?.role === 'admin';
  if (!isAdmin) {
    return { ok: false as const, res: jsonErr('Forbidden', { status: 403, code: 'FORBIDDEN' }) };
  }

  return { ok: true as const, supabase, user, profile };
}
