/*
  # Rename Boss Intake Form to SAP Intake Form

  1. Changes
    - Updates `form_templates` table: renames "Boss Intake Form" to "SAP Intake Form"
    - Changes `form_key` from "boss_intake_form" to "sap_intake_form"
    - Updates naming pattern from BossIntake to SAPIntake

  2. Notes
    - Only updates rows where form_key = 'boss_intake_form'
    - Safe to re-run (no-op if already renamed)
*/

UPDATE form_templates
SET
  name = 'SAP Intake Form',
  form_key = 'sap_intake_form',
  naming_pattern = REPLACE(naming_pattern, 'BossIntake', 'SAPIntake'),
  updated_at = now()
WHERE form_key = 'boss_intake_form';
