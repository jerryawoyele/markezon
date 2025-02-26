
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Home as HomeIcon, PlusSquare, Heart, Send, Menu } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

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
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          avatar_url
        `);

      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }

      // For now, let's use some mock data since the posts table isn't set up yet
      const mockPosts: Post[] = [
        {
          id: '1',
          user_id: data?.[0]?.id || '',
          image_url: 'https://source.unsplash.com/random/1000x1000?nature',
          caption: 'Beautiful day!',
          created_at: new Date().toISOString(),
          profiles: data?.[0] || null
        },
        {
          id: '2',
          user_id: data?.[0]?.id || '',
          image_url: 'https://source.unsplash.com/random/1000x1000?city',
          caption: 'City life',
          created_at: new Date().toISOString(),
          profiles: data?.[0] || null
        }
      ];

      setPosts(mockPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-white/10 bg-background/95 backdrop-blur-sm z-50">
        <div className="container h-full mx-auto px-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Markezon</h1>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <HomeIcon className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Send className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <PlusSquare className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Heart className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={async () => {
              await supabase.auth.signOut();
              navigate('/auth');
            }}>
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto pt-20 px-4 lg:px-0 flex">
        {/* Feed */}
        <div className="flex-1 max-w-xl mx-auto space-y-6">
          {posts.map((post) => (
            <article key={post.id} className="bg-black/20 rounded-lg overflow-hidden">
              {/* Post Header */}
              <div className="p-4 flex items-center gap-3">
                <Avatar>
                  <img 
                    src={post.profiles?.avatar_url || 'https://source.unsplash.com/100x100/?portrait'} 
                    alt={post.profiles?.username || 'User'}
                    className="w-full h-full object-cover"
                  />
                </Avatar>
                <span className="font-medium">{post.profiles?.username || 'Anonymous'}</span>
              </div>
              
              {/* Post Image */}
              <div className="aspect-square">
                <img 
                  src={post.image_url} 
                  alt={post.caption || 'Post image'}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Post Actions */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon">
                    <Heart className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
                
                {/* Caption */}
                {post.caption && (
                  <p className="text-sm">
                    <span className="font-medium mr-2">{post.profiles?.username}</span>
                    {post.caption}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Home;
