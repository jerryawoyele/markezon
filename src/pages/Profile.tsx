
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Post } from "@/components/home/Post";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, User } from "lucide-react";
import { ServiceCard } from "@/components/ServiceCard";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch profile
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
        
        // Fetch posts
        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (postsData) {
          setPosts(postsData);
        }
        
        // Mock services data for now
        setServices([
          {
            id: "1",
            title: "Web Development",
            description: "Full-stack web development services using modern technologies",
            category: "Development",
            image: "https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=800&auto=format&fit=crop",
            business: profileData?.username || "My Business"
          },
          {
            id: "2",
            title: "UI/UX Design",
            description: "Creating beautiful and functional user interfaces",
            category: "Design",
            image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&auto=format&fit=crop",
            business: profileData?.username || "My Business"
          }
        ]);
      }
    };
    
    fetchProfileAndPosts();
  }, []);

  const handlePostClick = (index: number) => {
    setSelectedPostIndex(index);
    setShowPostModal(true);
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

  const handleProfileUpdate = async () => {
    try {
      if (!profile) return;
      
      let avatar_url = editedProfile.avatar_url;
      
      // If there's a preview image, upload it
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
    } catch (error) {
      console.error("Error updating profile:", error);
    }
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
      
      {/* Edit Profile Modal */}
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
    </div>
  );
};

export { Profile };
