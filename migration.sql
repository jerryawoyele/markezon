-- Add business_name column to profiles table
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "business_name" TEXT;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "user_role" TEXT DEFAULT 'customer';
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "kyc_status" TEXT DEFAULT 'not_started';
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "kyc_verified" BOOLEAN DEFAULT false;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "kyc_rejection_reason" TEXT;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "kyc_updated_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "email_notifications" BOOLEAN DEFAULT true;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "push_notifications" BOOLEAN DEFAULT true;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "marketing_emails" BOOLEAN DEFAULT false;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "profile_visibility" TEXT DEFAULT 'public';
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "activity_visibility" TEXT DEFAULT 'followers';

-- Create payment_methods table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "payment_method_id" TEXT NOT NULL,
    "card_last4" TEXT NOT NULL,
    "card_brand" TEXT NOT NULL,
    "card_exp_month" INTEGER NOT NULL,
    "card_exp_year" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY ("id"),
    FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

-- Add RLS policies for payment_methods
ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to avoid errors when running migration multiple times
DROP POLICY IF EXISTS "Users can view their own payment methods" ON "public"."payment_methods";
DROP POLICY IF EXISTS "Users can insert their own payment methods" ON "public"."payment_methods";
DROP POLICY IF EXISTS "Users can update their own payment methods" ON "public"."payment_methods";
DROP POLICY IF EXISTS "Users can delete their own payment methods" ON "public"."payment_methods";
DROP POLICY IF EXISTS "Business profiles are publicly viewable" ON "public"."profiles";

-- Create policies
CREATE POLICY "Users can view their own payment methods" 
    ON "public"."payment_methods" FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods" 
    ON "public"."payment_methods" FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods" 
    ON "public"."payment_methods" FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods" 
    ON "public"."payment_methods" FOR DELETE 
    USING (auth.uid() = user_id);

-- Update profiles model with business visibility
CREATE POLICY "Business profiles are publicly viewable"
    ON "public"."profiles" FOR SELECT
    USING (user_role = 'business' OR auth.uid() = id); 