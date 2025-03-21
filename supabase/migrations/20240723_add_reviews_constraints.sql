-- Add foreign key constraints to reviews table
ALTER TABLE reviews
ADD CONSTRAINT fk_reviews_user_id FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_reviews_reviewer_id FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);

-- Add columns to the reviews table if they don't exist
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ; 