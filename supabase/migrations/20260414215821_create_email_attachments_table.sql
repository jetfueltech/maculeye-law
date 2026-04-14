/*
  # Create email attachments table

  1. New Tables
    - `email_attachments`
      - `id` (uuid, primary key)
      - `email_id` (uuid, references synced_emails)
      - `firm_id` (uuid, references firms)
      - `microsoft_attachment_id` (text, unique ID from Graph API)
      - `name` (text, original filename)
      - `content_type` (text, MIME type)
      - `size_bytes` (integer, file size)
      - `storage_path` (text, path in Supabase Storage bucket)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on email_attachments
    - Users can view attachments for emails in their firm
    - Users can insert attachments for emails they own

  3. Storage
    - Create email-attachments bucket for storing attachment files

  4. Indexes
    - Index on email_id for fast lookup
    - Index on firm_id for filtering
*/

CREATE TABLE IF NOT EXISTS email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid NOT NULL REFERENCES synced_emails(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES firms(id),
  microsoft_attachment_id text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  content_type text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes integer NOT NULL DEFAULT 0,
  storage_path text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for their firm"
  ON email_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = email_attachments.firm_id
      AND firm_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attachments for their firm"
  ON email_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = email_attachments.firm_id
      AND firm_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments they own"
  ON email_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM synced_emails
      WHERE synced_emails.id = email_attachments.email_id
      AND synced_emails.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_email_attachments_email_id ON email_attachments(email_id);
CREATE INDEX IF NOT EXISTS idx_email_attachments_firm_id ON email_attachments(firm_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Firm members can read email attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'email-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT fm.firm_id::text FROM firm_members fm WHERE fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can upload email attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'email-attachments');
