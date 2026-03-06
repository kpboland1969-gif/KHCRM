import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import AdminUsersClient from './AdminUsersClient';

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-3 text-sm text-red-200">
          No server-side session found. You appear to be signed out on the server.
        </p>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,is_admin,role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = !!profile?.is_admin || profile?.role === 'admin';

  if (!isAdmin) {
    return <div className="p-6 text-white/80">Not authorized</div>;
  }

  return (
    <div className="p-6">
      <div className="text-xl font-semibold text-white">Settings (admin only)</div>
      <div className="mt-1 text-sm text-white/60">Manage users and access.</div>

      <div className="mt-6">
        <AdminUsersClient />
      </div>
    </div>
  );
}
// ...existing code above...
