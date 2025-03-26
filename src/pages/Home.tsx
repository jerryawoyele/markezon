import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Post } from "@/components/home/Post";
import { MobileHeader } from "@/components/home/MobileHeader";
import { CreatePost } from "@/components/home/CreatePost";
import { TrendingServices } from "@/components/home/TrendingServices";
import { supabase } from "@/integrations/supabase/client";
import type { Profile as ProfileType, Post as PostType } from "@/types";
import { syncUserProfile } from '@/utils/auth';
import { MainLayout } from "@/layouts/MainLayout";
import { Loader2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [activeTab, setActiveTab] = useState("Home");
  const [posts, setPosts] = useState<PostType[]>([]);
  const [randomPosts, setRandomPosts] = useState<PostType[]>([]);
  const [profiles, setProfiles] = useState<ProfileType[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<"business" | "customer" | null>(null);
  const navigate = useNavigate();
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingRandomPosts, setLoadingRandomPosts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingMoreRandom, setLoadingMoreRandom] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [hasMoreRandomPosts, setHasMoreRandomPosts] = useState(true);
  const [allRecentPostsViewed, setAllRecentPostsViewed] = useState(false);
  const [page, setPage] = useState(1);
  const [randomPage, setRandomPage] = useState(1);
  const [followedUserIds, setFollowedUserIds] = useState<string[]>([]);
  const [hasFollowedPosts, setHasFollowedPosts] = useState(false);
  const postsPerPage = 5;

  // Check authentication first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/auth');
          return;
        }
        
        // Set user data
        const { data: userData } = await supabase.auth.getUser();
        setUser(userData.user);
        
        // Sync user profile data with auth metadata
        await syncUserProfile();
        
        // Get user role
        if (userData.user) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')  // Select all columns to avoid errors with specific column names
              .eq('id', userData.user.id)
              .single();
              
            if (!error && data) {
              // Check if user_role exists in the data
              if ('user_role' in data) {
                setUserRole(data.user_role as "business" | "customer");
              } else {
                // Default to customer if no role specified
                setUserRole("customer");
                console.warn("user_role field not found in profiles table");
              }
            }
          } catch (error) {
            console.error("Error fetching user role:", error);
            // Default to customer role
            setUserRole("customer");
          }
        }
        
        // Mark as initial loading complete
        setInitialLoading(false);
      } catch (error) {
        console.error('Error checking auth:', error);
        navigate('/auth');
      }
    };
    
    checkAuth();
  }, [navigate]);

  // Second phase: fetch followed users and initial posts
  useEffect(() => {
    // Skip if still in initial loading or no user
    if (initialLoading || !user) return;
    
    const fetchFollowedUsers = async () => {
      try {
        // Get users that the current user follows
        try {
          // Use the Supabase URL and key directly
          const supabaseUrl = "https://zrjgcanxtojemyknzfgl.supabase.co";
          const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyamdjYW54dG9qZW15a256ZmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzNTY1NjMsImV4cCI6MjA1NTkzMjU2M30.fUzRKtbcoYU6SXhB3FM2gXtn2NhI9427-U6eAF5yDdE";
          
          // Get auth session for authorization header
          const { data: { session } } = await supabase.auth.getSession();
          
          const headers: Record<string, string> = {
            'apikey': supabaseKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          };
          
          // Add authorization header if we have a session
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }
          
          console.log("Fetching follows for user ID:", user.id);
          
          const response = await fetch(
            `${supabaseUrl}/rest/v1/follows?follower_id=eq.${user.id}&select=following_id`,
            { headers }
          );
          
          if (!response.ok) {
            console.error("Error fetching follows:", response.statusText);
            // Continue with empty follows - show default posts
            await fetchRandomPostsWithExclusions([]);
            return;
          }
          
          const followsData = await response.json();
          console.log("Follows data:", followsData);
          
          // Create a list of following IDs including the current user
          let followingIds: string[] = [];
          
          if (followsData && followsData.length > 0) {
            followingIds = followsData.map(f => f.following_id);
          }
          
          // Always include current user's posts in the feed
          if (user.id && !followingIds.includes(user.id)) {
            followingIds.push(user.id);
            console.log("Adding current user to followed list:", user.id);
          }
          
          if (followingIds.length > 0) {
            setFollowedUserIds(followingIds);
            
            // Fetch posts from followed users and current user
            const result = await fetchPosts(followingIds, 1);
            
            // If no posts from followed users or self, fetch random posts
            if (!result.hasAnyPosts) {
              await fetchRandomPostsWithExclusions([]);
            } else {
              // Also fetch some random posts to show below the followed posts
              // CRITICAL: Pass the actual posts to ensure proper exclusion
              setLoadingRandomPosts(true);
              await fetchRandomPostsWithExclusions(result.posts);
            }
          } else {
            // If not following anyone (shouldn't happen now), show random posts
            console.log("No users to follow, showing random posts");
            await fetchRandomPostsWithExclusions([]);
          }
        } catch (err) {
          console.error("Error in follows query:", err);
          await fetchRandomPostsWithExclusions([]);
        }
      } catch (error) {
        console.error("Error in fetchFollowedUsers:", error);
        setLoadingPosts(false);
        setLoadingRandomPosts(false);
      }
    };
    
    fetchFollowedUsers();
  }, [initialLoading, user]);

  const fetchPosts = async (userIds: string[], pageNum: number, isLoadMore = false) => {
    // No need to add current user ID here anymore as we've already included it in the userIds list
    let idsToFetch = [...userIds];
    
    if (idsToFetch.length === 0) {
      setLoadingPosts(false);
      setHasFollowedPosts(false);
      return { hasAnyPosts: false, posts: [] };
    }
    
    console.log("Fetching posts for users:", idsToFetch);
    
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoadingPosts(true);
      }
      
      // Calculate pagination limits
      const from = (pageNum - 1) * postsPerPage;
      const to = from + postsPerPage - 1;
      
      // Fetch posts from followed users and current user
      const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            *,
            profiles (
              id,
              username,
              avatar_url,
              bio,
              updated_at,
              about_business,
              followers_count,
              following_count,
              reviews_count,
              reviews_rating
            )
          `)
        .in('user_id', idsToFetch)
        .order('created_at', { ascending: false })
        .range(from, to);

        if (postsError) {
          console.error("Error fetching posts:", postsError);
        setLoadingPosts(false);
        setLoadingMore(false);
        setHasFollowedPosts(false);
        return { hasAnyPosts: false, posts: [] };
        }

        if (postsData) {
        // If we got fewer posts than the limit, there are no more posts
        if (postsData.length < postsPerPage) {
          setHasMorePosts(false);
          
          // Only set all posts viewed if we've loaded at least one page
          if (pageNum > 1 || postsData.length === 0) {
            setAllRecentPostsViewed(true);
          }
        } else {
          setHasMorePosts(true);
        }
        
        const hasAnyPosts = postsData.length > 0;
        setHasFollowedPosts(hasAnyPosts);
        
        const newPosts = postsData as unknown as PostType[];
        
        if (isLoadMore) {
          // Append to existing posts
          setPosts(prev => [...prev, ...newPosts]);
        } else {
          // Replace existing posts
          setPosts(newPosts);
        }
        
        setLoadingMore(false);
        setLoadingPosts(false);
        
        // Important: Return both the boolean and the actual posts data
        return { hasAnyPosts, posts: newPosts };
      } else {
        setLoadingMore(false);
        setLoadingPosts(false);
        setHasFollowedPosts(false);
        return { hasAnyPosts: false, posts: [] };
        }
      } catch (error) {
      console.error("Error in fetchPosts:", error);
      setLoadingPosts(false);
      setLoadingMore(false);
      setHasFollowedPosts(false);
      return { hasAnyPosts: false, posts: [] };
    }
  };

  // New function to fetch random posts with proper exclusions
  const fetchRandomPostsWithExclusions = async (postsToExclude: PostType[]) => {
    try {
      setLoadingRandomPosts(true);
      
      // Get all posts from followed users and the current user
      const userIdsToExcludeFrom = [...followedUserIds];
      
      // Also exclude posts from current user
      if (user?.id) {
        userIdsToExcludeFrom.push(user.id);
      }
      
      console.log("Will exclude posts from these users:", userIdsToExcludeFrom);
      
      // First, fetch ALL posts from followed users to get their IDs
      let allPostIdsToExclude = new Set(postsToExclude.map(post => post.id));
      
      if (userIdsToExcludeFrom.length > 0) {
        const { data: followedUserPosts, error: followedPostsError } = await supabase
          .from('posts')
          .select('id')
          .in('user_id', userIdsToExcludeFrom);
        
        if (followedPostsError) {
          console.error("Error fetching posts from followed users:", followedPostsError);
        } else if (followedUserPosts) {
          // Add these post IDs to our exclusion set
          followedUserPosts.forEach(post => allPostIdsToExclude.add(post.id));
          console.log(`Found ${followedUserPosts.length} total posts from followed users to exclude`);
        }
      }
      
      console.log(`Total posts to exclude: ${allPostIdsToExclude.size}`);
      
      // Now, fetch posts without using the problematic .not().in() for user_ids
      // Instead, we'll fetch a larger set of random posts
      const { data: randomPosts, error: randomPostsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url,
            bio,
            updated_at,
            about_business,
            followers_count,
            following_count,
            reviews_count,
            reviews_rating
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);  // Fetch extra to ensure we have enough after filtering

      if (randomPostsError) {
        console.error("Error fetching random posts:", randomPostsError);
        setLoadingRandomPosts(false);
        return;
      }

      if (!randomPosts || randomPosts.length === 0) {
        setRandomPosts([]);
        setLoadingRandomPosts(false);
        return;
      }

      // Filter out any posts from followed users or already displayed posts
      const finalFilteredPosts = randomPosts.filter(post => {
        // Skip if the post ID is in our exclusion set
        if (allPostIdsToExclude.has(post.id)) {
          return false;
        }
        
        // Skip if the post's user_id is in our userIdsToExcludeFrom array
        if (userIdsToExcludeFrom.includes(post.user_id)) {
          return false;
        }
        
        return true;
      }).slice(0, postsPerPage);
      
      console.log(`Final random posts after filtering: ${finalFilteredPosts.length}`);
      
      // Set the random posts
      setRandomPosts(finalFilteredPosts as unknown as PostType[]);
      setLoadingRandomPosts(false);
    } catch (error) {
      console.error("Error in fetchRandomPostsWithExclusions:", error);
      setLoadingRandomPosts(false);
    }
  };

  // Update the fetchRandomPosts function to use fetchRandomPostsWithExclusions
  const fetchRandomPosts = async (pageNum: number, isLoadMore = false) => {
    // This function now just calls the new function with the current posts
    return fetchRandomPostsWithExclusions(posts);
  };

  const loadMorePosts = () => {
    if (!loadingMore && hasMorePosts) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(followedUserIds, nextPage, true);
    }
  };
  
  const loadMoreRandomPosts = () => {
    if (!loadingMoreRandom && hasMoreRandomPosts) {
      const nextPage = randomPage + 1;
      setRandomPage(nextPage);
      fetchRandomPosts(nextPage, true);
    }
  };

  const handlePostSubmit = async (data: { text: string; image_url: string | string[]; isTextPost: boolean }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        console.error("User not authenticated");
        return;
      }

      // Create the new post in the database
      const { data: newPostData, error } = await supabase
        .from('posts')
        .insert({
          caption: data.text,
          image_url: data.isTextPost ? data.text : Array.isArray(data.image_url) ? JSON.stringify(data.image_url) : data.image_url,
          user_id: userId
        })
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url,
            bio,
            updated_at,
            about_business,
            followers_count,
            following_count,
            reviews_count,
            reviews_rating
          )
        `)
        .single();

      if (error) {
        console.error("Error creating post:", error);
        return;
      }

      if (newPostData) {
        // Create a new post object with user metadata from auth
        const enhancedPost = {
          ...newPostData,
          // Create an enhanced profiles object with metadata from auth
          profiles: {
            ...newPostData.profiles,
            // Add auth user metadata as a separate property
            auth_metadata: userData.user?.user_metadata
          }
        };
        
        // Cast to resolve the type error and add to posts
        setPosts(prevPosts => [enhancedPost as unknown as PostType, ...prevPosts]);
      }
    } catch (error) {
      console.error("Error in handlePostSubmit:", error);
    }
  };

  const refreshPosts = () => {
    // Reset pagination
    setPage(1);
    setRandomPage(1);
    setAllRecentPostsViewed(false);
    
    // Clear posts
    setPosts([]);
    setRandomPosts([]);
    
    // Re-fetch followed posts, ensuring current user is included
    let idsToFetch = [...followedUserIds];
    
    // Make sure current user's posts are included
    if (user && user.id && !idsToFetch.includes(user.id)) {
      idsToFetch.push(user.id);
    }
    
    if (idsToFetch.length > 0) {
      fetchPosts(idsToFetch, 1)
        .then(result => {
          // Also refresh random posts, using the actual posts data
          fetchRandomPostsWithExclusions(result.posts || []);
        });
    } else {
      // If not following anyone, just refresh random posts
      fetchRandomPostsWithExclusions([]);
    }
  };
  
  // Render home page with inline loading states
  return (
    <MainLayout activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole}>
      {initialLoading ? (
        <div className="flex-1 mx-auto pt-4 pb-20">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 flex flex-col gap-6 px-4">
              <MobileHeader />
              
              <div className="flex flex-col gap-8">
                <Skeleton className="w-full h-32 rounded-lg" />
                
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="w-full pb-6 rounded-lg overflow-hidden">
                    <div className="p-4 bg-black/20 flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-64 w-full" />
                    <div className="p-4 bg-black/20 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="hidden lg:block w-80">
                <div className="w-full h-96 bg-black/20 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ) : (
      <div className="flex-1 mx-auto pt-4 pb-20">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 flex flex-col">
            <MobileHeader />
            <div className="mb-5">
              <CreatePost onSubmit={handlePostSubmit} className="mx-0 lg:mx-0" />
            </div>
                
            {/* Followed users posts section */}
            {loadingPosts ? (
              <div className="space-y-4">
                {Array(2).fill(0).map((_, i) => (
                  <div key={i} className="w-full rounded-lg overflow-hidden">
                    <div className="p-4 bg-black/20 flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-48 w-full" />
                    <div className="p-4 bg-black/20 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-6">
                {/* <div className="bg-black/10 p-2 rounded-md text-center text-sm text-white/80">
                  Posts from users you follow
                </div> */}
                
                {posts.map((post) => (
                  <Post
                    key={post.id}
                    {...post}
                    profiles={post.profiles}
                    currentUserId={async () => user?.id} 
                  />
                ))}
                
                {/* Load more button for followed posts */}
                {hasMorePosts && (
                  <div className="flex justify-center mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadMorePosts}
                      disabled={loadingMore}
                      className="opacity-80 hover:opacity-100"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load more posts"
                      )}
                    </Button>
                  </div>
                )}
                
                {allRecentPostsViewed && (
                  <Card className="p-6 text-center">
                    <p className="text-sm mb-2 text-white/70">
                      You've viewed all recent posts from users you follow
                    </p>
                  </Card>
                )}
              </div>
            ) : followedUserIds.length > 0 ? (
              <Card className="p-6 text-center">
                <p className="text-lg font-semibold mb-2">No posts yet from users you follow</p>
                <p className="text-sm mb-4 text-white/70">
                  Users you follow haven't posted anything yet. Follow more users or create your own posts.
                </p>
                <div className="flex justify-center gap-3">
                  <Button onClick={() => navigate('/discover')} variant="outline" size="sm">
                    Discover Users
                  </Button>
                  <Button onClick={() => setActiveTab("Create")} size="sm">
                    Create Post
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-lg font-semibold mb-2">Your feed is empty</p>
                <p className="text-sm mb-4 text-white/70">
                  Follow users to see their posts in your feed or create your own posts.
                </p>
                <div className="flex justify-center gap-3">
                  <Button onClick={() => navigate('/discover')} variant="outline" size="sm">
                    Discover Users
                  </Button>
                  <Button onClick={() => setActiveTab("Create")} size="sm">
                    Create Post
                  </Button>
                </div>
              </Card>
            )}
            
            {/* Random posts section */}
            {(followedUserIds.length === 0 || !hasFollowedPosts || randomPosts.length > 0) && (
              <div className="mt-8 space-y-6">
                <div className="border-b border-white/10 pb-2 mb-6"></div>
                
                <div className="bg-black/10 p-2 rounded-md text-center text-sm text-white/80">
                  Discover more posts
                </div>
                
                {loadingRandomPosts && randomPosts.length === 0 ? (
                  <div className="space-y-4">
                    {Array(2).fill(0).map((_, i) => (
                      <div key={i} className="w-full rounded-lg overflow-hidden">
                        <div className="p-4 bg-black/20 flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <Skeleton className="h-48 w-full" />
                        <div className="p-4 bg-black/20 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : randomPosts.length > 0 ? (
                  <>
                    {randomPosts.map((post) => (
                      <Post 
                        key={post.id}
                        {...post}
                        profiles={post.profiles}
                        currentUserId={async () => user?.id} 
                  />
                ))}
                  </>
                ) : (
                  <Card className="p-6 text-center">
                    <p className="text-sm mb-2 text-white/70">
                      No additional posts to display at this time
                    </p>
                  </Card>
                )}
              </div>
            )}
          </div>
          
          <div className="hidden lg:block w-80">
            <div className="sticky top-14">
              <TrendingServices />
            </div>
          </div>
        </div>
      </div>
    )}
    </MainLayout>
  );
}
