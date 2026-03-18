/*
  # Create Medical Providers Directory

  1. New Tables
    - `medical_providers_directory`
      - `id` (uuid, primary key) - Unique provider identifier
      - `name` (text, not null) - Facility/provider name
      - `type` (text, not null) - Provider type (hospital, chiropractor, etc.)
      - `address` (text) - Street address
      - `city` (text) - City
      - `state` (text) - State
      - `zip` (text) - ZIP code
      - `phone` (text) - Phone number
      - `fax` (text) - Fax number
      - `contact_person` (text) - Primary contact person
      - `notes` (text) - General notes about the provider
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record last update timestamp

  2. Security
    - Enable RLS on `medical_providers_directory` table
    - Add policy for authenticated users to read all providers (shared directory)
    - Add policy for authenticated users to insert new providers
    - Add policy for authenticated users to update providers

  3. Notes
    - This table serves as a shared directory so providers only need to be entered once
    - All authenticated team members can search and reuse provider entries across cases
*/

CREATE TABLE IF NOT EXISTS medical_providers_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'other',
  address text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  zip text DEFAULT '',
  phone text DEFAULT '',
  fax text DEFAULT '',
  contact_person text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE medical_providers_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all providers"
  ON medical_providers_directory
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert providers"
  ON medical_providers_directory
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update providers"
  ON medical_providers_directory
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can read all providers"
  ON medical_providers_directory
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert providers"
  ON medical_providers_directory
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update providers"
  ON medical_providers_directory
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
