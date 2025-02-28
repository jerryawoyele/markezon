
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/home/Sidebar";
import { CreatePost } from "@/components/home/CreatePost";
import { CreatePostModal } from "@/components/home/CreatePostModal";
import { Post } from "@/components/home/Post";
import { TrendingServices } from "@/components/home/TrendingServices";
import { MobileHeader } from "@/components/home/MobileHeader";
import { SearchDropdown } from "@/components/home/SearchDropdown";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  profiles: Profile;
}

const Home = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState("Home");
  const [postText, setPostText] = useState("");
  const [postImage, setPostImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);
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
      // First, check if the current user has a profile
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

      let query = supabase
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

      // If search query is present, filter posts by caption
      if (searchQuery) {
        query = query.ilike('caption', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform data to match expected type
      const transformedData = data?.map(post => ({
        ...post,
        profiles: post.profiles || {
          id: post.user_id,
          username: 'Anonymous',
          avatar_url: null
        }
      }));
      
      setPosts(transformedData || []);
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

  const handleCreatePost = async (caption: string, imageFile: File | null, type: "text" | "image") => {
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

      let imageUrl = 'https://source.unsplash.com/random/600x400/?nature';
      
      // If there's an image file, we would upload it
      // For now, just create a post with the default image or URL
      if (imageFile) {
        // In a real app, you would upload the image to your storage
        console.log("Would upload:", imageFile.name);
        
        // For demo purposes, use a random image
        imageUrl = 'https://source.unsplash.com/random/600x400/?technology';
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          caption: caption,
          image_url: imageUrl
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowSearchResults(!!query);
  };

  const handleLikePost = async (postId: string) => {
    toast({
      title: "Liked",
      description: "You liked this post",
    });
  };

  const handleCommentPost = async (postId: string, comment: string) => {
    if (!comment.trim()) return;
    
    toast({
      title: "Comment added",
      description: "Your comment has been added",
    });
  };

  const handleSharePost = async (postId: string) => {
    // In a real app, this might copy a link to clipboard or open a share dialog
    navigator.clipboard.writeText(`https://yourapp.com/posts/${postId}`);
    
    toast({
      title: "Shared",
      description: "Post link copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col xl:flex-row">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 xl:ml-72">
        <MobileHeader onSearch={handleSearch} />
        
        <div className="max-w-[100vw] mx-auto px-4 pb-20 xl:pb-0 mt-16 xl:mt-0 overflow-y-auto min-h-[calc(100vh-64px)]">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr,400px] gap-10">
            {/* Feed Column */}
            <div className="space-y-6 xl:pr-12 my-8">
              <div className="max-w-3xl mx-auto">
                <Card className="p-6 bg-black/20 border-white/5 w-full cursor-pointer hover:bg-black/30 transition-colors" onClick={() => setCreatePostOpen(true)}>
                  <div className="flex items-center gap-4">
                    <PlusCircle className="w-8 h-8 text-white/60" />
                    <div className="flex-1">
                      <h3 className="text-lg font-medium">Create a new post</h3>
                      <p className="text-white/60">Share your thoughts or upload an image</p>
                    </div>
                  </div>
                </Card>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-64 bg-white/5 rounded-lg animate-pulse" />
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
                  {searchQuery ? "No posts match your search" : "No posts yet. Be the first to create one!"}
                </div>
              )}
            </div>

            {/* Right Sidebar - Hidden on mobile */}
            <div className="hidden xl:block border-l border-white/10 pl-8 my-8">
              <TrendingServices />
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full p-2 bg-black/20 border border-white/10 rounded-md"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setShowSearchResults(true)}
                />
                <SearchDropdown 
                  searchQuery={searchQuery} 
                  show={showSearchResults} 
                  onClose={() => setShowSearchResults(false)} 
                />
              </div>
            </div>
          </div>

          <CreatePostModal
            open={createPostOpen}
            onOpenChange={setCreatePostOpen}
            onCreatePost={handleCreatePost}
          />
        </div>
      </div>
    </div>
  );
}

export default Home;
