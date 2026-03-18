/*
  # Add username to user_profiles

  1. Changes
    - Adds `username` column to `user_profiles` (unique, not null with default fallback)
    - Creates an index on username for fast lookups
    - Adds a SELECT policy so the login flow can look up email by username
      (this lookup happens before auth, so it's done via a public-safe RPC)

  2. Notes
    - Username must be unique across the system
    - Existing rows get username defaulting to the part before @ in their email
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN username text;
    UPDATE user_profiles SET username = split_part(email, '@', 1) WHERE username IS NULL;
    ALTER TABLE user_profiles ALTER COLUMN username SET NOT NULL;
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_username_unique UNIQUE (username);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles (username);

CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM user_profiles WHERE username = p_username LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO authenticated;
