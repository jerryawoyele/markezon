-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_service_id ON reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);

-- Add a constraint to prevent users from reviewing their own services
ALTER TABLE reviews
ADD CONSTRAINT prevent_self_review
CHECK (reviewer_id != user_id);

-- Update user profile review stats when reviews are added or changed
CREATE OR REPLACE FUNCTION update_profile_reviews_stats()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC;
  total_reviews INTEGER;
BEGIN
  -- Calculate new values
  SELECT AVG(rating), COUNT(*)
  INTO avg_rating, total_reviews
  FROM reviews
  WHERE user_id = NEW.user_id;
  
  -- Update the profile with new values
  UPDATE profiles
  SET reviews_rating = avg_rating,
      reviews_count = total_reviews
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS trigger_update_profile_reviews_stats ON reviews;
CREATE TRIGGER trigger_update_profile_reviews_stats
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_profile_reviews_stats();

-- Add a comment explaining the relation
COMMENT ON TABLE reviews IS 'Stores reviews for users (typically business users), linked to both the user being reviewed and the reviewer'; 