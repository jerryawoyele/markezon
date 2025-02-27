
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/home/Sidebar";
import { CreatePost } from "@/components/home/CreatePost";
import { Post } from "@/components/home/Post";
import { TrendingServices } from "@/components/home/TrendingServices";
import { MobileHeader } from "@/components/home/MobileHeader";

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
  const navigate = useNavigate();

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
      const mockPosts: Post[] = [
        {
          id: '1',
          user_id: '123',
          image_url: 'https://source.unsplash.com/random/1000x1000?nature',
          caption: 'Beautiful day!',
          created_at: new Date().toISOString(),
          profiles: {
            id: '123',
            username: 'johndoe',
            avatar_url: 'https://source.unsplash.com/100x100/?portrait'
          }
        },
        {
          id: '2',
          user_id: '123',
          image_url: 'https://source.unsplash.com/random/1000x1000?city',
          caption: 'City life',
          created_at: new Date().toISOString(),
          profiles: {
            id: '123',
            username: 'johndoe',
            avatar_url: 'https://source.unsplash.com/100x100/?portrait'
          }
        }
      ];

      setPosts(mockPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 xl:ml-72 pb-20 xl:pb-0">
        <MobileHeader />
        
        <div className="max-w-[calc(100vw-32rem)] mx-auto py-8 px-4">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr,400px] gap-6">
            {/* Feed Column */}
            <div className="space-y-6">
              <CreatePost
                postText={postText}
                postImage={postImage}
                setPostText={setPostText}
                setPostImage={setPostImage}
              />

              {posts.map((post) => (
                <Post key={post.id} {...post} />
              ))}
            </div>

            {/* Right Sidebar - Hidden on mobile */}
            <div className="hidden xl:block border-l border-white/10 pl-8">
              <TrendingServices />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
