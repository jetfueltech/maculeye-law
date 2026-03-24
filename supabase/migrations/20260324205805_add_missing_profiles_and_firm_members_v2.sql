/*
  # Add missing user profiles and firm memberships

  1. Changes
    - Creates a `user_profiles` record for any auth user missing one
    - Adds all auth users to the default firm as members if not already present
  2. Notes
    - Ensures all users can access the application and save cases
    - Uses email prefix as default display name, username, and initials
*/

INSERT INTO user_profiles (id, email, full_name, username, avatar_initials, system_role)
SELECT
  au.id,
  au.email,
  split_part(au.email, '@', 1),
  split_part(au.email, '@', 1),
  upper(left(split_part(au.email, '@', 1), 2)),
  'member'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.id = au.id
);

INSERT INTO firm_members (id, firm_id, user_id, role)
SELECT
  gen_random_uuid(),
  '7edfeace-3c28-40d8-ae4b-37ff203f18f3',
  au.id,
  'member'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM firm_members fm
  WHERE fm.user_id = au.id
  AND fm.firm_id = '7edfeace-3c28-40d8-ae4b-37ff203f18f3'
);