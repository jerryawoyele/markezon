import { supabase } from '@/integrations/supabase/client';
import { PromotedPost, Post } from '@/types';

/**
 * Fetch active promoted posts with their associated post data
 */
export const fetchActivePromotedPosts = async (): Promise<PromotedPost[]> => {
  const now = new Date().toISOString();
  
  try {
    const { data, error } = await supabase
      .from('promoted_posts')
      .select(`
        *,
        post:posts (
          *,
          profiles (
            id,
            username,
            avatar_url,
            bio,
            user_role,
            business_name,
            kyc_verified,
            followers_count,
            reviews_rating
          )
        )
      `)
      .gte('ends_at', now)
      .lte('starts_at', now)
      .order('promotion_level', { ascending: false });
      
    if (error) {
      console.error('Error fetching promoted posts:', error);
      return [];
    }
    
    return data as PromotedPost[];
  } catch (error) {
    console.error('Exception fetching promoted posts:', error);
    return [];
  }
};

/**
 * Create a new promoted post
 */
export const createPromotedPost = async (
  postId: string,
  userId: string,
  promotionLevel: 'basic' | 'premium' | 'featured',
  startDate: Date,
  endDate: Date,
  targetAudience?: string,
  budget?: number
): Promise<PromotedPost | null> => {
  try {
    const { data, error } = await supabase
      .from('promoted_posts')
      .insert({
        post_id: postId,
        user_id: userId,
        promotion_level: promotionLevel,
        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),
        target_audience: targetAudience,
        budget: budget
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating promoted post:', error);
      return null;
    }
    
    return data as PromotedPost;
  } catch (error) {
    console.error('Exception creating promoted post:', error);
    return null;
  }
};

/**
 * Update an existing promoted post
 */
export const updatePromotedPost = async (
  id: string,
  updates: Partial<PromotedPost>
): Promise<PromotedPost | null> => {
  try {
    const { data, error } = await supabase
      .from('promoted_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating promoted post:', error);
      return null;
    }
    
    return data as PromotedPost;
  } catch (error) {
    console.error('Exception updating promoted post:', error);
    return null;
  }
};

/**
 * Delete an existing promoted post
 */
export const deletePromotedPost = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('promoted_posts')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting promoted post:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception deleting promoted post:', error);
    return false;
  }
};

/**
 * Record an impression for a promoted post
 */
export const recordImpression = async (promotedPostId: string): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('promoted_posts')
      .select('impressions')
      .eq('id', promotedPostId)
      .single();
      
    if (error || !data) {
      console.error('Error fetching promoted post for impression update:', error);
      return;
    }
    
    const currentImpressions = data.impressions || 0;
    
    await supabase
      .from('promoted_posts')
      .update({ impressions: currentImpressions + 1 })
      .eq('id', promotedPostId);
  } catch (error) {
    console.error('Exception recording impression:', error);
  }
};

/**
 * Record a click for a promoted post
 */
export const recordClick = async (promotedPostId: string): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('promoted_posts')
      .select('clicks')
      .eq('id', promotedPostId)
      .single();
      
    if (error || !data) {
      console.error('Error fetching promoted post for click update:', error);
      return;
    }
    
    const currentClicks = data.clicks || 0;
    
    await supabase
      .from('promoted_posts')
      .update({ clicks: currentClicks + 1 })
      .eq('id', promotedPostId);
  } catch (error) {
    console.error('Exception recording click:', error);
  }
};

/**
 * Get active promotions for a specific user's posts
 */
export const getUserActivePromotions = async (userId: string): Promise<PromotedPost[]> => {
  const now = new Date().toISOString();
  
  try {
    const { data, error } = await supabase
      .from('promoted_posts')
      .select(`
        *,
        post:posts (
          *,
          profiles (
            id,
            username,
            avatar_url
          )
        )
      `)
      .eq('user_id', userId)
      .gte('ends_at', now)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching user promotions:', error);
      return [];
    }
    
    return data as PromotedPost[];
  } catch (error) {
    console.error('Exception fetching user promotions:', error);
    return [];
  }
}; 