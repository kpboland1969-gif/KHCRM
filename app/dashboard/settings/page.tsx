import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function formatDate(date: string) {
  if (!date) return '';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return <div className="p-8 text-center text-lg text-white/80">Not authenticated</div>;
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_admin, role')
    .eq('id', user.id)
    .single();
  if (!profile || !(profile.is_admin || profile.role === 'admin')) {
    return <div className="p-8 text-center text-lg text-white/80">Not authorized</div>;
    // Or: notFound();
  }
  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, username, email, role, is_admin, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="max-w-4xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-2 text-white">Settings (admin only)</h1>
      <div className="mb-4 text-sm text-white/60">
        User accounts are created in Supabase Auth. This screen manages profile metadata.
      </div>
      <h2 className="text-lg font-semibold mb-4 text-white">User Management</h2>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <table className="w-full text-sm text-white">
          <thead>
            <tr className="border-b border-white/10">
              <th className="py-2 text-left">Name</th>
              <th className="py-2 text-left">Email</th>
              <th className="py-2 text-left">Role</th>
              <th className="py-2 text-left">Created</th>
              <th className="py-2 text-left">ID</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u: any) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/10">
                <td className="py-2">{u.full_name || u.username || u.email || u.id.slice(0, 8)}</td>
                <td className="py-2">{u.email || ''}</td>
                <td className="py-2">{u.is_admin || u.role === 'admin' ? 'admin' : 'user'}</td>
                <td className="py-2">{formatDate(u.created_at)}</td>
                <td className="py-2 font-mono text-xs">{u.id.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
