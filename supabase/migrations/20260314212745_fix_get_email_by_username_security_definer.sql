
/*
  # Fix get_email_by_username function

  The function needs SECURITY DEFINER so it can read user_profiles
  even when called by unauthenticated users (during login).
*/

CREATE OR REPLACE FUNCTION get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT email FROM public.user_profiles WHERE username = p_username LIMIT 1;
$$;
