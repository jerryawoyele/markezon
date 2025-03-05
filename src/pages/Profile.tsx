
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Post } from "@/components/home/Post";
import { supabase, parseImageUrls } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, User, Plus } from "lucide-react";
import { ServiceCard } from "@/components/ServiceCard";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sidebar, SIDEBAR_ITEMS } from "@/components/home/Sidebar";
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
  price?: string;
  features?: string[];
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("about");
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editedProfile, setEditedProfile] = useState<{
    username: string;
    bio: string;
    avatar_url: string | null;
  }>({
    username: "",
    bio: "",
    avatar_url: null
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newService, setNewService] = useState<{
    title: string;
    description: string;
    category: string;
    image: string;
    price: string;
    features: string;
  }>({
    title: "",
    description: "",
    category: "",
    image: "",
    price: "",
    features: ""
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("Profile");

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        setProfile(profileData);
        
        if (profileData) {
          setEditedProfile({
            username: profileData.username || "",
            bio: profileData.bio || "",
            avatar_url: profileData.avatar_url
          });
        }
        
        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (postsData) {
          setPosts(postsData);
        }
        
        // Fetch real services from the database
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (servicesData && servicesData.length > 0) {
          setServices(servicesData);
        } else {
          // Fallback to sample data if no services found
          setServices([
            {
              id: "1",
              title: "Web Development",
              description: "Full-stack web development services using modern technologies",
              category: "Development",
              image: "https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=800&auto=format&fit=crop",
              business: profileData?.username || "My Business",
              price: "$50/hr",
              features: ["React", "Node.js", "Responsive Design"]
            },
            {
              id: "2",
              title: "UI/UX Design",
              description: "Creating beautiful and functional user interfaces",
              category: "Design",
              image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&auto=format&fit=crop",
              business: profileData?.username || "My Business",
              price: "$45/hr",
              features: ["Wireframing", "Prototyping", "User Testing"]
            }
          ]);
        }
      }
    };
    
    fetchProfileAndPosts();
  }, []);

  const handlePostClick = (index: number) => {
    setSelectedPostIndex(index);
    setShowPostModal(true);
  };

  const handleServiceClick = (service: ServiceType) => {
    setSelectedService(service);
    setShowServiceModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleServiceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewService({...newService, image: reader.result as string});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      if (!profile) return;
      
      let avatar_url = editedProfile.avatar_url;
      
      if (previewImage && previewImage !== profile.avatar_url) {
        const file = await fetch(previewImage).then(r => r.blob());
        const fileExt = previewImage.split(';')[0].split('/')[1];
        const fileName = `${profile.id}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { upsert: true });
          
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
          
        avatar_url = publicUrl;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editedProfile.username,
          bio: editedProfile.bio,
          avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);
        
      if (error) throw error;
      
      setProfile({
        ...profile,
        username: editedProfile.username,
        bio: editedProfile.bio,
        avatar_url
      });
      
      setShowEditProfileModal(false);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddService = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to add a service.",
          variant: "destructive"
        });
        return;
      }
      
      // Process features from comma-separated string to array
      const featuresArray = newService.features
        .split(',')
        .map(feature => feature.trim())
        .filter(feature => feature.length > 0);
      
      let imageUrl = newService.image;
      
      // If image is a data URL, upload it to storage
      if (imageUrl.startsWith('data:')) {
        const file = await fetch(imageUrl).then(r => r.blob());
        const fileExt = imageUrl.split(';')[0].split('/')[1];
        const fileName = `service_${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('services')
          .upload(fileName, file);
          
        if (error) {
          // If services bucket doesn't exist, use avatars bucket as fallback
          const { data: avatarData, error: avatarError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file);
            
          if (avatarError) throw avatarError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
            
          imageUrl = publicUrl;
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('services')
            .getPublicUrl(fileName);
            
          imageUrl = publicUrl;
        }
      }
      
      // Check if services table exists
      const { error: tableCheckError } = await supabase
        .from('services')
        .select('id')
        .limit(1);
      
      if (tableCheckError) {
        // Use local state if table doesn't exist
        const newServiceObj = {
          id: Date.now().toString(),
          title: newService.title,
          description: newService.description,
          category: newService.category,
          image: imageUrl,
          business: profile?.username || "My Business",
          price: newService.price,
          features: featuresArray,
          user_id: user.id
        };
        
        setServices(prev => [newServiceObj, ...prev]);
        
        toast({
          title: "Service added",
          description: "Your service has been added successfully to the local state since the services table doesn't exist yet.",
        });
      } else {
        // Insert into database if table exists
        const { data, error } = await supabase
          .from('services')
          .insert({
            title: newService.title,
            description: newService.description,
            category: newService.category,
            image: imageUrl,
            user_id: user.id,
            business: profile?.username || "My Business",
            price: newService.price,
            features: featuresArray
          })
          .select();
          
        if (error) throw error;
        
        if (data) {
          setServices(prev => [...data, ...prev]);
        }
        
        toast({
          title: "Service added",
          description: "Your service has been added successfully.",
        });
      }
      
      // Reset form and close modal
      setNewService({
        title: "",
        description: "",
        category: "",
        image: "",
        price: "",
        features: ""
      });
      
      setShowAddServiceModal(false);
    } catch (error) {
      console.error("Error adding service:", error);
      toast({
        title: "Error",
        description: "Failed to add service. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar activeTab={activeItem} setActiveTab={setActiveItem} />
      
      <div className="flex-1 container mx-auto pt-18 max-lg:pt-18 pb-20 lg:pl-64">
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
                
                <Button 
                  onClick={() => setShowEditProfileModal(true)}
                  variant="outline" 
                  size="sm"
                >
                  <Pencil className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
              </div>
              
              <p className="mt-4 text-white/80">{profile?.bio || "No bio yet."}</p>
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
                <CardDescription>Information about your business or personal brand</CardDescription>
              </CardHeader>
              <CardContent>
                <p>{profile?.bio || "No information available yet. Edit your profile to add details about yourself or your business."}</p>
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
                      src={parseImageUrls(post.image_url)[0]} 
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
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowAddServiceModal(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Service
              </Button>
            </div>
            
            {services.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(service => (
                  <div key={service.id} onClick={() => handleServiceClick(service)}>
                    <ServiceCard 
                      title={service.title}
                      description={service.description}
                      category={service.category}
                      image={service.image}
                      business={service.business}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="bg-black/20 border-white/5 p-6 text-center">
                <p className="text-white/60">No services available yet. Add your first service!</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        
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
        
        <Dialog open={showEditProfileModal} onOpenChange={setShowEditProfileModal}>
          <DialogContent className="sm:max-w-[500px] bg-black/90 border-white/10">
            <DialogTitle>Edit Profile</DialogTitle>
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="w-24 h-24 border-2 border-primary">
                  <AvatarImage 
                    src={previewImage || profile?.avatar_url || ""} 
                    alt={editedProfile.username} 
                  />
                  <AvatarFallback>
                    <User className="w-12 h-12" />
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <Label htmlFor="avatar" className="block mb-2">Profile Picture</Label>
                  <Input 
                    id="avatar" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload}
                    className="w-full" 
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="username" className="block mb-2">Username</Label>
                <Input 
                  id="username" 
                  value={editedProfile.username} 
                  onChange={e => setEditedProfile({...editedProfile, username: e.target.value})}
                  placeholder="Your username"
                />
              </div>
              
              <div>
                <Label htmlFor="bio" className="block mb-2">Bio</Label>
                <Textarea 
                  id="bio" 
                  value={editedProfile.bio} 
                  onChange={e => setEditedProfile({...editedProfile, bio: e.target.value})}
                  placeholder="Write something about yourself or your business"
                  rows={4}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditProfileModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleProfileUpdate}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Service Details Modal */}
        <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
          <DialogContent className="sm:max-w-[600px] bg-black/90 border-white/10">
            <DialogHeader>
              <DialogTitle>{selectedService?.title}</DialogTitle>
              <DialogDescription>{selectedService?.category}</DialogDescription>
            </DialogHeader>
            
            {selectedService && (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-md">
                  <img 
                    src={selectedService.image} 
                    alt={selectedService.title} 
                    className="w-full h-48 object-cover" 
                  />
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Description</h3>
                  <p>{selectedService.description}</p>
                </div>
                
                {selectedService.price && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Pricing</h3>
                    <p className="text-xl font-bold">{selectedService.price}</p>
                  </div>
                )}
                
                {selectedService.features && selectedService.features.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Features</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {selectedService.features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-white/60">Offered by: {selectedService.business}</p>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button onClick={() => setShowServiceModal(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Service Modal */}
        <Dialog open={showAddServiceModal} onOpenChange={setShowAddServiceModal}>
          <DialogContent className="sm:max-w-[600px] bg-black/90 border-white/10">
            <DialogHeader>
              <DialogTitle>Add New Service</DialogTitle>
              <DialogDescription>Create a new service to showcase your skills and offerings</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Service Title</Label>
                <Input 
                  id="title" 
                  value={newService.title} 
                  onChange={e => setNewService({...newService, title: e.target.value})}
                  placeholder="e.g., Web Development"
                />
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <Input 
                  id="category" 
                  value={newService.category} 
                  onChange={e => setNewService({...newService, category: e.target.value})}
                  placeholder="e.g., Development, Design, Marketing"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  value={newService.description} 
                  onChange={e => setNewService({...newService, description: e.target.value})}
                  placeholder="Describe your service in detail"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="price">Price</Label>
                <Input 
                  id="price" 
                  value={newService.price} 
                  onChange={e => setNewService({...newService, price: e.target.value})}
                  placeholder="e.g., $50/hr, $500/project"
                />
              </div>
              
              <div>
                <Label htmlFor="features">Features (comma-separated)</Label>
                <Textarea 
                  id="features" 
                  value={newService.features} 
                  onChange={e => setNewService({...newService, features: e.target.value})}
                  placeholder="e.g., SEO Optimization, Responsive Design, 24/7 Support"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="service-image">Service Image</Label>
                <Input 
                  id="service-image" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleServiceImageUpload}
                  className="mt-1" 
                />
                {newService.image && (
                  <div className="mt-2 overflow-hidden rounded-md h-32">
                    <img 
                      src={newService.image} 
                      alt="Service preview" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddServiceModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddService} disabled={!newService.title || !newService.description}>
                Add Service
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export { Profile };
