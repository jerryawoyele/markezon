
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Home as HomeIcon, 
  PlusSquare, 
  Heart, 
  Send, 
  Search, 
  Compass, 
  Film, 
  User,
  LogOut
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const SIDEBAR_ITEMS = [
  { icon: HomeIcon, label: "Home" },
  { icon: Search, label: "Search" },
  { icon: Compass, label: "Explore" },
  { icon: Film, label: "Reels" },
  { icon: Send, label: "Messages" },
  { icon: Heart, label: "Notifications" },
  { icon: PlusSquare, label: "Create" },
  { icon: User, label: "Profile" },
];

const Home = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState("Home");
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
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (posts) setPosts(posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar */}
      <aside className="w-64 fixed left-0 top-0 h-screen border-r border-white/10 bg-background p-4">
        <div className="flex flex-col h-full">
          <h1 className="text-xl font-semibold mb-8 px-4">Markezon</h1>
          
          <nav className="flex-1">
            <ul className="space-y-2">
              {SIDEBAR_ITEMS.map((item) => (
                <li key={item.label}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-4 text-base font-normal",
                      activeTab === item.label && "bg-white/10"
                    )}
                    onClick={() => setActiveTab(item.label)}
                  >
                    <item.icon className="w-6 h-6" />
                    {item.label}
                  </Button>
                </li>
              ))}
            </ul>
          </nav>

          <Button
            variant="ghost"
            className="justify-start gap-4 text-base font-normal mt-auto"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/auth');
            }}
          >
            <LogOut className="w-6 h-6" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
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
