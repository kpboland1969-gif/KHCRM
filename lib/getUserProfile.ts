import { createSupabaseServerClient, getServerUser } from '@/lib/supabase/server';

export type UserRole = 'admin' | 'user' | 'manager';

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
};

export async function getUserProfile(): Promise<UserProfile | null> {
  const authUser = await getServerUser();
  if (!authUser) return null;

  const supabase = await createSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,email,username,full_name,role')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) {
    const email = authUser.email ?? '';
    const username = email.split('@')[0] ?? 'user';

    return {
      id: authUser.id,
      email,
      username,
      full_name: username,
      role: 'user',
    };
  }

  if (!profile) {
    const email = authUser.email ?? '';
    const username = email.split('@')[0] ?? 'user';

    return {
      id: authUser.id,
      email,
      username,
      full_name: username,
      role: 'user',
    };
  }

  return profile as UserProfile;
}
