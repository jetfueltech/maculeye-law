/*
  # Add signature URL to firms table

  1. Modified Tables
    - `firms`
      - Added `signature_url` (text, nullable) - URL to the firm's attorney signature image stored in Supabase storage

  2. Storage
    - Create `firm-assets` bucket for storing firm signature images and other assets
    - Allow authenticated users to upload/read from this bucket

  3. Notes
    - The signature_url stores the public URL to the uploaded signature image
    - Used in document generation (LOR, lien notices, etc.)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'firms' AND column_name = 'signature_url'
  ) THEN
    ALTER TABLE firms ADD COLUMN signature_url text;
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('firm-assets', 'firm-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload firm assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'firm-assets');

CREATE POLICY "Authenticated users can read firm assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'firm-assets');

CREATE POLICY "Authenticated users can update firm assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'firm-assets')
  WITH CHECK (bucket_id = 'firm-assets');

CREATE POLICY "Authenticated users can delete firm assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'firm-assets');