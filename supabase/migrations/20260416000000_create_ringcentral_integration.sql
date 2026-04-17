/*
  # RingCentral integration tables

  1. New Tables
    - `ringcentral_oauth_tokens`   — per-user RC OAuth tokens (one row per user/firm)
    - `ringcentral_call_logs`      — synced call history from RingCentral
    - `ringcentral_sms_messages`   — synced SMS messages (inbound + outbound)

  2. Security
    - RLS enabled on all three tables
    - Authenticated users can only read/write rows scoped to their own user_id
    - Service role bypasses RLS for edge functions

  3. Notes
    - Tokens mirror the outlook_oauth_tokens shape so the same connection
      pattern (one account per user/firm, unique constraint) applies.
    - Call logs and SMS have a nullable linked_case_id so they can be
      auto-matched by phone number during sync or manually linked later.
*/

-- ────────────────────────────────────────────────────────────────────────────
-- OAuth tokens
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ringcentral_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  refresh_token_expires_at timestamptz,
  rc_account_id text,
  rc_extension_id text,
  rc_phone_number text,
  owner_name text,
  owner_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, firm_id)
);

ALTER TABLE ringcentral_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own RC tokens"
  ON ringcentral_oauth_tokens
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- Call logs
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ringcentral_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rc_call_id text NOT NULL,
  direction text NOT NULL,                   -- 'Inbound' | 'Outbound'
  result text,                               -- 'Accepted', 'Missed', 'Voicemail', etc.
  from_number text,
  from_name text,
  to_number text,
  to_name text,
  duration_seconds integer DEFAULT 0,
  recording_url text,
  started_at timestamptz NOT NULL,
  linked_case_id text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, rc_call_id)
);

CREATE INDEX IF NOT EXISTS idx_rc_call_logs_firm_started
  ON ringcentral_call_logs (firm_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_rc_call_logs_linked_case
  ON ringcentral_call_logs (linked_case_id);

ALTER TABLE ringcentral_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read call logs for their firm"
  ON ringcentral_call_logs
  FOR SELECT
  TO authenticated
  USING (
    firm_id IN (
      SELECT firm_id FROM firm_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users update call logs they own"
  ON ringcentral_call_logs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- SMS messages
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ringcentral_sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rc_message_id text NOT NULL,
  conversation_id text,
  direction text NOT NULL,                   -- 'Inbound' | 'Outbound'
  from_number text NOT NULL,
  to_number text NOT NULL,
  body text NOT NULL DEFAULT '',
  message_status text,                       -- 'Sent', 'Delivered', 'Received', etc.
  sent_at timestamptz NOT NULL,
  linked_case_id text,
  is_read boolean DEFAULT false,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, rc_message_id)
);

CREATE INDEX IF NOT EXISTS idx_rc_sms_firm_sent
  ON ringcentral_sms_messages (firm_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_rc_sms_linked_case
  ON ringcentral_sms_messages (linked_case_id);

CREATE INDEX IF NOT EXISTS idx_rc_sms_conversation
  ON ringcentral_sms_messages (conversation_id);

ALTER TABLE ringcentral_sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read SMS for their firm"
  ON ringcentral_sms_messages
  FOR SELECT
  TO authenticated
  USING (
    firm_id IN (
      SELECT firm_id FROM firm_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users update SMS they own"
  ON ringcentral_sms_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- App secrets placeholders (values are inserted manually via SQL — never commit real values).
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO app_secrets (key, value) VALUES
  ('RINGCENTRAL_CLIENT_ID', ''),
  ('RINGCENTRAL_CLIENT_SECRET', ''),
  ('RINGCENTRAL_SERVER_URL', 'https://platform.devtest.ringcentral.com')
ON CONFLICT (key) DO NOTHING;
