/*
  # Add unique suffix to case number generation

  1. Modified Functions
    - `generate_next_case_number(firm_uuid)` - Now appends a 4-character
      alphanumeric suffix to guarantee global uniqueness
    - Format changes from "SAP-0001" to "SAP-0001-A7K3"
    - Adds a unique constraint on the case_number column

  2. Security
    - Function remains SECURITY DEFINER with restricted search_path
    - Row-level lock on firms row still prevents race conditions

  3. Important Notes
    - Existing case numbers remain valid (no data modification)
    - New case numbers will have the additional suffix
    - Unique constraint prevents any duplicate case numbers
*/

CREATE OR REPLACE FUNCTION generate_next_case_number(firm_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text;
  seq integer;
  suffix text;
  result text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
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

  suffix := '';
  FOR i IN 1..4 LOOP
    suffix := suffix || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;

  result := prefix || '-' || lpad(seq::text, 4, '0') || '-' || suffix;
  RETURN result;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cases_case_number_unique'
  ) THEN
    ALTER TABLE cases ADD CONSTRAINT cases_case_number_unique UNIQUE (case_number);
  END IF;
END $$;
