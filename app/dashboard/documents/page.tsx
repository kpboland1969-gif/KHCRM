import { getUserProfile } from '@/lib/getUserProfile';
import DocumentsClient from '../../components/documents/DocumentsClient';

export default async function DocumentsPage() {
  const profile = await getUserProfile();
  if (!profile) return null;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">Documents Library</h1>
      <DocumentsClient role={profile.role} userId={profile.id} />
    </div>
  );
}
