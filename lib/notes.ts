import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function getLeadNotes(leadId: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.from('lead_notes').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
}

export async function addSystemNote(leadId: string, userId: string, content: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.from('lead_notes').insert([
    { lead_id: leadId, user_id: userId, type: 'system', content }
  ]);
}

export async function addManualNote(leadId: string, userId: string, content: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.from('lead_notes').insert([
    { lead_id: leadId, user_id: userId, type: 'manual', content }
  ]);
}
