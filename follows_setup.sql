-- Create follows table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."follows" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "follower_id" UUID NOT NULL REFERENCES "public"."profiles"("id"),
    "following_id" UUID NOT NULL REFERENCES "public"."profiles"("id"),
    PRIMARY KEY ("id"),
    UNIQUE ("follower_id", "following_id")
);

-- Enable Row Level Security
ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;

-- Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON "public"."follows" ("follower_id");
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON "public"."follows" ("following_id");

-- Policy for selecting follows: anyone can see who follows whom
CREATE POLICY "Anyone can view follows"
ON "public"."follows"
FOR SELECT
USING (true);

-- Policy for inserting follows: authenticated users can follow others, but not themselves
CREATE POLICY "Users can follow others but not themselves"
ON "public"."follows"
FOR INSERT
WITH CHECK (
    auth.uid() = follower_id AND
    follower_id <> following_id
);

-- Policy for deleting follows: users can only unfollow relationships they created
CREATE POLICY "Users can unfollow"
ON "public"."follows"
FOR DELETE
USING (
    auth.uid() = follower_id
);

-- Comment on the table
COMMENT ON TABLE "public"."follows" IS 'Stores follow relationships between users';

-- Grant access to authenticated users
GRANT ALL ON "public"."follows" TO authenticated;
GRANT SELECT ON "public"."follows" TO anon;
GRANT USAGE ON SCHEMA "public" TO authenticated;
GRANT USAGE ON SCHEMA "public" TO anon; 