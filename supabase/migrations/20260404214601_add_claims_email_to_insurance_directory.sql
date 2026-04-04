/*
  # Add claims email to insurance companies directory

  1. Modified Tables
    - `insurance_companies_directory`
      - Added `claims_email` (text) - email address for the claims department

  2. Notes
    - Non-destructive change, adds a single column with empty string default
    - Allows capturing the claims department email for use in generated legal forms
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insurance_companies_directory' AND column_name = 'claims_email'
  ) THEN
    ALTER TABLE insurance_companies_directory ADD COLUMN claims_email text DEFAULT '';
  END IF;
END $$;