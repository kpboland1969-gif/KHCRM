// lib/server/leads/getLeadById.ts
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { LeadRow } from '@/types/leads';
import { isValidUUID } from '@/lib/validate';

export async function getLeadById(id: string): Promise<LeadRow | null> {
  if (!isValidUUID(id)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as LeadRow;
}
