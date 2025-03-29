-- Make sure all columns exist (in case the table was created differently)
ALTER TABLE escrow_payments
ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE escrow_payments
ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES services(id) ON DELETE SET NULL;

ALTER TABLE escrow_payments
ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;

ALTER TABLE escrow_payments
ADD COLUMN IF NOT EXISTS platform_fee numeric DEFAULT 0;

ALTER TABLE escrow_payments
ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0;

ALTER TABLE escrow_payments
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE escrow_payments
ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE escrow_payments
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

ALTER TABLE escrow_payments
ADD COLUMN IF NOT EXISTS is_external boolean DEFAULT false;

ALTER TABLE escrow_payments
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

ALTER TABLE escrow_payments
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

