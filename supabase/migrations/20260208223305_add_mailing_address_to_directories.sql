/*
  # Add mailing address fields to directory tables

  1. Schema Changes
    - Add mailing_address, mailing_city, mailing_state, mailing_zip to medical_providers_directory
    - Add mailing_address, mailing_city, mailing_state, mailing_zip to insurance_companies_directory

  2. Notes
    - Allows tracking separate physical and mailing addresses
    - All fields default to empty string for consistency with existing address fields
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_providers_directory' AND column_name = 'mailing_address'
  ) THEN
    ALTER TABLE medical_providers_directory ADD COLUMN mailing_address text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_providers_directory' AND column_name = 'mailing_city'
  ) THEN
    ALTER TABLE medical_providers_directory ADD COLUMN mailing_city text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_providers_directory' AND column_name = 'mailing_state'
  ) THEN
    ALTER TABLE medical_providers_directory ADD COLUMN mailing_state text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_providers_directory' AND column_name = 'mailing_zip'
  ) THEN
    ALTER TABLE medical_providers_directory ADD COLUMN mailing_zip text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insurance_companies_directory' AND column_name = 'mailing_address'
  ) THEN
    ALTER TABLE insurance_companies_directory ADD COLUMN mailing_address text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insurance_companies_directory' AND column_name = 'mailing_city'
  ) THEN
    ALTER TABLE insurance_companies_directory ADD COLUMN mailing_city text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insurance_companies_directory' AND column_name = 'mailing_state'
  ) THEN
    ALTER TABLE insurance_companies_directory ADD COLUMN mailing_state text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insurance_companies_directory' AND column_name = 'mailing_zip'
  ) THEN
    ALTER TABLE insurance_companies_directory ADD COLUMN mailing_zip text DEFAULT '';
  END IF;
END $$;
