
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Sidebar } from "@/components/home/Sidebar";
import { MobileHeader } from "@/components/home/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Post {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  };
}

export default function Explore() {
  const [activeTab, setActiveTab] = useState("Discover");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
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
      
      // Transform data to match expected type
      const transformedData = data?.map(post => ({
        ...post,
        profiles: post.profiles || {
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

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 xl:ml-72 pb-24 xl:pb-0">
        <MobileHeader />
        
        <div className="max-w-7xl mx-auto py-8 px-4 mt-16 xl:mt-0 h-[calc(100vh-64px)] overflow-y-auto">
          <div className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
              <Input
                placeholder="Search posts..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <Card 
                  key={i}
                  className="overflow-hidden bg-black/20 border-white/5 animate-pulse"
                >
                  <div className="aspect-video bg-white/5" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-4 bg-white/5 rounded w-1/2" />
                  </div>
                </Card>
              ))
            ) : (
              posts.map((post) => (
                <Card 
                  key={post.id}
                  className="overflow-hidden bg-black/20 border-white/5 hover:bg-black/30 transition-colors cursor-pointer"
                >
                  <div className="aspect-video">
                    <img 
                      src={post.image_url} 
                      alt={post.caption || 'Post'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium mb-2">{post.profiles.username || 'Anonymous'}</h3>
                    <p className="text-sm text-white/60 line-clamp-2">{post.caption}</p>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
