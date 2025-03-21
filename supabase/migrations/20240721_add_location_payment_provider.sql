-- Add location and payment provider fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
ADD COLUMN IF NOT EXISTS kyc_provider VARCHAR(20),
ADD COLUMN IF NOT EXISTS preferred_payment_provider VARCHAR(20),
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS provider_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS tax_id_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tax_id_verification_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bank_account_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bank_account_last4 VARCHAR(4),
ADD COLUMN IF NOT EXISTS bank_account_bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_account_provider VARCHAR(20),
ADD COLUMN IF NOT EXISTS bank_account_verification_date TIMESTAMPTZ;

-- Add indexes for querying by location and providers
CREATE INDEX IF NOT EXISTS idx_profiles_country_code
ON profiles(country_code);

CREATE INDEX IF NOT EXISTS idx_profiles_kyc_provider
ON profiles(kyc_provider);

CREATE INDEX IF NOT EXISTS idx_profiles_preferred_payment_provider
ON profiles(preferred_payment_provider);

-- Add comments for documentation
COMMENT ON COLUMN profiles.country_code IS 'ISO 3166-1 alpha-2 country code for the user';
COMMENT ON COLUMN profiles.kyc_provider IS 'Service provider used for KYC verification (stripe, paystack)';
COMMENT ON COLUMN profiles.preferred_payment_provider IS 'User''s preferred payment provider based on location';
COMMENT ON COLUMN profiles.location_updated_at IS 'When the user''s location was last updated';
COMMENT ON COLUMN profiles.provider_updated_at IS 'When the user''s payment provider preference was last updated';
COMMENT ON COLUMN profiles.tax_id IS 'Tax ID or VAT number';
COMMENT ON COLUMN profiles.tax_id_verified IS 'Whether the tax ID has been verified';
COMMENT ON COLUMN profiles.tax_id_verification_date IS 'When the tax ID was verified';
COMMENT ON COLUMN profiles.bank_account_verified IS 'Whether the bank account has been verified';
COMMENT ON COLUMN profiles.bank_account_last4 IS 'Last 4 digits of the verified bank account';
COMMENT ON COLUMN profiles.bank_account_bank_name IS 'Name of the bank for the verified account';
COMMENT ON COLUMN profiles.bank_account_provider IS 'Provider used for bank account verification';
COMMENT ON COLUMN profiles.bank_account_verification_date IS 'When the bank account was verified'; 