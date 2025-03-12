-- Create services table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "owner_id" UUID NOT NULL REFERENCES "public"."profiles"("id"),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" NUMERIC NOT NULL,
    "category" TEXT NOT NULL,
    "image" TEXT,
    PRIMARY KEY ("id")
);

-- Enable Row Level Security
ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;

-- Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS services_owner_id_idx ON "public"."services" ("owner_id");
CREATE INDEX IF NOT EXISTS services_category_idx ON "public"."services" ("category");

-- Policy for selecting services: everyone can view services (public)
CREATE POLICY "Services are viewable by everyone"
ON "public"."services"
FOR SELECT
USING (true);

-- Policy for inserting services: authenticated users can create services
CREATE POLICY "Users can create their own services"
ON "public"."services"
FOR INSERT
WITH CHECK (
    auth.uid() = owner_id
);

-- Policy for updating services: users can only update their own services
CREATE POLICY "Users can update their own services"
ON "public"."services"
FOR UPDATE
USING (
    auth.uid() = owner_id
)
WITH CHECK (
    auth.uid() = owner_id
);

-- Policy for deleting services: users can only delete their own services
CREATE POLICY "Users can delete their own services"
ON "public"."services"
FOR DELETE
USING (
    auth.uid() = owner_id
);

-- Comment on the table
COMMENT ON TABLE "public"."services" IS 'Stores services offered by business users';

-- Grant access to authenticated users
GRANT ALL ON "public"."services" TO authenticated;
GRANT SELECT ON "public"."services" TO anon;
GRANT USAGE ON SCHEMA "public" TO authenticated;
GRANT USAGE ON SCHEMA "public" TO anon; 