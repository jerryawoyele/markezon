import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types";

/**
 * Updates a profile's reviews count and average rating
 * @param userId The user ID to update reviews for
 * @returns An object with reviews_count and reviews_rating
 */
export const updateProfileReviews = async (userId: string): Promise<{ 
  reviews_count: number;
  reviews_rating: number | null;
}> => {
  try {
    // Fetch all reviews for this user
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('user_id', userId);
      
    if (error) {
      console.error("Error fetching reviews data:", error);
      return { reviews_count: 0, reviews_rating: null };
    }
    
    // Calculate count and average
    const count = data?.length || 0;
    let avgRating = null;
    
    if (count > 0) {
      const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
      avgRating = totalRating / count;
    }
    
    // Update the profile
    if (userId) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          reviews_count: count,
          reviews_rating: avgRating
        })
        .eq('id', userId);
        
      if (updateError) {
        console.error("Error updating profile reviews data:", updateError);
      }
    }
    
    return {
      reviews_count: count,
      reviews_rating: avgRating
    };
  } catch (err) {
    console.error("Error in updateProfileReviews:", err);
    return { reviews_count: 0, reviews_rating: null };
  }
};

/**
 * Gets the formatted reviews text for a profile
 * @param profile The profile to get reviews for
 * @returns A string like "4.5 (10 reviews)"
 */
export const getReviewsText = (profile: Profile): string => {
  if (!profile.reviews_count || profile.reviews_count === 0) {
    return "No reviews yet";
  }
  
  const rating = profile.reviews_rating?.toFixed(1) || "0.0";
  const count = profile.reviews_count;
  return `${rating} (${count} ${count === 1 ? 'review' : 'reviews'})`;
}; 