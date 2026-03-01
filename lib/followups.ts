import { createSupabaseServerClient } from '@/lib/supabase-server';
import { UserRole } from '@/lib/getUserProfile';

export async function getFollowUpQueue(userId: string, role: UserRole) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('leads')
    .select('*')
    .order('follow_up_date', { ascending: true })
    .limit(10);
  if (role === 'admin') {
    // Admin sees all
    return (await query).data ?? [];
  } else {
    // User/manager: only assigned leads
    query = query.eq('assigned_user_id', userId);
    return (await query).data ?? [];
  }
}

export async function getManagerMissedQueue(userId: string, role: UserRole) {
  if (role !== 'admin' && role !== 'manager') return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('missed_followups')
    .select('*')
    .order('days_overdue', { ascending: false })
    .order('follow_up_date', { ascending: true });
  return data ?? [];
}

export function computeFollowUpLabel(follow_up_date: string | null): { label: string; kind: 'overdue' | 'today' | 'upcoming' | 'none' } {
  if (!follow_up_date) return { label: '', kind: 'none' };
  const now = new Date();
  const date = new Date(follow_up_date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (due < today) return { label: 'Overdue', kind: 'overdue' };
  if (due.getTime() === today.getTime()) return { label: 'Due Today', kind: 'today' };
  return { label: 'Upcoming', kind: 'upcoming' };
}
