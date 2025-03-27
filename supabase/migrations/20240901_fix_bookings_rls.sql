-- Fix RLS policies for the bookings table to allow customers to update their own bookings
-- This addresses the error: "new row violates row-level security policy for table "bookings""

-- First, let's ensure RLS is enabled on the bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Bookings select policy" ON bookings;
DROP POLICY IF EXISTS "Bookings insert policy" ON bookings;
DROP POLICY IF EXISTS "Bookings update policy" ON bookings;
DROP POLICY IF EXISTS "Bookings delete policy" ON bookings;

-- Create a select policy that allows:
-- 1. The customer to see their own bookings
-- 2. The provider to see bookings for their services
CREATE POLICY "Bookings select policy" ON bookings
    FOR SELECT USING (
        auth.uid() = customer_id OR 
        auth.uid() = provider_id OR
        auth.uid() IN (
            SELECT id FROM profiles WHERE user_role = 'admin'
        )
    );

-- Create an insert policy that allows:
-- 1. Any authenticated user to create a booking
CREATE POLICY "Bookings insert policy" ON bookings
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = customer_id
    );

-- Create an update policy that allows:
-- 1. The customer to update their own bookings (including confirming service completion)
-- 2. The provider to update bookings for their services
CREATE POLICY "Bookings update policy" ON bookings
    FOR UPDATE USING (
        auth.uid() = customer_id OR 
        auth.uid() = provider_id OR
        auth.uid() IN (
            SELECT id FROM profiles WHERE user_role = 'admin'
        )
    );

-- Create a delete policy that allows:
-- 1. The customer to delete their own bookings (rare, but possible during cancellation)
-- 2. The provider to delete bookings for their services (rare, but needed for cleanup)
CREATE POLICY "Bookings delete policy" ON bookings
    FOR DELETE USING (
        auth.uid() = customer_id OR 
        auth.uid() = provider_id OR
        auth.uid() IN (
            SELECT id FROM profiles WHERE user_role = 'admin'
        )
    );

-- Make sure the customer_feedback column exists (referenced in CustomerConfirmationModal.tsx)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS customer_feedback TEXT;

-- Add comment to explain the column's purpose
COMMENT ON COLUMN bookings.customer_feedback IS 'Feedback provided by the customer when confirming service completion';

-- Add an index for searching in customer feedback (optional, but helpful for performance)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_feedback ON bookings USING GIN (to_tsvector('english', customer_feedback));

-- Optional: Add triggers for automatic time updates
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column if it doesn't exist
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Add trigger to update the updated_at timestamp
DROP TRIGGER IF EXISTS set_timestamp ON bookings;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
