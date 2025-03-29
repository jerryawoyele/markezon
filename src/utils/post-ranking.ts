import { Post, Profile, PromotedPost } from '@/types';

interface PostWithScore extends Post {
  score: number;
  isPromoted?: boolean;
  promotionLevel?: 'basic' | 'premium' | 'featured';
}

interface UserInteraction {
  userId: string;
  postId: string;
  type: 'like' | 'comment' | 'view';
  timestamp: string;
}

/**
 * Calculate the base score for a post based on recency, engagement, and quality
 */
export const calculateBaseScore = (
  post: Post, 
  likesCount: number = 0, 
  commentsCount: number = 0, 
  userInteractions: UserInteraction[] = []
): number => {
  // 1. Recency factor (newer posts get higher scores)
  const createdAt = new Date(post.created_at || Date.now());
  const now = new Date();
  const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 100 - Math.log(ageInHours + 1) * 10);
  
  // 2. Engagement factor
  const likesScore = Math.min(50, likesCount * 2);
  const commentsScore = Math.min(50, commentsCount * 3);
  
  // 3. Content quality factor
  const hasImage = post.image_url && post.image_url !== '' ? 20 : 0;
  const captionLength = post.caption ? Math.min(15, post.caption.length / 20) : 0;
  const qualityScore = hasImage + captionLength;
  
  // 4. User interactions (personalized relevance)
  const userInteractionScore = calculateUserInteractionScore(post.id, userInteractions);
  
  // 5. Profile quality (verified business accounts get a small boost)
  const profileScore = calculateProfileScore(post.profiles);
  
  // Calculate total score with weights
  const totalScore = (
    recencyScore * 0.4 +  // Recency is important
    likesScore * 0.15 +   // Engagement metrics matter
    commentsScore * 0.15 +
    qualityScore * 0.1 +  // Content quality provides a boost
    userInteractionScore * 0.1 + // Personalization
    profileScore * 0.1     // Profile quality
  );
  
  return Math.round(totalScore * 100) / 100;
};

/**
 * Calculate a score based on user's past interactions with posts
 */
const calculateUserInteractionScore = (postId: string, interactions: UserInteraction[]): number => {
  // If no interactions data available, return neutral score
  if (!interactions.length) return 0;
  
  // Filter interactions related to this post
  const postInteractions = interactions.filter(i => i.postId === postId);
  
  // If no direct interactions with this post
  if (!postInteractions.length) return 0;
  
  // Calculate score based on interaction types (likes > comments > views)
  let score = 0;
  postInteractions.forEach(interaction => {
    switch (interaction.type) {
      case 'like':
        score += 10;
        break;
      case 'comment':
        score += 15;
        break;
      case 'view':
        score += 5;
        break;
    }
  });
  
  return Math.min(50, score);
};

/**
 * Calculate score based on profile quality
 */
const calculateProfileScore = (profile?: Profile): number => {
  if (!profile) return 0;
  
  let score = 0;
  
  // Business accounts get a slight boost
  if (profile.user_role === 'business') score += 5;
  
  // Verified businesses get an additional boost
  if (profile.kyc_verified) score += 10;
  
  // Accounts with good ratings get a boost
  if (profile.reviews_rating && profile.reviews_rating > 4) {
    score += Math.min(15, profile.reviews_rating * 3);
  }
  
  // Accounts with more followers get a small boost (capped)
  if (profile.followers_count) {
    score += Math.min(15, Math.log(profile.followers_count + 1) * 2);
  }
  
  return Math.min(40, score);
};

/**
 * Add promotion boost to post scores
 */
export const applyPromotionBoost = (
  posts: Post[], 
  promotedPosts: PromotedPost[]
): PostWithScore[] => {
  const now = new Date();
  
  // Create a map of post IDs to promotion details for quick lookup
  const promotionMap = new Map<string, PromotedPost>();
  promotedPosts.forEach(promo => {
    const startDate = new Date(promo.starts_at);
    const endDate = new Date(promo.ends_at);
    
    // Only include active promotions
    if (startDate <= now && endDate >= now) {
      promotionMap.set(promo.post_id, promo);
    }
  });
  
  // Add scores and promotion details to posts
  return posts.map(post => {
    const promoDetails = promotionMap.get(post.id);
    let baseScore = 0; // This would be calculated elsewhere based on engagement metrics
    
    // Apply promotion boost based on level
    if (promoDetails) {
      switch (promoDetails.promotion_level) {
        case 'basic':
          baseScore += 25;
          break;
        case 'premium':
          baseScore += 50;
          break;
        case 'featured':
          baseScore += 75;
          break;
      }
      
      return {
        ...post,
        score: baseScore,
        isPromoted: true,
        promotionLevel: promoDetails.promotion_level
      };
    }
    
    return {
      ...post,
      score: baseScore,
      isPromoted: false
    };
  });
};

/**
 * Create a balanced feed with regular and promoted posts
 */
export const createBalancedFeed = (
  regularPosts: PostWithScore[], 
  promotedPosts: PostWithScore[], 
  maxPromotedRatio = 0.2
): PostWithScore[] => {
  // Sort posts by score (highest first)
  const sortedRegular = [...regularPosts].sort((a, b) => b.score - a.score);
  const sortedPromoted = [...promotedPosts].sort((a, b) => b.score - a.score);
  
  const totalPosts = regularPosts.length + promotedPosts.length;
  const maxPromotedCount = Math.ceil(totalPosts * maxPromotedRatio);
  
  // Limit number of promoted posts based on the ratio
  const promotedToUse = sortedPromoted.slice(0, maxPromotedCount);
  
  // Calculate how many regular posts to show between each promoted post
  const regularBetweenPromoted = Math.max(
    1,
    Math.floor(sortedRegular.length / (promotedToUse.length + 1))
  );
  
  // Build balanced feed
  const balancedFeed: PostWithScore[] = [];
  let regularIndex = 0;
  let promotedIndex = 0;
  
  while (regularIndex < sortedRegular.length || promotedIndex < promotedToUse.length) {
    // Add regular posts batch
    for (let i = 0; i < regularBetweenPromoted && regularIndex < sortedRegular.length; i++) {
      balancedFeed.push(sortedRegular[regularIndex++]);
    }
    
    // Add a promoted post if available
    if (promotedIndex < promotedToUse.length) {
      balancedFeed.push(promotedToUse[promotedIndex++]);
    }
  }
  
  return balancedFeed;
};

/**
 * Get recommended posts for a user based on their interactions and profile
 */
export const getRecommendedPosts = (
  allPosts: Post[],
  userId: string,
  userInteractions: UserInteraction[] = [],
  promotedPosts: PromotedPost[] = [],
  likesMap: Record<string, number> = {},
  commentsMap: Record<string, number> = {}
): Post[] => {
  // Calculate scores for all posts
  const postsWithScores = allPosts.map(post => ({
    ...post,
    score: calculateBaseScore(
      post, 
      likesMap[post.id] || 0, 
      commentsMap[post.id] || 0,
      userInteractions
    )
  }));
  
  // Apply promotion boosts
  const boostedPosts = applyPromotionBoost(allPosts, promotedPosts);
  
  // Separate regular and promoted posts
  const regular = boostedPosts.filter(post => !post.isPromoted);
  const promoted = boostedPosts.filter(post => post.isPromoted);
  
  // Create balanced feed
  const balancedFeed = createBalancedFeed(regular, promoted);
  
  return balancedFeed;
}; 