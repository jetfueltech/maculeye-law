-- Create Documents Storage Bucket
--
-- 1. Storage
--    - Create case-documents storage bucket for case file uploads
--    - Bucket allows images and PDFs up to 50MB
-- 2. Security
--    - Allow read access for viewing documents
--    - Allow uploads since app does not use auth yet
--    - Allow deletes for document management
-- 3. Notes
--    - Files organized by case ID: case-documents/caseId/filename

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'case-documents',
  'case-documents',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read access on case-documents"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'case-documents');

CREATE POLICY "Allow public upload to case-documents"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'case-documents');

CREATE POLICY "Allow public update on case-documents"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'case-documents')
  WITH CHECK (bucket_id = 'case-documents');

CREATE POLICY "Allow public delete from case-documents"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'case-documents');
