-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method_id TEXT NOT NULL,
  card_last4 TEXT NOT NULL,
  card_brand TEXT NOT NULL,
  card_exp_month INTEGER NOT NULL,
  card_exp_year INTEGER NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Add RLS policies
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Policy for users to only see their own payment methods
CREATE POLICY "Users can view their own payment methods"
  ON payment_methods
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for users to insert their own payment methods
CREATE POLICY "Users can insert their own payment methods"
  ON payment_methods
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own payment methods
CREATE POLICY "Users can update their own payment methods"
  ON payment_methods
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy for users to delete their own payment methods
CREATE POLICY "Users can delete their own payment methods"
  ON payment_methods
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX payment_methods_user_id_idx ON payment_methods (user_id); 