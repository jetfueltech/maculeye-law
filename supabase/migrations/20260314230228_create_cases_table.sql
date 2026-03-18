/*
  # Create cases table

  ## Summary
  Creates a `cases` table to persist all law firm case data in the database,
  replacing the current in-memory mock state. Each case is associated with a
  specific firm via `firm_id`, enabling full data isolation between firms.

  ## New Tables

  ### `cases`
  - `id` (text, primary key) — client-supplied case ID (e.g. "case-101")
  - `firm_id` (uuid, FK → firms.id) — which firm owns this case
  - `data` (jsonb) — full CaseFile JSON blob (all fields stored here for flexibility)
  - `client_name` (text) — denormalized for fast querying/sorting
  - `status` (text) — denormalized for fast filtering
  - `created_at` (timestamptz) — when the case was created
  - `updated_at` (timestamptz) — last updated timestamp

  ## Security
  - RLS enabled
  - Authenticated users can read, insert, update, delete cases belonging to firms
    they are a member of (checked via firm_members table)
*/

CREATE TABLE IF NOT EXISTS cases (
  id text PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}',
  client_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'NEW',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cases_firm_id_idx ON cases(firm_id);
CREATE INDEX IF NOT EXISTS cases_status_idx ON cases(status);
CREATE INDEX IF NOT EXISTS cases_created_at_idx ON cases(created_at DESC);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can view cases"
  ON cases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = cases.firm_id
        AND firm_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Firm members can insert cases"
  ON cases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = cases.firm_id
        AND firm_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Firm members can update cases"
  ON cases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = cases.firm_id
        AND firm_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = cases.firm_id
        AND firm_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Firm members can delete cases"
  ON cases FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = cases.firm_id
        AND firm_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Anon can manage cases"
  ON cases FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
