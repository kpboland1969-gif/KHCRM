import LogoutButton from './_components/LogoutButton';
import SidebarLayout from '../components/SidebarLayout';
import { getUserProfile } from '@/lib/getUserProfile';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getUserProfile();
  return (
    <div className="crm-shell">
      <SidebarLayout profile={profile}>
        <div className="mb-4 flex items-center justify-end">
          <LogoutButton />
        </div>
        {children}
      </SidebarLayout>
    </div>
  );
}
