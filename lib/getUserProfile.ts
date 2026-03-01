import { createSupabaseServerClient } from '@/lib/supabase-server';

export type UserRole = 'admin' | 'user' | 'manager';

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
};

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,email,username,role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    return {
      id: user.id,
      email: user.email ?? '',
      username: user.email?.split('@')[0] ?? 'user',
      role: 'user',
    };
  }

  return profile as UserProfile;
}
