import LogoutButton from './_components/LogoutButton';
import SidebarLayout from '../components/SidebarLayout';
import { getUserProfile } from '@/lib/getUserProfile';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getUserProfile();
  // Get server user info
  let user = null;
  if (profile) {
    user = { id: profile.id, email: profile.email };
  }
  return (
    <div className="crm-shell">
      <SidebarLayout profile={profile}>
        <div className="mb-4 flex items-center justify-end">
          <LogoutButton />
        </div>
        {children}
        <footer className="mt-8">
          <div className="text-sm text-white/80">
            {user ? (
              <>
                <div>{profile?.full_name || user.email || 'Signed in'}</div>
                <div className="text-xs text-white/50">{profile?.role || 'no-role'}</div>
                <div className="text-[10px] text-white/40">server user: {user.id}</div>
              </>
            ) : (
              <>
                <div>Not signed in</div>
                <div className="text-[10px] text-red-300">server user: none</div>
              </>
            )}
          </div>
        </footer>
      </SidebarLayout>
    </div>
  );
}
