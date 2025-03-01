
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

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      // In a real app, we would fetch posts from Supabase
      // Let's simulate this with a timeout
      setTimeout(() => {
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
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setLoading(false);
    }
  };

  const handleCreatePost = async (data: { text: string; image_url: string }) => {
    // In a real app, we would save the post to Supabase
    // Let's simulate this for now
    const newPost: PostData = {
      id: `${Date.now()}`,
      user_id: "current-user",
      caption: data.text,
      image_url: data.image_url || "https://source.unsplash.com/random/800x600/?business",
      created_at: new Date().toISOString(),
      profiles: {
        id: "current-user",
        username: "YourBusinessName",
        avatar_url: "https://source.unsplash.com/100x100/?portrait"
      }
    };

    setPosts([newPost, ...posts]);
    
    toast({
      title: "Post created!",
      description: "Your post has been published successfully."
    });
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
        <div className="flex flex-col lg:flex-row gap-8 pt-24 xl:pt-8 pb-16">
          {/* Left Sidebar - hidden on mobile */}
          <div className="hidden xl:block w-64 flex-shrink-0">
            <div className="sticky top-8">
              <Sidebar />
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
          
          {/* Right Sidebar */}
          <div className="w-full lg:w-80 lg:flex-shrink-0 space-y-6">
            <div className="lg:sticky lg:top-8">
              <TrendingServices />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
