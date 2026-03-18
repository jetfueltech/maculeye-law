/*
  # Create Police Departments Directory

  ## Summary
  Creates a new table for storing police department contact information in the shared directory.

  ## New Tables
  - `police_departments_directory`
    - `id` (uuid, primary key)
    - `name` (text) — department name, e.g. "Springfield PD"
    - `jurisdiction` (text) — city, county, state, or federal
    - `address` (text) — physical address
    - `city` (text)
    - `state` (text)
    - `zip` (text)
    - `mailing_address` (text)
    - `mailing_city` (text)
    - `mailing_state` (text)
    - `mailing_zip` (text)
    - `phone` (text) — main non-emergency line
    - `fax` (text)
    - `records_phone` (text) — records division direct line
    - `records_email` (text) — email for records requests
    - `website` (text)
    - `notes` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Authenticated and anonymous users can read, insert, update, and delete (matches existing directory tables pattern)
*/

CREATE TABLE IF NOT EXISTS police_departments_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  jurisdiction text NOT NULL DEFAULT 'city',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  mailing_address text NOT NULL DEFAULT '',
  mailing_city text NOT NULL DEFAULT '',
  mailing_state text NOT NULL DEFAULT '',
  mailing_zip text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  fax text NOT NULL DEFAULT '',
  records_phone text NOT NULL DEFAULT '',
  records_email text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE police_departments_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read police departments"
  ON police_departments_directory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon users can read police departments"
  ON police_departments_directory FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can insert police departments"
  ON police_departments_directory FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon users can insert police departments"
  ON police_departments_directory FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update police departments"
  ON police_departments_directory FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can update police departments"
  ON police_departments_directory FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete police departments"
  ON police_departments_directory FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anon users can delete police departments"
  ON police_departments_directory FOR DELETE
  TO anon
  USING (true);
