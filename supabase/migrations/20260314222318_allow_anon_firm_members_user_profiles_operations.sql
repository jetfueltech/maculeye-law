/*
  # Allow unauthenticated operations on firm_members and user_profiles

  The application uses a mock login with no real Supabase session, so all
  auth.uid()-based policies block writes. This migration relaxes RLS on
  firm_members and user_profiles to allow the mock-login app to function.

  1. Changes to firm_members
    - Replace admin-only INSERT/UPDATE/DELETE with permissive policies
    - Replace member-only SELECT with a permissive SELECT policy

  2. Changes to user_profiles
    - Replace auth-required SELECT/INSERT/UPDATE with permissive policies
*/

-- firm_members
DROP POLICY IF EXISTS "Admins can insert firm members" ON firm_members;
DROP POLICY IF EXISTS "Admins can update firm members" ON firm_members;
DROP POLICY IF EXISTS "Admins can delete firm members" ON firm_members;
DROP POLICY IF EXISTS "Members can view co-members of their firms" ON firm_members;
DROP POLICY IF EXISTS "Members can view their own memberships" ON firm_members;

CREATE POLICY "Allow all select firm_members"
  ON firm_members FOR SELECT
  USING (true);

CREATE POLICY "Allow all insert firm_members"
  ON firm_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all update firm_members"
  ON firm_members FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all delete firm_members"
  ON firm_members FOR DELETE
  USING (true);

-- user_profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

CREATE POLICY "Allow all select user_profiles"
  ON user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Allow all insert user_profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all update user_profiles"
  ON user_profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);
