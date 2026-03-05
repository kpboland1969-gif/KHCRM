import { requireAdmin } from '@/lib/api/adminGuard';
import { jsonOk, jsonErr, safeErrorMessage } from '@/lib/api/response';

type Body = {
  full_name?: string;
  role?: 'admin' | 'user';
  disabled?: boolean;
};

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.res;

    const { supabase } = guard;
    const { id } = await context.params;

    let body: Body | null = null;
    try {
      body = (await req.json()) as Body;
    } catch {
      return jsonErr('Invalid JSON body', { status: 400, code: 'BAD_JSON' });
    }

    if (!id) return jsonErr('Missing user id', { status: 400, code: 'MISSING_ID' });

    const patch: Record<string, any> = {};
    if (body?.full_name !== undefined) patch.full_name = String(body.full_name);
    if (body?.role !== undefined) patch.role = body.role;
    if (body?.disabled !== undefined) patch.disabled = !!body.disabled;

    if (Object.keys(patch).length === 0) {
      return jsonErr('No fields provided', { status: 400, code: 'NO_FIELDS' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select('id,email,full_name,username,role,is_admin,disabled,created_at')
      .maybeSingle();

    if (error) return jsonErr(safeErrorMessage(error), { status: 500, code: 'DB_ERROR' });
    if (!data) return jsonErr('User not found', { status: 404, code: 'NOT_FOUND' });

    return jsonOk(data);
  } catch (e) {
    return jsonErr(safeErrorMessage(e), { status: 500, code: 'UNKNOWN' });
  }
}
