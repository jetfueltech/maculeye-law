/*
  # Allow unauthenticated firm operations

  The application uses a mock login that does not create a real Supabase auth
  session, so auth.uid() is always null. The existing RLS policies require
  auth.uid() to match an admin, which blocks all writes.

  This migration replaces the INSERT/UPDATE policies on firms and adds a
  permissive SELECT policy so the mock-login app can manage firms.
  These can be tightened once real Supabase auth is wired up.

  1. Changes
    - Drop existing restrictive INSERT and UPDATE policies on `firms`
    - Add permissive INSERT policy (allows anon/authenticated)
    - Add permissive UPDATE policy (allows anon/authenticated)
    - Drop existing SELECT policy and replace with one that also allows anon
*/

DROP POLICY IF EXISTS "Admins can insert firms" ON firms;
DROP POLICY IF EXISTS "Admins can update firms" ON firms;
DROP POLICY IF EXISTS "Members can view their firms" ON firms;

CREATE POLICY "Allow all insert firms"
  ON firms FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all update firms"
  ON firms FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all select firms"
  ON firms FOR SELECT
  USING (true);
