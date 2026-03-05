-- Remove public.is_active_user() from all RLS policies on public.profiles to fix recursion
-- Restore prior behavior: authenticated users can select/update/insert their own profile row

-- SELECT own profile
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- UPDATE own profile
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT own profile
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Optionally keep read all authenticated policy if it exists, but do NOT reference is_active_user()
DROP POLICY IF EXISTS profiles_read_all_authenticated ON public.profiles;
CREATE POLICY profiles_read_all_authenticated ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS remains enabled on public.profiles
