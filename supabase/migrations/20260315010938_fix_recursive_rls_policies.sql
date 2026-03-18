/*
  # Fix recursive RLS policies on user_profiles

  The "Admins can view all profiles" and "Admins can update all profiles" policies
  perform a subquery against user_profiles itself, creating infinite recursion.
  This causes "Database error querying schema" from Supabase GoTrue during sign-in.

  Fix: Use a SECURITY DEFINER function to look up the current user's system_role
  without triggering RLS, breaking the recursion.
*/

CREATE OR REPLACE FUNCTION get_current_user_system_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT system_role FROM public.user_profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION get_current_user_system_role() TO authenticated;

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert firms" ON firms;
DROP POLICY IF EXISTS "Admins can update firms" ON firms;
DROP POLICY IF EXISTS "Admins can insert firm members" ON firm_members;
DROP POLICY IF EXISTS "Admins can update firm members" ON firm_members;
DROP POLICY IF EXISTS "Admins can delete firm members" ON firm_members;

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (get_current_user_system_role() = 'admin');

CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (get_current_user_system_role() = 'admin')
  WITH CHECK (get_current_user_system_role() = 'admin');

CREATE POLICY "Admins can insert firms"
  ON firms FOR INSERT
  TO authenticated
  WITH CHECK (get_current_user_system_role() = 'admin');

CREATE POLICY "Admins can update firms"
  ON firms FOR UPDATE
  TO authenticated
  USING (get_current_user_system_role() = 'admin')
  WITH CHECK (get_current_user_system_role() = 'admin');

CREATE POLICY "Admins can insert firm members"
  ON firm_members FOR INSERT
  TO authenticated
  WITH CHECK (get_current_user_system_role() = 'admin');

CREATE POLICY "Admins can update firm members"
  ON firm_members FOR UPDATE
  TO authenticated
  USING (get_current_user_system_role() = 'admin')
  WITH CHECK (get_current_user_system_role() = 'admin');

CREATE POLICY "Admins can delete firm members"
  ON firm_members FOR DELETE
  TO authenticated
  USING (get_current_user_system_role() = 'admin');
