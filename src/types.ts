/**
 * Represents a user profile in the application.
 * The profiles table is the main user table in the database.
 */
export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  about_business: string | null;
  business_name?: string | null;
  user_role: "business" | "customer" | null;
  onboarding_completed: boolean;
  followers_count: number;
  following_count: number;
  reviews_count: number;
  reviews_rating: number;
  created_at: string;
  updated_at: string;
  auth_metadata: any; // OAuth metadata when available
  kyc_verified?: boolean;
  kyc_status?: string;
  kyc_provider?: string;
  kyc_reference_id?: string;
  // Add other profile fields...
}

export interface Post {
  id: string;
  user_id: string;
  caption: string | null;
  image_url: string;
  created_at: string;
  profiles: Profile;
  // Add other post fields...
} 