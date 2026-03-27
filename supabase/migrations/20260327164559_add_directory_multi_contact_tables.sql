/*
  # Add multi-contact child tables for directory entries

  1. New Tables
    - `directory_phones`
      - `id` (uuid, primary key)
      - `directory_type` (text) - 'provider' or 'insurance'
      - `directory_id` (uuid) - FK reference to parent directory entry
      - `label` (text) - e.g. 'Main', 'Claims', 'Billing', 'After Hours'
      - `phone_number` (text) - the phone number
      - `created_at` (timestamptz)

    - `directory_faxes`
      - `id` (uuid, primary key)
      - `directory_type` (text) - 'provider' or 'insurance'
      - `directory_id` (uuid) - FK reference to parent directory entry
      - `label` (text) - e.g. 'Main', 'Records', 'Billing'
      - `fax_number` (text) - the fax number
      - `created_at` (timestamptz)

    - `directory_addresses`
      - `id` (uuid, primary key)
      - `directory_type` (text) - 'provider' or 'insurance'
      - `directory_id` (uuid) - FK reference to parent directory entry
      - `label` (text) - e.g. 'Main Office', 'Mailing', 'Branch Office'
      - `address` (text) - street address
      - `city` (text)
      - `state` (text)
      - `zip` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all three tables
    - Authenticated and anon policies for select, insert, update, delete

  3. Notes
    - These tables allow providers and insurance companies to have multiple
      phone numbers, fax numbers, and addresses
    - The directory_type + directory_id pair identifies the parent entity
    - Existing single phone/fax/address fields on the parent tables remain
      as the "primary" contact info for backward compatibility
*/

CREATE TABLE IF NOT EXISTS directory_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  directory_type text NOT NULL DEFAULT 'provider',
  directory_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'Main',
  phone_number text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE directory_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read directory phones"
  ON directory_phones FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert directory phones"
  ON directory_phones FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update directory phones"
  ON directory_phones FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete directory phones"
  ON directory_phones FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Anon users can read directory phones"
  ON directory_phones FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert directory phones"
  ON directory_phones FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can update directory phones"
  ON directory_phones FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon users can delete directory phones"
  ON directory_phones FOR DELETE TO anon USING (true);


CREATE TABLE IF NOT EXISTS directory_faxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  directory_type text NOT NULL DEFAULT 'provider',
  directory_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'Main',
  fax_number text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE directory_faxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read directory faxes"
  ON directory_faxes FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert directory faxes"
  ON directory_faxes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update directory faxes"
  ON directory_faxes FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete directory faxes"
  ON directory_faxes FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Anon users can read directory faxes"
  ON directory_faxes FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert directory faxes"
  ON directory_faxes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can update directory faxes"
  ON directory_faxes FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon users can delete directory faxes"
  ON directory_faxes FOR DELETE TO anon USING (true);


CREATE TABLE IF NOT EXISTS directory_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  directory_type text NOT NULL DEFAULT 'provider',
  directory_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'Main Office',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE directory_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read directory addresses"
  ON directory_addresses FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert directory addresses"
  ON directory_addresses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update directory addresses"
  ON directory_addresses FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete directory addresses"
  ON directory_addresses FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Anon users can read directory addresses"
  ON directory_addresses FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert directory addresses"
  ON directory_addresses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can update directory addresses"
  ON directory_addresses FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon users can delete directory addresses"
  ON directory_addresses FOR DELETE TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_directory_phones_lookup ON directory_phones(directory_type, directory_id);
CREATE INDEX IF NOT EXISTS idx_directory_faxes_lookup ON directory_faxes(directory_type, directory_id);
CREATE INDEX IF NOT EXISTS idx_directory_addresses_lookup ON directory_addresses(directory_type, directory_id);
