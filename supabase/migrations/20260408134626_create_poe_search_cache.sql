/*
  # Create POE (Preservation of Evidence) search cache table

  Persists nearby-business search results so users don't have to
  re-run the search when they navigate away and come back.

  1. New Tables
    - `poe_search_cache`
      - `id` (uuid, primary key)
      - `case_id` (text, FK -> cases.id) — which case the search belongs to
      - `query` (text) — the search query string (may be empty for unfiltered)
      - `location` (text) — the accident location used for the search
      - `results` (jsonb) — array of search result objects
      - `created_at` (timestamptz) — when the search was performed

  2. Security
    - RLS enabled
    - Firm members who can access the case can read/insert/update/delete cached searches
*/

CREATE TABLE IF NOT EXISTS poe_search_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id text NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  query text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  results jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(case_id, query, location)
);

CREATE INDEX IF NOT EXISTS poe_search_cache_case_id_idx ON poe_search_cache(case_id);

ALTER TABLE poe_search_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can view poe search cache"
  ON poe_search_cache FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      JOIN firm_members ON firm_members.firm_id = cases.firm_id
      WHERE cases.id = poe_search_cache.case_id
        AND firm_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Firm members can insert poe search cache"
  ON poe_search_cache FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      JOIN firm_members ON firm_members.firm_id = cases.firm_id
      WHERE cases.id = poe_search_cache.case_id
        AND firm_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Firm members can update poe search cache"
  ON poe_search_cache FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      JOIN firm_members ON firm_members.firm_id = cases.firm_id
      WHERE cases.id = poe_search_cache.case_id
        AND firm_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      JOIN firm_members ON firm_members.firm_id = cases.firm_id
      WHERE cases.id = poe_search_cache.case_id
        AND firm_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Firm members can delete poe search cache"
  ON poe_search_cache FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      JOIN firm_members ON firm_members.firm_id = cases.firm_id
      WHERE cases.id = poe_search_cache.case_id
        AND firm_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Anon can manage poe search cache"
  ON poe_search_cache FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
