import { jsonOk, jsonErr, safeErrorMessage } from '@/lib/api/response';
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
    return jsonErr('Unauthorized', { status: 401, code: 'UNAUTHORIZED' });
  }

  try {
    const { data, error } = await supabase
      .from('lead_activity')
      .select('id,type,body,created_at,user_id')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      return jsonErr(safeErrorMessage(error), { status: 400, code: 'VALIDATION_ERROR' });
    }

    const rows = (data ?? []) as ActivityRow[];
    return jsonOk(rows);
  } catch (e) {
    return jsonErr(safeErrorMessage(e), { status: 500, code: 'INTERNAL_ERROR' });
  }
}
