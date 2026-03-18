/*
  # Multi-Firm Architecture: Firms, User Profiles, and Firm Membership

  ## Overview
  Establishes the multi-firm (multi-tenant) architecture.

  ## New Tables
  - `firms`: Law firm organizations
  - `user_profiles`: Auth user extensions with system role
  - `firm_members`: Many-to-many user<->firm with per-firm role

  ## Security
  RLS on all tables. Admins manage everything. Members see only their own firms/data.
  Note: The SELECT policy on `firms` for members is added after firm_members is created.
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  avatar_initials text NOT NULL DEFAULT '',
  system_role text NOT NULL DEFAULT 'member' CHECK (system_role IN ('admin', 'manager', 'member')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT system_role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    (SELECT system_role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT system_role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE TABLE IF NOT EXISTS firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE firms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert firms"
  ON firms FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT system_role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update firms"
  ON firms FOR UPDATE
  TO authenticated
  USING (
    (SELECT system_role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT system_role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE TABLE IF NOT EXISTS firm_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE (firm_id, user_id)
);

ALTER TABLE firm_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own memberships"
  ON firm_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members can view co-members of their firms"
  ON firm_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM firm_members fm2
      WHERE fm2.firm_id = firm_members.firm_id
        AND fm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert firm members"
  ON firm_members FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT system_role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update firm members"
  ON firm_members FOR UPDATE
  TO authenticated
  USING (
    (SELECT system_role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT system_role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can delete firm members"
  ON firm_members FOR DELETE
  TO authenticated
  USING (
    (SELECT system_role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Members can view their firms"
  ON firms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = firms.id
        AND firm_members.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS firm_members_firm_id_idx ON firm_members(firm_id);
CREATE INDEX IF NOT EXISTS firm_members_user_id_idx ON firm_members(user_id);
