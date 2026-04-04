/*
  # Create form_templates table

  1. New Tables
    - `form_templates`
      - `id` (uuid, primary key)
      - `firm_id` (uuid, references firms)
      - `name` (text) - display name of the form template
      - `form_key` (text) - unique key for the form type (e.g., 'rep_lien', 'foia')
      - `category` (text) - grouping category (e.g., 'Intake & Representation')
      - `description` (text) - short description of the form
      - `naming_pattern` (text) - naming convention pattern for generated documents
      - `is_active` (boolean) - whether the template is enabled
      - `is_system` (boolean) - whether it's a built-in system template
      - `icon` (text) - SVG path for the icon
      - `sort_order` (integer) - display order within category
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `form_templates` table
    - Add policies for authenticated users who are firm members
*/

CREATE TABLE IF NOT EXISTS form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  form_key text NOT NULL,
  category text NOT NULL DEFAULT 'Custom',
  description text NOT NULL DEFAULT '',
  naming_pattern text NOT NULL DEFAULT '{LastName}_{FirstName}_{DOL}_{FormType}_v{Version}',
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  icon text NOT NULL DEFAULT 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_form_templates_firm_key
  ON form_templates (firm_id, form_key);

ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can view form templates"
  ON form_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = form_templates.firm_id
      AND firm_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Firm members can insert form templates"
  ON form_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = form_templates.firm_id
      AND firm_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Firm members can update form templates"
  ON form_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = form_templates.firm_id
      AND firm_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = form_templates.firm_id
      AND firm_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Firm members can delete form templates"
  ON form_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = form_templates.firm_id
      AND firm_members.user_id = auth.uid()
    )
  );
