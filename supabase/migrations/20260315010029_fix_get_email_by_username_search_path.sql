/*
  # Fix get_email_by_username search_path

  SECURITY DEFINER functions must have an explicit search_path set to prevent
  privilege escalation and schema resolution errors. Without it, Supabase's
  GoTrue auth service can throw "Database error querying schema" during login.
*/

CREATE OR REPLACE FUNCTION get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT email FROM public.user_profiles WHERE username = p_username LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_email_by_username(text) TO anon, authenticated;
