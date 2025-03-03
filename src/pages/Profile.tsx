
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sidebar } from "@/components/home/Sidebar";
import { MobileHeader } from "@/components/home/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Grid, Image as ImageIcon, Settings } from "lucide-react";

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
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState("Profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setUsername(data.username || "");
      setAvatarUrl(data.avatar_url || "");
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    }
  };

  const fetchUserPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        id: user.id,
        username,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });

      setEditMode(false);
      fetchProfile(); // Refresh profile data
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handlePostClick = (postId: string) => {
    toast({
      title: "Post selected",
      description: `Viewing details for post ${postId}`,
    });
    // In a real app, you might navigate to a post detail page or open a modal
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 lg:ml-72">
        <MobileHeader />
        
        <div className="max-w-4xl mx-auto py-0 md:py-8 px-4 pb-20 lg:pb-8 mt-0 md:mt-16 lg:mt-0">
          <Card className="p-6 bg-black/20 mb-8">
            {!editMode ? (
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

                <Button variant="outline" className="flex items-center gap-2" onClick={() => setEditMode(true)}>
                  <Settings className="w-4 h-4" />
                  <span>Edit Profile</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
                <div className="flex items-center gap-4">
                  <Avatar className="w-24 h-24">
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/10 flex items-center justify-center text-2xl">
                        {username?.[0] || 'U'}
                      </div>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <Input
                      placeholder="Avatar URL"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="mb-2"
                    />
                    <Input
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProfile}>
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="aspect-square bg-white/5 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {posts.map((post) => (
                <div 
                  key={post.id} 
                  className="aspect-square group relative rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => handlePostClick(post.id)}
                >
                  <img 
                    src={post.image_url} 
                    alt={post.caption || 'Post'} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {post.caption}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-white/40" />
              <h2 className="text-xl font-medium mb-2">No Posts Yet</h2>
              <p className="text-white/60">Share your first post with your network</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
