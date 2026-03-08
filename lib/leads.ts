import { createSupabaseServerClient } from '@/lib/supabase-server';
import { UserRole } from '@/lib/getUserProfile';
import { addTouchNote, addFollowUpSetNote } from './notes';

export async function getDashboardStats(userId: string, role: UserRole) {
  const supabase = await createSupabaseServerClient();
  const isAdmin = role === 'admin';
  const leadFilter = isAdmin ? {} : { assigned_user_id: userId };

  const nowIso = new Date().toISOString();
  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [total, followup, warm, clients, newThisWeek, overdueFollowups, unassigned] =
    await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true, ...leadFilter }),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true, ...leadFilter })
        .lte('follow_up_date', nowIso),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true, ...leadFilter })
        .eq('status', 'warm_lead'),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true, ...leadFilter })
        .eq('status', 'client'),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true, ...leadFilter })
        .gte('created_at', weekAgoIso),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true, ...leadFilter })
        .lt('follow_up_date', nowIso)
        .neq('status', 'client'),
      isAdmin
        ? supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .is('assigned_user_id', null)
        : Promise.resolve({ count: 0 } as { count: number | null }),
    ]);

  const totalCount = total.count ?? 0;
  const clientsCount = clients.count ?? 0;

  return {
    total: totalCount,
    followup: followup.count ?? 0,
    warm: warm.count ?? 0,
    clients: clientsCount,
    newThisWeek: newThisWeek.count ?? 0,
    overdueFollowups: overdueFollowups.count ?? 0,
    unassigned: unassigned.count ?? 0,
    conversionRate: totalCount > 0 ? Math.round((clientsCount / totalCount) * 100) : 0,
  };
}

export async function getAssignedLeads(userId: string, role: UserRole) {
  const supabase = await createSupabaseServerClient();
  const isAdmin = role === 'admin';

  let query = supabase.from('leads').select(
    `
      id,
      company_name,
      contact_person,
      status,
      follow_up_date,
      assigned_user_id,
      assigned_user:profiles!leads_assigned_user_id_fkey(id, full_name, username)
    `,
  );

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

export async function markLeadTouched(leadId: string, userId: string, username: string) {
  const supabase = await createSupabaseServerClient();

  await supabase
    .from('leads')
    .update({
      last_touched_at: new Date().toISOString(),
      last_touched_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  await addTouchNote(leadId, userId, username);
}

export async function updateLeadFollowUp(
  leadId: string,
  userId: string,
  username: string,
  followUpDate: string,
) {
  const supabase = await createSupabaseServerClient();

  await supabase
    .from('leads')
    .update({
      follow_up_date: followUpDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  await addFollowUpSetNote(leadId, userId, username, followUpDate);
}

export async function listLeadsPaged({
  userId,
  role,
  page = 1,
  pageSize = 25,
  sort = 'followup',
  dir = 'asc',
  status,
  industry,
  dueOnly,
  q,
}: {
  userId: string;
  role: string;
  page?: number;
  pageSize?: number;
  sort?: 'followup' | 'created' | 'company';
  dir?: 'asc' | 'desc';
  status?: string;
  industry?: string;
  dueOnly?: boolean;
  q?: string;
}) {
  const supabase = await createSupabaseServerClient();

  let query = supabase.from('leads').select('*', { count: 'exact' });

  if (role !== 'admin') {
    query = query.eq('assigned_user_id', userId);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (industry && industry !== 'all') {
    query = query.eq('industry', industry);
  }

  if (dueOnly) {
    query = query.lte('follow_up_date', new Date().toISOString());
  }

  if (q && q.length >= 2) {
    const pattern = `%${q}%`;
    query = query.or(
      `company_name.ilike.${pattern},contact_person.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`,
    );
  }

  if (sort === 'followup') {
    query = query
      .order('follow_up_date', { ascending: dir === 'asc', nullsFirst: false })
      .order('id');
  } else if (sort === 'created') {
    query = query.order('created_at', { ascending: dir === 'asc' }).order('id');
  } else if (sort === 'company') {
    query = query.order('company_name', { ascending: dir === 'asc' }).order('id');
  }

  const safePageSize = Math.max(1, Math.min(pageSize, 100));
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  query = query.range(from, to);

  const { data: leads, count: total, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return {
    leads: leads ?? [],
    total: total ?? 0,
  };
}
