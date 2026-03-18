/*
  # Create Insurance Companies Directory

  1. New Tables
    - `insurance_companies_directory`
      - `id` (uuid, primary key) - Unique identifier
      - `name` (text, not null) - Company name (e.g. State Farm, Geico)
      - `type` (text, not null) - Company type (auto, health, commercial, workers_comp, general)
      - `address` (text) - Street address
      - `city` (text) - City
      - `state` (text) - State
      - `zip` (text) - ZIP code
      - `phone` (text) - Main phone number
      - `fax` (text) - Fax number
      - `claims_phone` (text) - Dedicated claims phone line
      - `website` (text) - Company website
      - `notes` (text) - General notes
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record last update timestamp

  2. Security
    - Enable RLS on `insurance_companies_directory` table
    - Add policies for authenticated and anon users to read, insert, and update

  3. Notes
    - Shared directory so insurance companies only need to be entered once
    - All team members can search and reuse entries across cases
*/

CREATE TABLE IF NOT EXISTS insurance_companies_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'auto',
  address text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  zip text DEFAULT '',
  phone text DEFAULT '',
  fax text DEFAULT '',
  claims_phone text DEFAULT '',
  website text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE insurance_companies_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read insurance companies"
  ON insurance_companies_directory
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert insurance companies"
  ON insurance_companies_directory
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update insurance companies"
  ON insurance_companies_directory
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can read insurance companies"
  ON insurance_companies_directory
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert insurance companies"
  ON insurance_companies_directory
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update insurance companies"
  ON insurance_companies_directory
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
