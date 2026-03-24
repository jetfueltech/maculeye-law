/*
  # Add case prefix and sequence to firms

  1. Modified Tables
    - `firms`
      - `case_prefix` (text, unique) - Short uppercase prefix used for case IDs (e.g., "SAP", "TXL")
      - `next_case_number` (integer, default 1) - Auto-incrementing counter for case numbering

  2. Existing Firms
    - "SAP Law" gets prefix "SAP"
    - "Texas Law" gets prefix "TXL"

  3. Important Notes
    - case_prefix is unique to prevent collisions between firms
    - next_case_number starts at 1 and increments with each new case
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'firms' AND column_name = 'case_prefix'
  ) THEN
    ALTER TABLE firms ADD COLUMN case_prefix text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'firms' AND column_name = 'next_case_number'
  ) THEN
    ALTER TABLE firms ADD COLUMN next_case_number integer NOT NULL DEFAULT 1;
  END IF;
END $$;

UPDATE firms SET case_prefix = 'SAP', next_case_number = 1
WHERE slug = 'sap-law' AND case_prefix IS NULL;

UPDATE firms SET case_prefix = 'TXL', next_case_number = 1
WHERE slug = 'texas-law' AND case_prefix IS NULL;
