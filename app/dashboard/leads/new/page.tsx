import { getUserProfile } from '@/lib/getUserProfile';
import CreateLeadFormClient from '@/app/components/leads/CreateLeadFormClient';

export default async function NewLeadPage() {
  const profile = await getUserProfile();
  if (!profile) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">New Lead</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Please log in.</p>
      </div>
    );
  }
  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">Create Lead</h1>
      <CreateLeadFormClient userId={profile.id} />
    </div>
  );
}
