
export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  updated_at: string | null;
  about_business?: string | null;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  reviews_count?: number;
  reviews_rating?: number;
}

export interface Post {
  id: string;
  caption: string | null;
  image_url: string;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
  profiles?: Profile;
}

export interface Comment {
  id: string;
  content: string;
  created_at: string | null;
  post_id: string | null;
  user_id: string | null;
  profiles?: Profile;
}

export interface Like {
  id: string;
  post_id: string | null;
  user_id: string | null;
  created_at: string | null;
}

export interface ServiceType {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  business?: string | null;
  price?: string | null;
  features?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}
