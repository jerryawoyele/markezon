
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Home as HomeIcon, 
  Search, 
  Send, 
  Heart, 
  User,
  LogOut,
  ImageIcon,
  TextIcon
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  { icon: Send, label: "Messages" },
  { icon: Heart, label: "Notifications" },
  { icon: User, label: "Profile" },
];

const TRENDING_SERVICES = [
  { title: "Web Development", views: "12.5k", category: "Technology" },
  { title: "Digital Marketing", views: "10.2k", category: "Marketing" },
  { title: "Graphic Design", views: "8.7k", category: "Design" },
];

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
      // For now, let's use mock data until we populate the posts table
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
      {/* Left Sidebar */}
      <aside className="w-72 fixed left-0 top-0 h-screen border-r border-white/10 bg-background p-6">
        <div className="flex flex-col h-full">
          <h1 className="text-2xl font-bold mb-10 px-4">Markezon</h1>
          
          <nav className="flex-1">
            <ul className="space-y-4">
              {SIDEBAR_ITEMS.map((item) => (
                <li key={item.label}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-4 text-lg font-semibold py-6",
                      activeTab === item.label && "bg-white/10"
                    )}
                    onClick={() => setActiveTab(item.label)}
                  >
                    <item.icon className="w-7 h-7" />
                    {item.label}
                  </Button>
                </li>
              ))}
            </ul>
          </nav>

          <Button
            variant="ghost"
            className="justify-start gap-4 text-lg font-semibold py-6"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/auth');
            }}
          >
            <LogOut className="w-7 h-7" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72">
        <div className="max-w-[calc(100vw-32rem)] mx-auto py-8 px-4">
          <div className="grid grid-cols-[1fr,320px] gap-6">
            {/* Feed Column */}
            <div className="space-y-6">
              {/* Create Post Card */}
              <Card className="p-6 bg-black/20 border-white/5">
                <h2 className="text-lg font-semibold mb-4">Create a Post</h2>
                <div className="space-y-4">
                  <Input
                    placeholder="Write something..."
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                  />
                  <Input
                    placeholder="Image URL (optional)"
                    value={postImage}
                    onChange={(e) => setPostImage(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-2">
                      <TextIcon className="w-4 h-4" />
                      Text Post
                    </Button>
                    <Button className="flex-1 gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Image Post
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Posts Feed */}
              {posts.map((post) => (
                <Card key={post.id} className="overflow-hidden bg-black/20 border-white/5">
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
                  
                  <div className="aspect-square">
                    <img 
                      src={post.image_url} 
                      alt={post.caption || 'Post image'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="icon">
                        <Heart className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Send className="w-5 h-5" />
                      </Button>
                    </div>
                    
                    {post.caption && (
                      <p className="text-sm">
                        <span className="font-medium mr-2">{post.profiles?.username}</span>
                        {post.caption}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Trending Services Card */}
              <Card className="p-6 bg-black/20 border-white/5">
                <h2 className="text-lg font-semibold mb-4">Trending Services</h2>
                <div className="space-y-4">
                  {TRENDING_SERVICES.map((service) => (
                    <div 
                      key={service.title}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div>
                        <h3 className="font-medium">{service.title}</h3>
                        <p className="text-sm text-white/60">{service.category}</p>
                      </div>
                      <span className="text-sm text-white/60">{service.views} views</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Copyright Info */}
              <div className="text-center text-sm text-white/60 p-4">
                <p>&copy; {new Date().getFullYear()} Markezon</p>
                <p className="mt-1">All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
