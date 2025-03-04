
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/home/Sidebar";
import { MobileHeader } from "@/components/home/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Post } from "@/components/home/Post";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface Post {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  user_id: string;
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchUserPosts();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      if (!userId) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      });
    }
  };

  const fetchUserPosts = async () => {
    try {
      if (!userId) return;

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "Failed to load user posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = () => {
    setFollowing(!following);
    
    toast({
      title: following ? "Unfollowed" : "Followed",
      description: following 
        ? `You unfollowed ${profile?.username || 'this user'}` 
        : `You are now following ${profile?.username || 'this user'}`,
    });
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setShowPostModal(true);
  };
  
  const getPostPreviewContent = (image_url: string) => {
    try {
      const parsedImages = JSON.parse(image_url);
      
      if (Array.isArray(parsedImages) && parsedImages.length > 0) {
        // Check if it's a text post
        if (parsedImages[0].startsWith('data:image/svg+xml')) {
          return parsedImages[0];
        }
        // Return the first image for multiple images
        return parsedImages[0];
      }
      
      return image_url;
    } catch (e) {
      return image_url;
    }
  };
  
  const isTextPost = (image_url: string) => {
    try {
      const parsedImages = JSON.parse(image_url);
      return Array.isArray(parsedImages) && 
             parsedImages.length > 0 && 
             parsedImages[0].startsWith('data:image/svg+xml');
    } catch (e) {
      return false;
    }
  };

  if (!profile && !loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 xl:ml-72 flex items-center justify-center">
          <Card className="p-6 text-center">
            <h1 className="text-xl font-semibold mb-4">User Not Found</h1>
            <Button onClick={handleGoBack}>Go Back</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 lg:ml-64">
        <MobileHeader />
        
        <div className="max-w-4xl mx-auto py-8 px-4 pb-20 lg:pb-8 pt-8">
          <Button
            variant="ghost"
            className="mb-4 flex items-center gap-2"
            onClick={handleGoBack}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <Card className="p-6 bg-black/20 mb-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="w-24 h-24">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.username || 'Profile'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center text-2xl">
                    {profile?.username?.[0] || 'U'}
                  </div>
                )}
              </Avatar>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold mb-2">{profile?.username || 'User'}</h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm">
                  <div>
                    <span className="font-bold">{posts.length}</span>
                    <span className="text-white/60 ml-1">posts</span>
                  </div>
                  <div>
                    <span className="font-bold">0</span>
                    <span className="text-white/60 ml-1">followers</span>
                  </div>
                  <div>
                    <span className="font-bold">0</span>
                    <span className="text-white/60 ml-1">following</span>
                  </div>
                </div>
              </div>

              <Button 
                variant={following ? "outline" : "default"}
                className="min-w-24"
                onClick={handleToggleFollow}
              >
                {following ? "Following" : "Follow"}
              </Button>
            </div>
          </Card>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mx-2 md:mx-0">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="aspect-square bg-white/5 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mx-2 md:mx-0">
              {posts.map((post) => (
                <div 
                  key={post.id} 
                  className="aspect-square group relative rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => handlePostClick(post)}
                >
                  <img 
                    src={getPostPreviewContent(post.image_url)} 
                    alt={post.caption || 'Post'} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                    {post.caption}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/60">
              No posts yet
            </div>
          )}
        </div>
      </div>

      {selectedPost && profile && (
        <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
          <DialogContent className="sm:max-w-[650px] bg-black/90 border-white/10 h-[90vh] max-h-[90vh] p-0">
            <ScrollArea className="h-full max-h-[90vh]">
              <Post 
                {...selectedPost}
                user_id={selectedPost.user_id}
                showDetailOnClick={false}
                profiles={profile}
                currentUserId={async () => {
                  const { data } = await supabase.auth.getUser();
                  return data.user?.id || null;
                }}
              />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
