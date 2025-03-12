-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "user_id" UUID NOT NULL REFERENCES "public"."profiles"("id"),
    "actor_id" UUID REFERENCES "public"."profiles"("id"),
    "actor_name" TEXT,
    "type" TEXT NOT NULL,
    "entity_id" UUID,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY ("id")
);

-- Enable Row Level Security
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

-- Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON "public"."notifications" ("user_id");
CREATE INDEX IF NOT EXISTS notifications_actor_id_idx ON "public"."notifications" ("actor_id");
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON "public"."notifications" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON "public"."notifications" ("is_read");

-- Add trigger for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON "public"."notifications"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Policy for selecting notifications: users can only view notifications meant for them
CREATE POLICY "Users can view their own notifications"
ON "public"."notifications"
FOR SELECT
USING (
    auth.uid() = user_id
);

-- Policy for inserting notifications: authenticated users can create notifications
CREATE POLICY "Users can create notifications"
ON "public"."notifications"
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
);

-- Policy for updating notifications: users can only update their own notifications
CREATE POLICY "Users can update their own notifications"
ON "public"."notifications"
FOR UPDATE
USING (
    auth.uid() = user_id
)
WITH CHECK (
    auth.uid() = user_id
);

-- Policy for deleting notifications: users can only delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON "public"."notifications"
FOR DELETE
USING (
    auth.uid() = user_id
);

-- Create a function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_as_read(notification_ids UUID[])
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  UPDATE public.notifications
  SET is_read = TRUE
  WHERE id = ANY(notification_ids)
  AND user_id = auth.uid()
  RETURNING id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS VOID AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE
  WHERE user_id = auth.uid()
  AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE "public"."notifications" IS 'Stores user notifications for various events like bookings, messages, etc.';
COMMENT ON COLUMN "public"."notifications"."user_id" IS 'The ID of the user who will receive the notification';
COMMENT ON COLUMN "public"."notifications"."actor_id" IS 'The ID of the user who triggered the notification (if applicable)';
COMMENT ON COLUMN "public"."notifications"."actor_name" IS 'The display name of the actor (stored to avoid joins)';
COMMENT ON COLUMN "public"."notifications"."type" IS 'The type of notification (e.g., booking, message, like)';
COMMENT ON COLUMN "public"."notifications"."entity_id" IS 'The ID of the related entity (e.g., booking_id, message_id)';
COMMENT ON COLUMN "public"."notifications"."is_read" IS 'Whether the notification has been read by the user';

-- Grant access to authenticated users
GRANT ALL ON "public"."notifications" TO authenticated;
GRANT USAGE ON SCHEMA "public" TO authenticated; 