-- Migration to add customer_feedback column to bookings table
-- This fixes the error: Could not find the 'customer_feedback' column of 'bookings' in the schema cache

-- Add the missing customer_feedback column
ALTER TABLE "bookings" 
ADD COLUMN IF NOT EXISTS "customer_feedback" TEXT;

-- Comment on the column to document its purpose
COMMENT ON COLUMN "bookings"."customer_feedback" IS 'Feedback provided by the customer when confirming service completion';

-- Add an index on the customer_feedback column for better performance when searching
CREATE INDEX IF NOT EXISTS idx_bookings_customer_feedback ON "bookings" USING GIN (to_tsvector('english', "customer_feedback")); 