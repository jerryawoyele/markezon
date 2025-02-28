
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/home/Sidebar";
import { CreatePost } from "@/components/home/CreatePost";
import { TrendingServices } from "@/components/home/TrendingServices";
import { MobileHeader } from "@/components/home/MobileHeader";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Post } from "@/components/home/Post";

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("Home");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      } else {
        fetchPosts();
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchPosts = async () => {
    try {
      // Check if the current user has a profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has a profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        // Create a profile if it doesn't exist (except for not-found errors)
        await supabase.from('profiles').insert({ id: user.id });
      }

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewPost = async ({ text, image_url }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a post",
          variant: "destructive"
        });
        return;
      }

      // Use placeholder image if none provided
      const finalImageUrl = image_url || 'https://source.unsplash.com/random/600x400/?nature';

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          caption: text,
          image_url: finalImageUrl
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post created successfully",
      });
      
      // Refetch posts to show the new one
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      });
    }
  };

  const handleLikePost = async (postId) => {
    toast({
      title: "Liked",
      description: "You liked this post",
    });
    // Add actual like functionality here
  };

  const handleCommentPost = async (postId, comment) => {
    toast({
      title: "Comment added",
      description: "Your comment has been added",
    });
    // Add actual comment functionality here
  };

  const handleSharePost = async (postId) => {
    toast({
      title: "Shared",
      description: "Post link copied to clipboard",
    });
    // Add actual share functionality here
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 xl:ml-72">
        <MobileHeader />
        
        <div className="max-w-4xl mx-auto py-8 px-4 pb-20 xl:pb-8 mt-16 xl:mt-0">
          <CreatePost onSubmit={handleNewPost} />

          <div className="space-y-6 mt-8">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <Card key={n} className="h-64 bg-black/20 border-white/5 animate-pulse" />
                ))}
              </div>
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <Post 
                  key={post.id} 
                  {...post} 
                  onLike={() => handleLikePost(post.id)}
                  onComment={handleCommentPost}
                  onShare={() => handleSharePost(post.id)}
                />
              ))
            ) : (
              <div className="text-center py-8 text-white/60">
                No posts yet. Be the first to create one!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
