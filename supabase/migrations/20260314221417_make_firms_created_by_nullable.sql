/*
  # Make firms.created_by nullable

  The login screen uses a mock authentication flow that doesn't establish a real
  Supabase session, so auth.uid() and user?.id are null/empty when creating firms.
  Making created_by nullable allows firm creation without a valid user UUID.

  1. Changes
    - `firms.created_by` — altered to allow NULL values
*/

ALTER TABLE firms ALTER COLUMN created_by DROP NOT NULL;
