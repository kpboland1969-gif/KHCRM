import { getUserProfile } from '@/lib/getUserProfile';
import LeadsFiltersClient from '@/app/components/leads/LeadsFiltersClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function LeadsPage() {
  const profile = await getUserProfile();

  if (!profile) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-white">Leads</h1>
        <p className="mt-3 text-sm text-red-200">
          No server-side session found. You appear to be signed out on the server.
        </p>
      </div>
    );
  }

  const supabase = await import('@/lib/supabase/server');
  const client = await supabase.createSupabaseServerClient();

  const { data: leads } = await client
    .from('leads')
    .select(`*, assigned_user:profiles!leads_assigned_user_id_fkey(id, full_name, username)`)
    .order('follow_up_date', { ascending: true });

  const sortedLeads = (leads || []).slice().sort((a, b) => {
    if (!a.follow_up_date) return 1;
    if (!b.follow_up_date) return -1;
    return new Date(a.follow_up_date).getTime() - new Date(b.follow_up_date).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        </div>

        <Link href="/dashboard/leads/new">
          <Button type="button">New Lead</Button>
        </Link>
      </div>

      <LeadsFiltersClient
        initialLeads={sortedLeads || []}
        currentUserId={profile.id}
        currentRole={profile.role}
      />
    </div>
  );
}
