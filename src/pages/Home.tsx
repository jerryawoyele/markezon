
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/home/Sidebar";
import { CreatePost } from "@/components/home/CreatePost";
import { Post } from "@/components/home/Post";
import { TrendingServices } from "@/components/home/TrendingServices";
import { MobileHeader } from "@/components/home/MobileHeader";
import { useToast } from "@/components/ui/use-toast";

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
  profiles: Profile | null;
}

const Home = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState("Home");
  const [postText, setPostText] = useState("");
  const [postImage, setPostImage] = useState("");
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
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
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

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 xl:ml-72">
        <MobileHeader />
        
        <div className="max-w-[100vw] mx-auto px-4">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr,400px] gap-10">
            {/* Feed Column */}
            <div className="space-y-6 xl:pr-12 my-8">
              <CreatePost
                postText={postText}
                postImage={postImage}
                setPostText={setPostText}
                setPostImage={setPostImage}
              />

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-64 bg-white/5 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                posts.map((post) => (
                  <Post key={post.id} {...post} />
                ))
              )}
            </div>

            {/* Right Sidebar - Hidden on mobile */}
            <div className="hidden xl:block border-l border-white/10 pl-8 my-8">
              <TrendingServices />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
