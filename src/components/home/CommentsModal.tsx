
import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface CommentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  onAddComment: (postId: string, comment: string) => Promise<void>;
}

interface Comment {
  id: string;
  text: string;
  user_id: string;
  post_id: string;
  created_at: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  };
}

export function CommentsModal({ 
  open, 
  onOpenChange, 
  postId,
  onAddComment
}: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (open && postId) {
      fetchComments();
    }
  }, [open, postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      
      // Mock comments data for now
      // In a real app, you would fetch from your database
      const mockComments: Comment[] = [
        {
          id: "1",
          text: "Great post! Love the content.",
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
          text: "Thanks for sharing this!",
          user_id: "user-2",
          post_id: postId,
          created_at: new Date().toISOString(),
          profiles: {
            username: "john_smith",
            avatar_url: "https://source.unsplash.com/100x100/?face"
          }
        }
      ];
      
      setComments(mockComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (userId: string) => {
    onOpenChange(false);
    navigate(`/user/${userId}`);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await onAddComment(postId, newComment);
      setNewComment("");
      
      // Add the new comment to the list
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();

        const newCommentObj: Comment = {
          id: Date.now().toString(), // Temporary ID
          text: newComment,
          user_id: user.id,
          post_id: postId,
          created_at: new Date().toISOString(),
          profiles: {
            username: profile?.username || 'Anonymous',
            avatar_url: profile?.avatar_url || null
          }
        };
        
        setComments([...comments, newCommentObj]);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-black/90 border-white/10">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 h-[50vh] flex flex-col">
          <div className="flex-1 overflow-y-auto mb-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/10 rounded w-24" />
                      <div className="h-3 bg-white/10 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <button
                      className="flex-shrink-0"
                      onClick={() => handleUserClick(comment.user_id)}
                    >
                      <Avatar>
                        <img 
                          src={comment.profiles.avatar_url || "https://source.unsplash.com/100x100/?portrait"} 
                          alt={comment.profiles.username || "User"}
                          className="w-full h-full object-cover" 
                        />
                      </Avatar>
                    </button>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <button
                          className="font-medium hover:underline"
                          onClick={() => handleUserClick(comment.user_id)}
                        >
                          {comment.profiles.username || "Anonymous"}
                        </button>
                        <span className="text-xs text-white/40">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-white/80">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-white/60 py-6">No comments yet</div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Input
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
            />
            <Button onClick={handleSubmitComment}>Post</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
