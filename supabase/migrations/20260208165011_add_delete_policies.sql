/*
  # Add delete policies for directory tables

  1. Security Changes
    - Add DELETE policy for authenticated and anon users on medical_providers_directory
    - Add DELETE policy for authenticated and anon users on insurance_companies_directory

  2. Notes
    - Allows team members to remove outdated entries from directories
*/

CREATE POLICY "Authenticated users can delete providers"
  ON medical_providers_directory
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can delete providers"
  ON medical_providers_directory
  FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can delete insurance companies"
  ON insurance_companies_directory
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can delete insurance companies"
  ON insurance_companies_directory
  FOR DELETE
  TO anon
  USING (true);
