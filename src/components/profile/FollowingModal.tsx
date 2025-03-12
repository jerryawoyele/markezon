import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

type Following = {
  following_id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
};

interface FollowingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentUserId: string | null;
}

export function FollowingModal({ isOpen, onClose, userId, currentUserId }: FollowingModalProps) {
  const [following, setFollowing] = useState<Following[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFollowing = async () => {
      if (!isOpen) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Try to use the get_following function
        const { data, error } = await supabase.rpc('get_following', { 
          user_id: userId 
        });
        
        if (error) {
          throw error;
        }
        
        setFollowing(data || []);
      } catch (fnError) {
        console.error("Error using get_following function:", fnError);
        
        // Fallback to manual query if the function call fails
        try {
          const { data, error } = await supabase
            .from('follows')
            .select(`
              following_id,
              created_at,
              profiles!follows_following_id_fkey (
                username,
                avatar_url
              )
            `)
            .eq('follower_id', userId)
            .order('created_at', { ascending: false });
            
          if (error) throw error;
          
          // Transform the data to match the expected format
          const formattedData = data.map(item => ({
            following_id: item.following_id,
            username: item.profiles?.username || null,
            avatar_url: item.profiles?.avatar_url || null,
            created_at: item.created_at
          }));
          
          setFollowing(formattedData);
        } catch (error) {
          console.error("Error fetching following:", error);
          setError("Failed to load following. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchFollowing();
  }, [isOpen, userId]);
  
  const handleUserClick = (followingId: string) => {
    onClose();
    navigate(`/user/${followingId}`);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Following</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="p-6 pt-2 max-h-[calc(80vh-80px)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-white/60">
              <p>{error}</p>
            </div>
          ) : following.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              <p>Not following anyone yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {following.map(follow => (
                <div 
                  key={follow.following_id}
                  className="flex items-center justify-between p-3 hover:bg-white/5 rounded-md transition-colors cursor-pointer"
                  onClick={() => handleUserClick(follow.following_id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {follow.avatar_url ? (
                        <AvatarImage src={follow.avatar_url} alt={follow.username || ""} />
                      ) : (
                        <AvatarFallback>{follow.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <h4 className="font-medium">{follow.username || "Anonymous"}</h4>
                      <p className="text-xs text-white/60">Following since {formatDate(follow.created_at)}</p>
                    </div>
                  </div>
                  
                  {currentUserId === follow.following_id && (
                    <div className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                      You
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 