import SidebarLayout from '../components/SidebarLayout';
import { getUserProfile } from '@/lib/getUserProfile';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getUserProfile();
  return (
    <div className="crm-shell">
      <SidebarLayout profile={profile}>{children}</SidebarLayout>
    </div>
  );
}
