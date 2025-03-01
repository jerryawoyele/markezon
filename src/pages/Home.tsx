
import { useState, useEffect } from "react";
import { Post } from "@/components/home/Post";
import { CreatePost } from "@/components/home/CreatePost";
import { Sidebar } from "@/components/home/Sidebar";
import { TrendingServices } from "@/components/home/TrendingServices";
import { MobileHeader } from "@/components/home/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

interface PostData {
  id: string;
  user_id: string;
  caption: string | null;
  image_url: string;
  created_at: string;
  profiles: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
}

const Home = () => {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("Home");

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      // Fetch real posts from Supabase
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          caption,
          image_url,
          created_at,
          user_id,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        setPosts(data as PostData[]);
      } else {
        // If no posts are found, use mock data as fallback
        const mockPosts: PostData[] = [
          {
            id: "1",
            user_id: "user1",
            caption: "Excited to launch our new web development service! #webdev #coding",
            image_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop",
            created_at: new Date().toISOString(),
            profiles: {
              id: "user1",
              username: "TechStudio",
              avatar_url: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&auto=format&fit=crop"
            }
          },
          {
            id: "2",
            user_id: "user2",
            caption: "Check out this brand identity design we just completed for a local coffee shop. Really proud of how the logo turned out! #design #branding",
            image_url: "https://images.unsplash.com/photo-1583511655826-05700442976b?w=800&auto=format&fit=crop",
            created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            profiles: {
              id: "user2",
              username: "CreativeDesigns",
              avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop"
            }
          },
          {
            id: "3",
            user_id: "user3",
            caption: "Just finished this photography session for a client's product line. Natural light makes all the difference! #photography #productphoto",
            image_url: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&auto=format&fit=crop",
            created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            profiles: {
              id: "user3",
              username: "VisualsbyJane",
              avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop"
            }
          }
        ];
        
        setPosts(mockPosts);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setLoading(false);
    }
  };

  const handleCreatePost = async (data: { text: string; image_url: string }) => {
    try {
      const user = await supabase.auth.getUser();
      
      if (!user.data.user) {
        toast({
          title: "Authentication required",
          description: "You need to be logged in to create a post.",
          variant: "destructive"
        });
        return;
      }
      
      // Save the post to Supabase
      const { data: postData, error } = await supabase
        .from('posts')
        .insert({
          caption: data.text,
          image_url: data.image_url || "https://source.unsplash.com/random/800x600/?business",
          user_id: user.data.user.id
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      // Fetch the newly created post with profile data
      const { data: newPost, error: fetchError } = await supabase
        .from('posts')
        .select(`
          id,
          caption,
          image_url,
          created_at,
          user_id,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('id', postData[0].id)
        .single();
      
      if (fetchError) {
        throw fetchError;
      }
      
      setPosts([newPost as PostData, ...posts]);
      
      toast({
        title: "Post created!",
        description: "Your post has been published successfully."
      });
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error creating post",
        description: "There was an error creating your post. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLike = () => {
    // In a real app, we would handle likes in Supabase
    console.log("Post liked");
  };

  const handleComment = async (postId: string, comment: string) => {
    // In a real app, we would save the comment to Supabase
    console.log(`Comment on post ${postId}: ${comment}`);
    
    toast({
      title: "Comment added",
      description: "Your comment has been added successfully."
    });
  };

  const handleShare = () => {
    // In a real app, we would handle sharing
    toast({
      title: "Share link copied!",
      description: "The post link has been copied to your clipboard."
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header (visible on smaller screens) */}
      <MobileHeader />
      
      <div className="container px-4 mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 pt-24 xl:pt-8 pb-16 pb-24 md:pb-16">
          {/* Left Sidebar - hidden on mobile */}
          <div className="hidden xl:block w-64 flex-shrink-0">
            <div className="sticky top-8">
              <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 max-w-3xl mx-auto w-full space-y-6">
            <CreatePost onSubmit={handleCreatePost} />
            
            {loading ? (
              <Card className="p-8 text-center text-white/60 bg-black/20 border-white/5">
                Loading posts...
              </Card>
            ) : posts.length > 0 ? (
              <div className="space-y-6">
                {posts.map(post => (
                  <Post 
                    key={post.id} 
                    {...post}
                    onLike={handleLike}
                    onComment={handleComment}
                    onShare={handleShare}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center text-white/60 bg-black/20 border-white/5">
                No posts yet. Be the first to post!
              </Card>
            )}
          </div>
          
          {/* Right Sidebar - hidden on mobile */}
          <div className="w-full lg:w-80 lg:flex-shrink-0 space-y-6 hidden md:block">
            <div className="lg:sticky lg:top-8">
              <TrendingServices />
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-black/90 border-t border-white/10 py-3 px-2 md:hidden z-50">
        <ul className="flex justify-around">
          <li>
            <button className="flex flex-col items-center justify-center text-white/60 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs mt-1">Home</span>
            </button>
          </li>
          <li>
            <button className="flex flex-col items-center justify-center text-white/60 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-xs mt-1">Explore</span>
            </button>
          </li>
          <li>
            <button className="flex flex-col items-center justify-center text-white/60 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-xs mt-1">Messages</span>
            </button>
          </li>
          <li>
            <button className="flex flex-col items-center justify-center text-white/60 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="text-xs mt-1">Notifications</span>
            </button>
          </li>
          <li>
            <button className="flex flex-col items-center justify-center text-white/60 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs mt-1">Profile</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Home;
