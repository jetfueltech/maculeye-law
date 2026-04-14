/*
  # Create Outlook OAuth tokens and synced emails tables

  1. New Tables
    - `outlook_oauth_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `firm_id` (uuid, references firms)
      - `access_token` (text, encrypted OAuth access token)
      - `refresh_token` (text, encrypted OAuth refresh token)
      - `expires_at` (timestamptz, when the access token expires)
      - `email_address` (text, the connected Microsoft email)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `synced_emails`
      - `id` (uuid, primary key)
      - `firm_id` (uuid, references firms)
      - `user_id` (uuid, references auth.users)
      - `microsoft_id` (text, unique message ID from Microsoft Graph)
      - `conversation_id` (text, thread grouping from Microsoft)
      - `from_name` (text)
      - `from_email` (text)
      - `to_recipients` (text)
      - `subject` (text)
      - `body_preview` (text, first ~500 chars)
      - `body_html` (text, full HTML body)
      - `direction` (text, inbound or outbound)
      - `is_read` (boolean)
      - `has_attachments` (boolean)
      - `received_at` (timestamptz)
      - `linked_case_id` (text, nullable, for case linking)
      - `category` (text, nullable, email category tag)
      - `ai_match` (jsonb, nullable, AI match analysis)
      - `attachments_meta` (jsonb, attachment metadata array)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Policies restrict access to authenticated users who own the tokens/emails
    - Service role access for edge functions

  3. Notes
    - outlook_oauth_tokens has a unique constraint on (user_id, firm_id) so each user can only have one Outlook connection per firm
    - synced_emails has a unique constraint on microsoft_id to prevent duplicate imports
*/

CREATE TABLE IF NOT EXISTS outlook_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  firm_id uuid NOT NULL REFERENCES firms(id),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  email_address text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, firm_id)
);

ALTER TABLE outlook_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own OAuth tokens"
  ON outlook_oauth_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OAuth tokens"
  ON outlook_oauth_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OAuth tokens"
  ON outlook_oauth_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own OAuth tokens"
  ON outlook_oauth_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS synced_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  microsoft_id text NOT NULL,
  conversation_id text DEFAULT '',
  from_name text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT '',
  to_recipients text DEFAULT '',
  subject text NOT NULL DEFAULT '',
  body_preview text DEFAULT '',
  body_html text DEFAULT '',
  direction text NOT NULL DEFAULT 'inbound',
  is_read boolean NOT NULL DEFAULT false,
  has_attachments boolean NOT NULL DEFAULT false,
  received_at timestamptz NOT NULL DEFAULT now(),
  linked_case_id text,
  category text,
  ai_match jsonb,
  attachments_meta jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(microsoft_id)
);

ALTER TABLE synced_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view emails for their firm"
  ON synced_emails FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = synced_emails.firm_id
      AND firm_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert emails they own"
  ON synced_emails FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update emails for their firm"
  ON synced_emails FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = synced_emails.firm_id
      AND firm_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = synced_emails.firm_id
      AND firm_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own emails"
  ON synced_emails FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_synced_emails_firm_id ON synced_emails(firm_id);
CREATE INDEX IF NOT EXISTS idx_synced_emails_received_at ON synced_emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_synced_emails_microsoft_id ON synced_emails(microsoft_id);
