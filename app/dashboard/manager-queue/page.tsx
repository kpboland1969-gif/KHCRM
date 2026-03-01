import { getUserProfile } from '@/lib/getUserProfile';
import { getManagerMissedQueue } from '@/lib/followups';
import ManagerQueueTable from '@/app/components/leads/ManagerQueueTable';

export default async function ManagerQueuePage() {
  const profile = await getUserProfile();
  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    return <div>Access denied.</div>;
  }
  const leads = await getManagerMissedQueue(profile.id, profile.role);
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Missed Follow-Ups (Manager Queue)</h1>
      <ManagerQueueTable leads={leads} />
    </div>
  );
}
