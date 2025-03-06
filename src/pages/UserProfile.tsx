
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Post } from "@/components/home/Post";
import { Sidebar } from "@/components/home/Sidebar";
import { MobileHeader } from "@/components/home/MobileHeader";
import { ServiceModal } from "@/components/services/ServiceModal";
import { supabase } from "@/integrations/supabase/client";
import { ServiceCard } from "@/components/services/ServiceCard";
import { useToast } from "@/components/ui/use-toast";
import { Star, Users, FileImage, MessageSquare } from "lucide-react";
import type { Profile as ProfileType, Post as PostType, ServiceType } from "@/types";

export function UserProfile() {
  const { username, userId, postId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("Discover");
  const [activeProfileTab, setActiveProfileTab] = useState("posts");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [userPosts, setUserPosts] = useState<PostType[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user?.id || null);
      } catch (error) {
        console.error("Error getting current user:", error);
      }
    };
    
    getUser();
  }, []);
  
  useEffect(() => {
    const getProfile = async () => {
      try {
        setLoading(true);
        
        // Check if we have a username or userId
        if (username) {
          // Fetch by username
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();
            
          if (error) throw error;
          setProfile(data);
        } else if (userId) {
          // Fetch by user ID
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
          if (error) throw error;
          setProfile(data);
        } else {
          toast({
            title: "Error",
            description: "No username or user ID provided",
            variant: "destructive",
          });
          navigate("/discover");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast({
          title: "Error",
          description: "Could not load profile",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    getProfile();
  }, [username, userId, navigate, toast]);
  
  useEffect(() => {
    const fetchUserContent = async () => {
      if (!profile) return;
      
      try {
        // Fetch posts
        const { data: posts, error: postsError } = await supabase
          .from('posts')
          .select(`
            *,
            profiles(*)
          `)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });
          
        if (postsError) throw postsError;
        setUserPosts(posts as PostType[]);
        
        // Fetch services
        const { data: services, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('user_id', profile.id);
          
        if (servicesError) throw servicesError;
        setServices(services);
        
        // If there's a specific post ID in the URL, switch to posts tab
        if (postId) {
          setActiveProfileTab("posts");
        }
      } catch (error) {
        console.error("Error fetching user content:", error);
      }
    };
    
    fetchUserContent();
  }, [profile, postId]);
  
  const handleServiceClick = (service: ServiceType) => {
    setSelectedService(service);
    setShowServiceModal(true);
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 flex justify-center items-center">
          Loading profile...
        </div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="flex min-h-screen">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 flex justify-center items-center flex-col gap-4">
          <h2 className="text-xl">User not found</h2>
          <Button onClick={() => navigate("/discover")}>Go back to Discover</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 lg:ml-72">
        <MobileHeader />
        <div className="container mx-auto pt-8 pb-20 lg:pb-8 px-4">
          <Card className="p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <Avatar className="w-24 h-24 border-2 border-white/20">
                {profile.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.username || ""} />
                ) : (
                  <AvatarFallback>{profile.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                )}
              </Avatar>
              
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{profile.username || "Anonymous"}</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Follow</Button>
                    <Button variant="outline" size="sm">Message</Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-6 mb-3">
                  <div className="flex items-center gap-2">
                    <FileImage className="w-4 h-4" />
                    <span className="text-sm">
                      <strong>{userPosts.length}</strong> posts
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">
                      <strong>{profile.followers_count || 0}</strong> followers
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">
                      <strong>{profile.following_count || 0}</strong> following
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    <span className="text-sm">
                      <strong>{profile.reviews_count || 0}</strong> reviews
                      {profile.reviews_count ? ` (${profile.reviews_rating?.toFixed(1)} ★)` : ''}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-white/80">{profile.bio || "No bio yet"}</p>
              </div>
            </div>
            
            {profile.about_business && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">About Business</h3>
                <p className="text-sm text-white/80">{profile.about_business}</p>
              </div>
            )}
          </Card>
          
          <Tabs value={activeProfileTab} onValueChange={setActiveProfileTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="space-y-6">
              {userPosts.length > 0 ? (
                userPosts.map((post) => (
                  <Post 
                    key={post.id} 
                    {...post} 
                    profiles={post.profiles} 
                    currentUserId={async () => currentUser} 
                  />
                ))
              ) : (
                <Card className="p-8 text-center">
                  <p>No posts to show</p>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="services">
              {services.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((service) => (
                    <div key={service.id} onClick={() => handleServiceClick(service)}>
                      <ServiceCard service={service} />
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p>No services to show</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {selectedService && (
        <ServiceModal
          isOpen={showServiceModal}
          onClose={() => setShowServiceModal(false)}
          service={selectedService}
        />
      )}
    </div>
  );
}
