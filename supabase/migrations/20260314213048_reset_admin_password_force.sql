
/*
  # Force reset admin password
  Updates the admin user's encrypted password to 'admin123' using bcrypt.
*/
UPDATE auth.users
SET 
  encrypted_password = crypt('admin123', gen_salt('bf', 10)),
  updated_at = now()
WHERE email = 'admin@system.local';
