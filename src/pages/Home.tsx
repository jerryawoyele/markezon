
import { useState, useEffect, useRef } from "react";
import { Post } from "@/components/home/Post";
import { CreatePost } from "@/components/home/CreatePost";
import { Sidebar, SIDEBAR_ITEMS } from "@/components/home/Sidebar";
import { TrendingServices } from "@/components/home/TrendingServices";
import { MobileHeader } from "@/components/home/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useLocation } from "react-router-dom";

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
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const path = location.pathname;
    const item = SIDEBAR_ITEMS.find(item => item.path === path);
    return item ? item.label : "Home";
  });
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/auth');
      }
    });
    
    fetchPosts();
  }, [navigate]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
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

  const handleCreatePost = async (data: { text: string; image_url: string | string[]; isTextPost: boolean }) => {
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
      
      let imageUrls = typeof data.image_url === 'string' ? [data.image_url] : data.image_url;
      
      const { data: postData, error } = await supabase
        .from('posts')
        .insert({
          caption: data.isTextPost ? null : data.text,
          image_url: data.isTextPost 
            ? JSON.stringify([`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><rect width="100%" height="100%" fill="rgb(30,30,30)"/><text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">${encodeURIComponent(data.text)}</text></svg>`]) 
            : JSON.stringify(imageUrls),
          user_id: user.data.user.id
        })
        .select();
      
      if (error) {
        throw error;
      }
      
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
    console.log("Post liked");
  };

  const handleComment = async (postId: string, comment: string) => {
    console.log(`Comment on post ${postId}: ${comment}`);
    
    toast({
      title: "Comment added",
      description: "Your comment has been added successfully."
    });
  };

  const handleShare = () => {
    toast({
      title: "Share link copied!",
      description: "The post link has been copied to your clipboard."
    });
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);
        
      if (error) throw error;
      
      setPosts(posts.filter(post => post.id !== postId));
      
      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully."
      });
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "Error deleting post",
        description: "There was an error deleting your post. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEditPost = async (postId: string, newCaption: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ caption: newCaption })
        .eq('id', postId);
        
      if (error) throw error;
      
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, caption: newCaption } : post
      ));
      
      toast({
        title: "Post updated",
        description: "Your post has been updated successfully."
      });
    } catch (error) {
      console.error("Error updating post:", error);
      toast({
        title: "Error updating post",
        description: "There was an error updating your post. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getRouteClass = () => {
    const path = location.pathname;
    
    if (path !== '/' && path !== '/index') {
      return 'pt-18 md:pt-18 lg:pt-6';
    }
    
    return 'pt-18 max-lg:pt-18';
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />
      
      <div>
        <div className={`flex flex-col md:flex-row gap-8 ${getRouteClass()} pb-16 md:pb-16`}>
          <div className="hidden lg:block w-64 flex-shrink-0">
            {/* This is just a spacer for the fixed sidebar */}
          </div>
          
          <div className="flex-1 max-w-3xl w-full space-y-6 px-4 md:px-6">
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
                    onDelete={handleDeletePost}
                    onEdit={handleEditPost}
                    currentUserId={async () => {
                      const { data } = await supabase.auth.getUser();
                      return data.user?.id || null;
                    }}
                    showDetailOnClick={false}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center text-white/60 bg-black/20 border-white/5">
                No posts yet. Be the first to post!
              </Card>
            )}
          </div>
          
          <div className="w-full md:w-80 md:flex-shrink-0 space-y-6 hidden lg:block px-4">
            <div className="md:sticky md:top-8">
              <TrendingServices />
            </div>
          </div>
        </div>
      </div>
      
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default Home;
