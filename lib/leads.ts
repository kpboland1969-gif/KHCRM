import { createSupabaseServerClient } from '@/lib/supabase-server';
import { UserRole } from '@/lib/getUserProfile';
import { addTouchNote, addFollowUpSetNote } from './notes';

export async function getDashboardStats(userId: string, role: UserRole) {
  const supabase = await createSupabaseServerClient();
  const isAdmin = role === 'admin';
  const leadFilter = isAdmin ? {} : { assigned_user_id: userId };

  const [total, followup, warm, clients] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true, ...leadFilter }),
    supabase.from('leads').select('id', { count: 'exact', head: true, ...leadFilter }).lte('follow_up_date', new Date().toISOString()),
    supabase.from('leads').select('id', { count: 'exact', head: true, ...leadFilter }).eq('status', 'warm_lead'),
    supabase.from('leads').select('id', { count: 'exact', head: true, ...leadFilter }).eq('status', 'client'),
  ]);

  return {
    total: total.count ?? 0,
    followup: followup.count ?? 0,
    warm: warm.count ?? 0,
    clients: clients.count ?? 0,
  };
}

export async function getAssignedLeads(userId: string, role: UserRole) {
  const supabase = await createSupabaseServerClient();
  const isAdmin = role === 'admin';
  let query = supabase.from('leads').select('*');
  if (!isAdmin) {
    query = query.eq('assigned_user_id', userId);
  }
  return query.order('follow_up_date', { ascending: true });
}

export async function createLead(data: any) {
  const supabase = await createSupabaseServerClient();
  return supabase.from('leads').insert([data]).select().single();
}

export async function getLeadById(id: string, userId: string, role: UserRole) {
  const supabase = await createSupabaseServerClient();
  const isAdmin = role === 'admin';
  let query = supabase.from('leads').select('*').eq('id', id);
  if (!isAdmin) {
    query = query.eq('assigned_user_id', userId);
  }
  return query.maybeSingle();
}

// PHASE 5: Follow-Up Engine
export async function markLeadTouched(leadId: string, userId: string, username: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from('leads').update({
    last_touched_at: new Date().toISOString(),
    last_touched_by: userId,
    updated_at: new Date().toISOString(),
  }).eq('id', leadId);
  await addTouchNote(leadId, userId, username);
}

export async function updateLeadFollowUp(leadId: string, userId: string, username: string, followUpDate: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from('leads').update({
    follow_up_date: followUpDate,
    updated_at: new Date().toISOString(),
  }).eq('id', leadId);
  await addFollowUpSetNote(leadId, userId, username, followUpDate);
}
