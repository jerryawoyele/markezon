-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "sender_id" UUID NOT NULL REFERENCES "public"."profiles"("id"),
    "receiver_id" UUID NOT NULL REFERENCES "public"."profiles"("id"),
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY ("id")
);

-- Enable Row Level Security
ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;

-- Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON "public"."messages" ("sender_id");
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON "public"."messages" ("receiver_id");
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON "public"."messages" ("created_at");

-- Policy for selecting messages: users can only view messages they sent or received
CREATE POLICY "Users can view their own messages"
ON "public"."messages"
FOR SELECT
USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
);

-- Policy for inserting messages: authenticated users can send messages
CREATE POLICY "Users can send messages"
ON "public"."messages"
FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
);

-- Policy for updating messages: receivers can mark messages as read
CREATE POLICY "Receivers can mark messages as read"
ON "public"."messages"
FOR UPDATE
USING (
    auth.uid() = receiver_id
)
WITH CHECK (
    -- Only allow updates to the read field
    OLD.sender_id = NEW.sender_id AND
    OLD.receiver_id = NEW.receiver_id AND
    OLD.content = NEW.content AND
    OLD.created_at = NEW.created_at
);

-- Policy for deleting messages: users can delete messages they sent or received
CREATE POLICY "Users can delete their own messages"
ON "public"."messages"
FOR DELETE
USING (
    auth.uid() = sender_id OR
    auth.uid() = receiver_id
);

-- Comment on the table
COMMENT ON TABLE "public"."messages" IS 'Stores direct messages between users';

-- Grant access to authenticated users
GRANT ALL ON "public"."messages" TO authenticated;
GRANT USAGE ON SCHEMA "public" TO authenticated; 