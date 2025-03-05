
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Post } from "@/components/home/Post";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface PostType {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      if (userId) {
        // Fetch profile
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
        }
      }
    };
    
    fetchProfileAndPosts();
  }, [userId]);

  const handlePostClick = (index: number) => {
    setSelectedPostIndex(index);
    setShowPostModal(true);
  };

  // Add the rest of your UserProfile page content here

  return (
    <div className="pt-8">
      {/* Your UserProfile page content here */}
      
      {showPostModal && profile && (
        <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
          <DialogContent className="sm:max-w-[650px] bg-black/90 border-white/10 h-[90vh] max-h-[90vh] p-0" hideCloseButton>
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
