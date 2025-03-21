-- Add KYC verification fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS kyc_session_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS kyc_last_attempt_at TIMESTAMPTZ;

-- Create index for fast lookup of profiles by KYC session ID
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_session_id
ON profiles(kyc_session_id);

-- Create notification type for KYC updates
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'kyc';

-- Add comment to kyc_status column for documentation
COMMENT ON COLUMN profiles.kyc_status IS 'Status of KYC verification: not_started, started, pending, verified, rejected';

-- Add comment to kyc_verified column for documentation
COMMENT ON COLUMN profiles.kyc_verified IS 'Whether the user has been verified successfully';

-- Add comment to kyc_verified_at column for documentation
COMMENT ON COLUMN profiles.kyc_verified_at IS 'When the user was verified successfully';

-- Add comment to kyc_session_id column for documentation
COMMENT ON COLUMN profiles.kyc_session_id IS 'Session ID from Jumio for the verification process';

-- Add comment to kyc_rejection_reason column for documentation
COMMENT ON COLUMN profiles.kyc_rejection_reason IS 'Reason for rejection if verification failed';

-- Add comment to kyc_last_attempt_at column for documentation
COMMENT ON COLUMN profiles.kyc_last_attempt_at IS 'When the user last attempted verification';

-- Add function to update last attempt timestamp whenever kyc_status changes
CREATE OR REPLACE FUNCTION update_kyc_last_attempt_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.kyc_status IS DISTINCT FROM NEW.kyc_status THEN
    NEW.kyc_last_attempt_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to call the function
DROP TRIGGER IF EXISTS trigger_update_kyc_last_attempt_at ON profiles;
CREATE TRIGGER trigger_update_kyc_last_attempt_at
BEFORE UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.kyc_status IS DISTINCT FROM NEW.kyc_status)
EXECUTE FUNCTION update_kyc_last_attempt_at(); 