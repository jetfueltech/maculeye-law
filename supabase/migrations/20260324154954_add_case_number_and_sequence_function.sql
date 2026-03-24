/*
  # Add case_number to cases and create sequence function

  1. Modified Tables
    - `cases`
      - `case_number` (text) - Human-readable case ID like "SAP-0001"

  2. New Functions
    - `generate_next_case_number(firm_uuid)` - Atomically increments the firm's counter
      and returns the formatted case number (e.g., "SAP-0001")

  3. Important Notes
    - The function locks the firm row to prevent race conditions
    - Case numbers are zero-padded to 4 digits
    - Returns NULL if the firm has no case_prefix set
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cases' AND column_name = 'case_number'
  ) THEN
    ALTER TABLE cases ADD COLUMN case_number text;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION generate_next_case_number(firm_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text;
  seq integer;
  result text;
BEGIN
  SELECT case_prefix, next_case_number
  INTO prefix, seq
  FROM firms
  WHERE id = firm_uuid
  FOR UPDATE;

  IF prefix IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE firms
  SET next_case_number = next_case_number + 1
  WHERE id = firm_uuid;

  result := prefix || '-' || lpad(seq::text, 4, '0');
  RETURN result;
END;
$$;
