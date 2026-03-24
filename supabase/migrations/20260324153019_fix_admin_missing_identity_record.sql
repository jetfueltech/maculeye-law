/*
  # Fix admin user missing identity record

  1. Problem
    - The admin user (admin@system.local) was created directly via SQL
      and is missing its `auth.identities` record
    - GoTrue requires an identity record to complete sign-in,
      causing a 500 "Database error querying schema" error

  2. Fix
    - Insert the missing identity record for the admin user
    - Uses the same format as other identity records created by Supabase auth
*/

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  id,
  id::text,
  'email',
  jsonb_build_object(
    'sub', id::text,
    'email', email,
    'email_verified', true,
    'phone_verified', false
  ),
  now(),
  created_at,
  now()
FROM auth.users
WHERE email = 'admin@system.local'
AND NOT EXISTS (
  SELECT 1 FROM auth.identities WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'admin@system.local'
  ) AND provider = 'email'
);
