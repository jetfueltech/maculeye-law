/*
  # Add firm detail columns

  Adds contact and profile fields to the firms table so users can store
  information about each law firm.

  1. New columns on `firms`
    - `website` (text) - firm website URL
    - `phone` (text) - main phone number
    - `email` (text) - main contact email
    - `address_line1` (text) - street address line 1
    - `address_line2` (text) - street address line 2 (suite, floor, etc.)
    - `city` (text)
    - `state` (text)
    - `zip` (text)
    - `country` (text, defaults to 'US')
    - `description` (text) - short bio / about the firm
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'website') THEN
    ALTER TABLE firms ADD COLUMN website text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'phone') THEN
    ALTER TABLE firms ADD COLUMN phone text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'email') THEN
    ALTER TABLE firms ADD COLUMN email text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'address_line1') THEN
    ALTER TABLE firms ADD COLUMN address_line1 text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'address_line2') THEN
    ALTER TABLE firms ADD COLUMN address_line2 text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'city') THEN
    ALTER TABLE firms ADD COLUMN city text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'state') THEN
    ALTER TABLE firms ADD COLUMN state text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'zip') THEN
    ALTER TABLE firms ADD COLUMN zip text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'country') THEN
    ALTER TABLE firms ADD COLUMN country text DEFAULT 'US';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'description') THEN
    ALTER TABLE firms ADD COLUMN description text DEFAULT '';
  END IF;
END $$;
