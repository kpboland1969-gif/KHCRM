import LogoutButton from './_components/LogoutButton';
import SidebarLayout from '../components/SidebarLayout';
import { getUserProfile } from '@/lib/getUserProfile';
import { getServerUser } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [authUser, profile] = await Promise.all([getServerUser(), getUserProfile()]);

  return (
    <div className="crm-shell">
      <SidebarLayout profile={profile}>
        <div className="mb-4 flex items-center justify-end">
          <LogoutButton />
        </div>

        {children}

        <footer className="mt-8">
          <div className="text-sm text-white/80">
            {authUser ? (
              <>
                <div>{profile?.full_name || authUser.email || 'Signed in'}</div>
                <div className="text-xs text-white/50">{profile?.role || 'no-profile'}</div>
                <div className="text-[10px] text-white/40">server user: {authUser.id}</div>
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
