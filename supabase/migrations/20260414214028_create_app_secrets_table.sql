/*
  # Create app_secrets table for secure server-side configuration

  1. New Tables
    - `app_secrets`
      - `key` (text, primary key) - the secret name
      - `value` (text) - the secret value
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on app_secrets
    - NO policies for authenticated users - this table is ONLY accessible via service_role
    - Edge functions use SUPABASE_SERVICE_ROLE_KEY to read secrets

  3. Notes
    - This stores Microsoft OAuth credentials securely
    - Only edge functions with service role can access this data
*/

CREATE TABLE IF NOT EXISTS app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO app_secrets (key, value) VALUES
  ('MICROSOFT_CLIENT_ID', '51e8c793-b39f-418c-8f09-cffe0ad2f605'),
  ('MICROSOFT_CLIENT_SECRET', 'b98a6fa3-365f-4e7f-a563-7a47dfdcafa1'),
  ('MICROSOFT_TENANT_ID', '4b8a4905-33d3-4bd6-bc00-aaf10e562d2d')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
