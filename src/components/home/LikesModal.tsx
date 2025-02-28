
import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface LikesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
}

interface Like {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  };
}

export function LikesModal({ open, onOpenChange, postId }: LikesModalProps) {
  const [likes, setLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && postId) {
      fetchLikes();
    }
  }, [open, postId]);

  const fetchLikes = async () => {
    try {
      setLoading(true);
      
      // Mock likes data for now
      // In a real app, you would fetch from your database
      const mockLikes: Like[] = [
        {
          id: "1",
          user_id: "user-1",
          post_id: postId,
          created_at: new Date().toISOString(),
          profiles: {
            username: "jane_doe",
            avatar_url: "https://source.unsplash.com/100x100/?portrait"
          }
        },
        {
          id: "2",
          user_id: "user-2",
          post_id: postId,
          created_at: new Date().toISOString(),
          profiles: {
            username: "john_smith",
            avatar_url: "https://source.unsplash.com/100x100/?face"
          }
        }
      ];
      
      setLikes(mockLikes);
    } catch (error) {
      console.error("Error fetching likes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (userId: string) => {
    onOpenChange(false);
    navigate(`/user/${userId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-black/90 border-white/10">
        <DialogHeader>
          <DialogTitle>Likes</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-white/10" />
                  <div className="h-4 bg-white/10 rounded w-24" />
                </div>
              ))}
            </div>
          ) : likes.length > 0 ? (
            <div className="space-y-4">
              {likes.map(like => (
                <button
                  key={like.id}
                  className="flex items-center gap-3 w-full text-left hover:bg-white/5 p-2 rounded-md transition-colors"
                  onClick={() => handleUserClick(like.user_id)}
                >
                  <Avatar>
                    <img 
                      src={like.profiles.avatar_url || "https://source.unsplash.com/100x100/?portrait"} 
                      alt={like.profiles.username || "User"}
                      className="w-full h-full object-cover" 
                    />
                  </Avatar>
                  <span className="font-medium">{like.profiles.username || "Anonymous"}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center text-white/60 py-6">No likes yet</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
