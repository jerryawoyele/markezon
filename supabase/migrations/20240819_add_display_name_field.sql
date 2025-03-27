-- Add display_name field to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- Create an index for faster searching by display_name
CREATE INDEX IF NOT EXISTS idx_profiles_display_name
ON profiles(display_name);

-- Add comment for documentation
COMMENT ON COLUMN profiles.display_name IS 'User''s display name, which can be different from their username';
