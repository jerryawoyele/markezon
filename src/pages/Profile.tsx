
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Post } from "@/components/home/Post";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sidebar } from "@/components/home/Sidebar";
import { MobileHeader } from "@/components/home/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { ServiceCard } from "@/components/services/ServiceCard";
import { AddServiceModal } from "@/components/services/AddServiceModal";
import { useToast } from "@/components/ui/use-toast";
import { Star, PenLine, Users, FileImage, MessageSquare } from "lucide-react";
import type { Profile as ProfileType, Post as PostType, ServiceType } from "@/types";

export function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("Profile");
  const [activeProfileTab, setActiveProfileTab] = useState("posts");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingAboutBusiness, setIsEditingAboutBusiness] = useState(false);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [userPosts, setUserPosts] = useState<PostType[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  
  // Form fields
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [aboutBusiness, setAboutBusiness] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    const getProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/auth");
          return;
        }
        
        let { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) {
          throw error;
        }
        
        if (data) {
          setProfile(data);
          setUsername(data.username || "");
          setBio(data.bio || "");
          setAboutBusiness(data.about_business || "");
          setAvatarUrl(data.avatar_url || "");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, [navigate]);
  
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!profile) return;
      
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles(*)
          `)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        if (data) {
          setUserPosts(data as PostType[]);
        }
      } catch (error) {
        console.error("Error fetching user posts:", error);
      }
    };
    
    const fetchUserServices = async () => {
      if (!profile) return;
      
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('user_id', profile.id);
          
        if (error) throw error;
        
        if (data) {
          setServices(data);
        }
      } catch (error) {
        console.error("Error fetching user services:", error);
      }
    };

    fetchUserPosts();
    fetchUserServices();
  }, [profile]);
  
  const handleUpdateProfile = async () => {
    try {
      setUploading(true);
      
      // First, get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "No user logged in",
          variant: "destructive",
        });
        return;
      }
      
      // Upload avatar if changed
      let avatar_url = avatarUrl;
      if (avatar) {
        const fileExt = avatar.name.split('.').pop();
        const fileName = `${user.id}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatar, { upsert: true });
          
        if (uploadError) {
          throw uploadError;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
          
        avatar_url = publicUrl;
      }
      
      // Update profile
      const updates = {
        username,
        bio,
        avatar_url,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
        
      if (error) throw error;
      
      setAvatarUrl(avatar_url);
      setIsEditingProfile(false);
      
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      
      // Update local profile state
      if (profile) {
        setProfile({
          ...profile,
          username,
          bio,
          avatar_url,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateAboutBusiness = async () => {
    try {
      // First, get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "No user logged in",
          variant: "destructive",
        });
        return;
      }
      
      // Update about business
      const updates = {
        about_business: aboutBusiness,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
        
      if (error) throw error;
      
      setIsEditingAboutBusiness(false);
      
      toast({
        title: "Success",
        description: "Business info updated successfully!",
      });
      
      // Update local profile state
      if (profile) {
        setProfile({
          ...profile,
          about_business: aboutBusiness,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error updating business info:", error);
      toast({
        title: "Error",
        description: "Failed to update business info",
        variant: "destructive",
      });
    }
  };
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    const file = e.target.files[0];
    setAvatar(file);
    // Create object URL for preview
    const objectUrl = URL.createObjectURL(file);
    setAvatarUrl(objectUrl);
  };
  
  const handleAddService = async (serviceData: {
    title: string;
    description: string;
    category: string;
    image: string;
    business?: string;
    price?: string;
    features?: string[];
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "No user logged in",
          variant: "destructive",
        });
        return;
      }
      
      const newService = {
        ...serviceData,
        user_id: user.id,
      };
      
      const { data, error } = await supabase
        .from('services')
        .insert(newService)
        .select();
        
      if (error) throw error;
      
      if (data) {
        setServices(prev => [...prev, data[0] as ServiceType]);
        toast({
          title: "Success",
          description: "Service added successfully!",
        });
      }
      
      setShowAddServiceModal(false);
    } catch (error) {
      console.error("Error adding service:", error);
      toast({
        title: "Error",
        description: "Failed to add service",
        variant: "destructive",
      });
    }
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

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 lg:ml-72">
        <MobileHeader />
        <div className="container mx-auto pt-8 pb-20 lg:pb-8 px-4">
          <Card className="p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <Avatar className="w-24 h-24 border-2 border-white/20">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={username} />
                ) : (
                  <AvatarFallback>{username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                )}
              </Avatar>
              
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{profile?.username || "Anonymous"}</h2>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditingProfile(true)}
                  >
                    Edit Profile
                  </Button>
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
                      <strong>{profile?.followers_count || 0}</strong> followers
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">
                      <strong>{profile?.following_count || 0}</strong> following
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    <span className="text-sm">
                      <strong>{profile?.reviews_count || 0}</strong> reviews
                      {profile?.reviews_count ? ` (${profile?.reviews_rating?.toFixed(1)} ★)` : ''}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-white/80">{profile?.bio || "No bio yet"}</p>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">About Business</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditingAboutBusiness(true)}
                >
                  <PenLine className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
              <p className="text-sm text-white/80">{profile?.about_business || "No business information yet."}</p>
            </div>
          </Card>
          
          <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
                <DialogDescription>
                  Make changes to your profile here.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="avatar">Profile Picture</Label>
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-16 h-16">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={username} />
                      ) : (
                        <AvatarFallback>{username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                      )}
                    </Avatar>
                    <Input 
                      id="avatar" 
                      type="file" 
                      accept="image/*" 
                      onChange={handleAvatarChange} 
                    />
                  </div>
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    placeholder="Enter your username" 
                  />
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea 
                    id="bio" 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)} 
                    placeholder="Tell us about yourself" 
                    rows={3} 
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
                <Button onClick={handleUpdateProfile} disabled={uploading}>
                  {uploading ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isEditingAboutBusiness} onOpenChange={setIsEditingAboutBusiness}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Business Information</DialogTitle>
                <DialogDescription>
                  Tell others about your business.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="aboutBusiness">About Your Business</Label>
                  <Textarea 
                    id="aboutBusiness" 
                    value={aboutBusiness} 
                    onChange={(e) => setAboutBusiness(e.target.value)} 
                    placeholder="Describe your business, services, experience, etc." 
                    rows={5} 
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditingAboutBusiness(false)}>Cancel</Button>
                <Button onClick={handleUpdateAboutBusiness}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
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
                    currentUserId={async () => profile?.id || null} 
                  />
                ))
              ) : (
                <Card className="p-8 text-center">
                  <p className="mb-4">You haven't posted anything yet</p>
                  <Button onClick={() => navigate("/home")}>Make your first post</Button>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="services">
              <div className="mb-6 flex justify-between items-center">
                <h2 className="text-xl font-bold">Your Services</h2>
                <Button onClick={() => setShowAddServiceModal(true)}>Add Service</Button>
              </div>
              
              {services.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p className="mb-4">You haven't added any services yet</p>
                  <Button onClick={() => setShowAddServiceModal(true)}>Add your first service</Button>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <AddServiceModal 
        isOpen={showAddServiceModal}
        onClose={() => setShowAddServiceModal(false)}
        onAddService={handleAddService}
      />
    </div>
  );
}
