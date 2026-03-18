/*
  # Reset admin password

  Sets the password for admin@system.local to 'admin123'
*/

UPDATE auth.users
SET encrypted_password = crypt('admin123', gen_salt('bf'))
WHERE email = 'admin@system.local';