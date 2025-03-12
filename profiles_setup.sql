-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "username" TEXT UNIQUE,
    "avatar_url" TEXT,
    "bio" TEXT,
    "about_business" TEXT,
    "user_role" TEXT DEFAULT 'customer',
    "onboarding_completed" BOOLEAN DEFAULT false,
    "auth_metadata" JSONB,
    "followers_count" INTEGER DEFAULT 0,
    "following_count" INTEGER DEFAULT 0,
    "posts_count" INTEGER DEFAULT 0,
    "reviews_count" INTEGER DEFAULT 0,
    "reviews_rating" NUMERIC DEFAULT 0,
    PRIMARY KEY ("id")
);

-- Enable Row Level Security
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS profiles_username_idx ON "public"."profiles" ("username");
CREATE INDEX IF NOT EXISTS profiles_user_role_idx ON "public"."profiles" ("user_role");

-- Trigger to create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, user_role)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url', COALESCE(new.raw_user_meta_data->>'user_role', 'customer'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Policy for selecting profiles: anyone can view profiles
CREATE POLICY "Anyone can view profiles"
ON "public"."profiles"
FOR SELECT
USING (true);

-- Policy for inserting profiles: users can create their own profile
CREATE POLICY "Users can create their own profile"
ON "public"."profiles"
FOR INSERT
WITH CHECK (
    auth.uid() = id
);

-- Policy for updating profiles: users can update their own profile
CREATE POLICY "Users can update their own profile"
ON "public"."profiles"
FOR UPDATE
USING (
    auth.uid() = id
);

-- Comment on the table
COMMENT ON TABLE "public"."profiles" IS 'Stores user profile information';

-- Grant access to authenticated users
GRANT ALL ON "public"."profiles" TO authenticated;
GRANT SELECT ON "public"."profiles" TO anon;
GRANT USAGE ON SCHEMA "public" TO authenticated;
GRANT USAGE ON SCHEMA "public" TO anon; 