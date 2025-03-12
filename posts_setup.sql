-- Create posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "user_id" UUID NOT NULL REFERENCES "public"."profiles"("id"),
    "caption" TEXT,
    "image_url" TEXT,
    PRIMARY KEY ("id")
);

-- Enable Row Level Security
ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;

-- Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON "public"."posts" ("user_id");
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON "public"."posts" ("created_at");

-- Policy for selecting posts: anyone can view posts
CREATE POLICY "Anyone can view posts"
ON "public"."posts"
FOR SELECT
USING (true);

-- Policy for inserting posts: authenticated users can create posts
CREATE POLICY "Users can create their own posts"
ON "public"."posts"
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

-- Policy for updating posts: users can only update their own posts
CREATE POLICY "Users can update their own posts"
ON "public"."posts"
FOR UPDATE
USING (
    auth.uid() = user_id
);

-- Policy for deleting posts: users can only delete their own posts
CREATE POLICY "Users can delete their own posts"
ON "public"."posts"
FOR DELETE
USING (
    auth.uid() = user_id
);

-- Comment on the table
COMMENT ON TABLE "public"."posts" IS 'Stores user posts';

-- Grant access to authenticated users
GRANT ALL ON "public"."posts" TO authenticated;
GRANT SELECT ON "public"."posts" TO anon;
GRANT USAGE ON SCHEMA "public" TO authenticated;
GRANT USAGE ON SCHEMA "public" TO anon;

-- Create likes table for post likes
CREATE TABLE IF NOT EXISTS "public"."likes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "user_id" UUID NOT NULL REFERENCES "public"."profiles"("id"),
    "post_id" UUID NOT NULL REFERENCES "public"."posts"("id"),
    PRIMARY KEY ("id"),
    UNIQUE ("user_id", "post_id")
);

-- Enable Row Level Security
ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;

-- Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS likes_user_id_idx ON "public"."likes" ("user_id");
CREATE INDEX IF NOT EXISTS likes_post_id_idx ON "public"."likes" ("post_id");

-- Policy for selecting likes: anyone can see likes
CREATE POLICY "Anyone can view likes"
ON "public"."likes"
FOR SELECT
USING (true);

-- Policy for inserting likes: authenticated users can like posts
CREATE POLICY "Users can like posts"
ON "public"."likes"
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

-- Policy for deleting likes: users can unlike posts they've liked
CREATE POLICY "Users can unlike posts"
ON "public"."likes"
FOR DELETE
USING (
    auth.uid() = user_id
);

-- Comment on the table
COMMENT ON TABLE "public"."likes" IS 'Stores user likes on posts';

-- Grant access to authenticated users
GRANT ALL ON "public"."likes" TO authenticated;
GRANT SELECT ON "public"."likes" TO anon;

-- Create comments table for post comments
CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "user_id" UUID NOT NULL REFERENCES "public"."profiles"("id"),
    "post_id" UUID NOT NULL REFERENCES "public"."posts"("id"),
    "content" TEXT NOT NULL,
    PRIMARY KEY ("id")
);

-- Enable Row Level Security
ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;

-- Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON "public"."comments" ("user_id");
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON "public"."comments" ("post_id");

-- Policy for selecting comments: anyone can see comments
CREATE POLICY "Anyone can view comments"
ON "public"."comments"
FOR SELECT
USING (true);

-- Policy for inserting comments: authenticated users can comment on posts
CREATE POLICY "Users can comment on posts"
ON "public"."comments"
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

-- Policy for updating comments: users can update their own comments
CREATE POLICY "Users can update their own comments"
ON "public"."comments"
FOR UPDATE
USING (
    auth.uid() = user_id
);

-- Policy for deleting comments: users can delete their own comments
CREATE POLICY "Users can delete their own comments"
ON "public"."comments"
FOR DELETE
USING (
    auth.uid() = user_id
);

-- Comment on the table
COMMENT ON TABLE "public"."comments" IS 'Stores user comments on posts';

-- Grant access to authenticated users
GRANT ALL ON "public"."comments" TO authenticated;
GRANT SELECT ON "public"."comments" TO anon; 