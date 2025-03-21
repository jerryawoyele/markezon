-- Create a function to get user reviews with reviewer information
CREATE OR REPLACE FUNCTION get_user_reviews(user_id_param UUID)
RETURNS TABLE(
  id UUID,
  rating INTEGER,
  content TEXT,
  created_at TIMESTAMPTZ,
  reviewer_id UUID,
  reviewer_username TEXT,
  reviewer_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.rating,
    r.content,
    r.created_at,
    r.reviewer_id,
    p.username AS reviewer_username,
    p.avatar_url AS reviewer_avatar_url
  FROM 
    reviews r
  LEFT JOIN 
    profiles p ON r.reviewer_id = p.id
  WHERE 
    r.user_id = user_id_param
  ORDER BY 
    r.created_at DESC;
END;
$$ LANGUAGE plpgsql; 