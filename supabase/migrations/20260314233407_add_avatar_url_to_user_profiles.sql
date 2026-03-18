/*
  # Add avatar_url to user_profiles

  ## Summary
  Adds an avatar_url column to user_profiles so users can upload a profile photo.

  ## Changes
  - `user_profiles`: new `avatar_url` column (text, nullable) — stores a public URL to the user's uploaded avatar image
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN avatar_url text;
  END IF;
END $$;
