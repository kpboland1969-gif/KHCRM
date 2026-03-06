import { createSupabaseServerClient } from '@/lib/supabase-server';

export type UserRole = 'admin' | 'user' | 'manager';

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
};

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,email,username,full_name,role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    const email = user.email ?? '';
    const username = email.split('@')[0] ?? 'user';
    return {
      id: user.id,
      email,
      username,
      full_name: username,
      role: 'user',
    };
  }

  return profile as UserProfile;
}
