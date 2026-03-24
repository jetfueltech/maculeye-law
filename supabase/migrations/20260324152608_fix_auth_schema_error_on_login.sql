/*
  # Fix "Database error querying schema" during login

  1. Problem
    - GoTrue's `supabase_auth_admin` role evaluates RLS policies on `user_profiles`
      during the sign-in flow (before JWT claims are set)
    - The `get_current_user_system_role()` function calls `auth.uid()` which can
      fail or return unexpected results during GoTrue's internal processing
    - This causes the 500 "Database error querying schema" error

  2. Fix
    - Recreate `get_current_user_system_role()` using plpgsql with a null check on auth.uid()
    - Remove the problematic admin SELECT/UPDATE policies on user_profiles that trigger
      recursive evaluation during GoTrue auth flow
    - Add simpler self-access policies for authenticated users
    - The "Allow all select/update user_profiles" policies for {public} already allow
      full access, so the admin policies are redundant and only cause problems

  3. Security
    - Existing public-role policies remain unchanged
    - Authenticated users can still read/update their own profile
    - Admin policies removed since public policies already cover all access
*/

-- Recreate function with null safety
CREATE OR REPLACE FUNCTION get_current_user_system_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  uid uuid;
  role text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT system_role INTO role FROM public.user_profiles WHERE id = uid;
  RETURN role;
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_user_system_role() TO authenticated;

-- Drop the admin policies on user_profiles that cause schema errors during GoTrue auth
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- Add self-access policies for authenticated users (more specific than the public ones)
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
