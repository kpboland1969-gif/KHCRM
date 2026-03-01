export async function addEmailNote(leadId: string, userId: string, content: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.from('lead_notes').insert([
    { lead_id: leadId, user_id: userId, type: 'email', content }
  ]);
}

export async function addDocumentNote(leadId: string, userId: string, content: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.from('lead_notes').insert([
    { lead_id: leadId, user_id: userId, type: 'document', content }
  ]);
}
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

// PHASE 5: Follow-Up Engine
export async function addTouchNote(leadId: string, userId: string, username: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.from('lead_notes').insert([
    { lead_id: leadId, user_id: userId, type: 'system', content: `Lead touched by ${username}` }
  ]);
}

export async function addFollowUpSetNote(leadId: string, userId: string, username: string, followUpDate: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.from('lead_notes').insert([
    { lead_id: leadId, user_id: userId, type: 'system', content: `Follow-up set to ${followUpDate} by ${username}` }
  ]);
}
