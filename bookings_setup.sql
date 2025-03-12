-- Create bookings table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "customer_id" UUID NOT NULL REFERENCES "public"."profiles"("id"),
    "service_id" UUID NOT NULL REFERENCES "public"."services"("id"),
    "provider_id" UUID NOT NULL REFERENCES "public"."profiles"("id"),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "date" TIMESTAMP WITH TIME ZONE,
    "notes" TEXT,
    PRIMARY KEY ("id")
);

-- Enable Row Level Security
ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;

-- Create index for improved query performance
CREATE INDEX IF NOT EXISTS bookings_customer_id_idx ON "public"."bookings" ("customer_id");
CREATE INDEX IF NOT EXISTS bookings_provider_id_idx ON "public"."bookings" ("provider_id");
CREATE INDEX IF NOT EXISTS bookings_service_id_idx ON "public"."bookings" ("service_id");

-- Policy for selecting bookings: users can only view bookings they are involved in as either customer or provider
CREATE POLICY "Users can view their own bookings"
ON "public"."bookings"
FOR SELECT
USING (
    auth.uid() = customer_id OR 
    auth.uid() = provider_id
);

-- Policy for inserting bookings: authenticated users can create bookings
CREATE POLICY "Users can create bookings"
ON "public"."bookings"
FOR INSERT
WITH CHECK (
    auth.uid() = customer_id
);

-- Policy for updating bookings: customers can only update their own bookings, providers can update bookings for their services
CREATE POLICY "Users can update their own bookings"
ON "public"."bookings"
FOR UPDATE
USING (
    auth.uid() = customer_id OR
    auth.uid() = provider_id
)
WITH CHECK (
    -- Customers can only update their bookings
    (auth.uid() = customer_id AND (OLD.status = 'pending' OR OLD.status = 'approved')) OR
    -- Providers can change the status of bookings for their services
    (auth.uid() = provider_id)
);

-- Policy for deleting bookings: users can only delete their own pending bookings
CREATE POLICY "Users can delete their own pending bookings"
ON "public"."bookings"
FOR DELETE
USING (
    auth.uid() = customer_id AND 
    status = 'pending'
);

-- Comment on the table
COMMENT ON TABLE "public"."bookings" IS 'Stores service booking information between customers and service providers';

-- Grant access to authenticated users
GRANT ALL ON "public"."bookings" TO authenticated;
GRANT USAGE ON SCHEMA "public" TO authenticated; 