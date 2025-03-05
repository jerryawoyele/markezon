
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Post } from "@/components/home/Post";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { ServiceCard } from "@/components/ServiceCard";
import { useToast } from "@/components/ui/use-toast";

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface PostType {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
}

interface ServiceType {
  id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  business: string;
}

const UserProfile = () => {
  const { userId, postId } = useParams<{ userId: string; postId?: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("about");
  const [isFollowing, setIsFollowing] = useState(false);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      if (userId) {
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser) {
          // Check if viewing own profile
          setIsCurrentUser(currentUser.id === userId);
          
          // Get current user profile
          const { data: currentUserData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
            
          setCurrentUserProfile(currentUserData);
        }
        
        // Fetch profile being viewed
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        setProfile(profileData);
        
        // Fetch posts
        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (postsData) {
          setPosts(postsData);
          
          // If postId is provided, find its index and open the modal
          if (postId) {
            const postIndex = postsData.findIndex(post => post.id === postId);
            if (postIndex >= 0) {
              setSelectedPostIndex(postIndex);
              setShowPostModal(true);
            }
          }
        }
        
        // Mock services data for now
        setServices([
          {
            id: "1",
            title: "Web Development",
            description: "Full-stack web development services using modern technologies",
            category: "Development",
            image: "https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=800&auto=format&fit=crop",
            business: profileData?.username || "Business"
          },
          {
            id: "2",
            title: "UI/UX Design",
            description: "Creating beautiful and functional user interfaces",
            category: "Design",
            image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&auto=format&fit=crop",
            business: profileData?.username || "Business"
          }
        ]);
      }
    };
    
    fetchProfileAndPosts();
  }, [userId, postId]);

  const handlePostClick = (index: number) => {
    setSelectedPostIndex(index);
    setShowPostModal(true);
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    toast({
      title: isFollowing ? "Unfollowed" : "Following",
      description: isFollowing 
        ? `You have unfollowed ${profile?.username}` 
        : `You are now following ${profile?.username}`,
    });
  };

  return (
    <div className="container mx-auto pt-18">
      <div className="bg-black/20 rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <Avatar className="w-24 h-24 border-2 border-primary">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.username || "User"} />
            <AvatarFallback>
              <User className="w-12 h-12" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-1">{profile?.username || "User"}</h1>
                <p className="text-white/60">@{profile?.username?.toLowerCase().replace(/\s+/g, '') || "username"}</p>
              </div>
              
              {!isCurrentUser && (
                <Button 
                  onClick={handleFollow}
                  variant={isFollowing ? "outline" : "default"}
                  size="sm"
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              )}
            </div>
            
            <p className="mt-4 text-white/80">{profile?.bio || "No bio available."}</p>
          </div>
        </div>
      </div>
      
      <Tabs 
        defaultValue="about" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>
        
        <TabsContent value="about" className="space-y-4">
          <Card className="bg-black/20 border-white/5">
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>Information about this business or personal brand</CardDescription>
            </CardHeader>
            <CardContent>
              <p>{profile?.bio || "No information available."}</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="posts" className="space-y-4">
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((post, index) => (
                <div 
                  key={post.id} 
                  className="cursor-pointer overflow-hidden rounded-md aspect-square"
                  onClick={() => handlePostClick(index)}
                >
                  <img 
                    src={post.image_url ? (JSON.parse(post.image_url)[0] || "") : ""} 
                    alt={post.caption || "Post"} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <Card className="bg-black/20 border-white/5 p-6 text-center">
              <p className="text-white/60">No posts yet</p>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="services" className="space-y-4">
          {services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(service => (
                <ServiceCard 
                  key={service.id}
                  title={service.title}
                  description={service.description}
                  category={service.category}
                  image={service.image}
                  business={service.business}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-black/20 border-white/5 p-6 text-center">
              <p className="text-white/60">No services available yet</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Post Modal */}
      {showPostModal && profile && (
        <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
          <DialogContent className="sm:max-w-[650px] bg-black/90 border-white/10 h-[90vh] max-h-[90vh] p-0" hideCloseButton>
            <DialogTitle className="sr-only">Posts</DialogTitle>
            <ScrollArea className="h-full max-h-[90vh] px-4 py-2">
              {posts.slice(selectedPostIndex).map((post) => (
                <div key={post.id} className="mb-6">
                  <Post 
                    {...post}
                    user_id={post.user_id}
                    showDetailOnClick={false}
                    profiles={profile}
                    currentUserId={async () => {
                      const { data } = await supabase.auth.getUser();
                      return data.user?.id || null;
                    }}
                  />
                </div>
              ))}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export { UserProfile };
