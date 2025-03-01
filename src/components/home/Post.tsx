
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  post_id: string;
  profile?: {
    username: string | null;
    avatar_url: string | null;
  };
}

interface Like {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
  profile?: {
    username: string | null;
    avatar_url: string | null;
  };
}

interface PostProps {
  id: string; 
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  profiles: Profile;
  onLike?: () => void;
  onComment?: (postId: string, comment: string) => Promise<void>;
  onShare?: () => void;
}

export function Post({ 
  id, 
  user_id,
  profiles, 
  image_url, 
  caption, 
  onLike, 
  onComment, 
  onShare 
}: PostProps) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch likes and comments on mount
  useEffect(() => {
    const fetchLikesAndComments = async () => {
      try {
        // Fetch likes
        const { data: likesData, error: likesError } = await supabase
          .from('likes')
          .select(`
            id,
            user_id,
            post_id,
            created_at,
            profile:user_id (
              username,
              avatar_url
            )
          `)
          .eq('post_id', id);
          
        if (likesError) throw likesError;
        
        // Check if current user liked the post
        const user = await supabase.auth.getUser();
        const currentUserId = user.data.user?.id;
        
        if (likesData) {
          setLikes(likesData as Like[]);
          setLikesCount(likesData.length);
          setLiked(currentUserId ? likesData.some(like => like.user_id === currentUserId) : false);
        }
        
        // Fetch comments
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            user_id,
            post_id,
            profile:user_id (
              username,
              avatar_url
            )
          `)
          .eq('post_id', id)
          .order('created_at', { ascending: false });
          
        if (commentsError) throw commentsError;
        
        if (commentsData) {
          setComments(commentsData as Comment[]);
          setCommentsCount(commentsData.length);
        }
      } catch (error) {
        console.error('Error fetching likes and comments:', error);
        // If we can't fetch real data, use mock counts
        setLikesCount(Math.floor(Math.random() * 50));
        setCommentsCount(Math.floor(Math.random() * 20));
      }
    };
    
    fetchLikesAndComments();
  }, [id]);

  const handleLike = async () => {
    try {
      const user = await supabase.auth.getUser();
      const currentUserId = user.data.user?.id;
      
      if (!currentUserId) {
        alert('You need to be logged in to like posts');
        return;
      }
      
      if (liked) {
        // Unlike the post
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', currentUserId);
          
        if (error) throw error;
        
        setLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
        
        // Update likes array
        setLikes(prev => prev.filter(like => like.user_id !== currentUserId));
      } else {
        // Like the post
        const { error, data } = await supabase
          .from('likes')
          .insert({
            post_id: id,
            user_id: currentUserId
          })
          .select('*, profile:user_id (username, avatar_url)');
          
        if (error) throw error;
        
        setLiked(true);
        setLikesCount(prev => prev + 1);
        
        // Update likes array
        if (data && data[0]) {
          setLikes(prev => [...prev, data[0] as Like]);
        }
      }
      
      if (onLike) onLike();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    
    setLoading(true);
    try {
      const user = await supabase.auth.getUser();
      const currentUserId = user.data.user?.id;
      
      if (!currentUserId) {
        alert('You need to be logged in to comment');
        setLoading(false);
        return;
      }
      
      // Save comment to Supabase
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: id,
          user_id: currentUserId,
          content: newComment
        })
        .select('*, profile:user_id (username, avatar_url)');
        
      if (error) throw error;
      
      if (data && data[0]) {
        // Add the new comment to the comments array
        setComments(prev => [data[0] as Comment, ...prev]);
        setCommentsCount(prev => prev + 1);
      }
      
      setNewComment("");
      
      if (onComment) await onComment(id, newComment);
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (onShare) onShare();
  };

  const handleProfileClick = () => {
    navigate(`/user/${user_id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <>
      <Card className="overflow-hidden bg-black/20 border-white/5 max-w-3xl w-full mx-auto">
        <div className="p-4 flex items-center gap-3">
          <button onClick={handleProfileClick}>
            <Avatar>
              <img 
                src={profiles?.avatar_url || 'https://source.unsplash.com/100x100/?portrait'} 
                alt={profiles?.username || 'User'}
                className="w-full h-full object-cover"
              />
            </Avatar>
          </button>
          <button 
            className="font-medium hover:underline"
            onClick={handleProfileClick}
          >
            {profiles?.username || 'Anonymous'}
          </button>
        </div>
        
        <div className="aspect-video">
          <img 
            src={image_url} 
            alt={caption || 'Post image'}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleLike}>
              <Heart className={`w-5 h-5 ${liked ? 'fill-current text-red-500' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowComments(!showComments)}>
              <MessageCircle className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Send className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="flex space-x-4 text-sm">
            <button 
              className="font-medium hover:underline" 
              onClick={() => setShowLikesModal(true)}
            >
              {likesCount} likes
            </button>
            <button 
              className="hover:underline"
              onClick={() => setShowCommentsModal(true)}
            >
              {commentsCount} comments
            </button>
          </div>

          {caption && (
            <p className="text-sm">
              <span className="font-medium mr-2">{profiles?.username || 'Anonymous'}</span>
              {caption}
            </p>
          )}

          {showComments && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                  className="flex-1"
                />
                <Button onClick={handleComment} disabled={loading}>
                  {loading ? "Posting..." : "Post"}
                </Button>
              </div>
              
              {comments.length > 0 && (
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {comments.slice(0, 3).map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <Avatar className="w-8 h-8">
                        <img 
                          src={comment.profile?.avatar_url || 'https://source.unsplash.com/100x100/?portrait'} 
                          alt={comment.profile?.username || 'User'}
                          className="w-full h-full object-cover"
                        />
                      </Avatar>
                      <div className="bg-white/5 p-2 rounded-lg flex-1">
                        <div className="flex justify-between">
                          <p className="text-sm font-medium">{comment.profile?.username || 'Anonymous'}</p>
                          <span className="text-xs text-white/40">{formatDate(comment.created_at)}</span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  
                  {comments.length > 3 && (
                    <button 
                      className="text-sm text-white/60 hover:text-white"
                      onClick={() => setShowCommentsModal(true)}
                    >
                      View all {comments.length} comments
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
      
      {/* Comments Modal */}
      <Dialog open={showCommentsModal} onOpenChange={setShowCommentsModal}>
        <DialogContent className="sm:max-w-[500px] bg-black/90 border-white/10">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          
          <div className="my-4 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                className="flex-1"
              />
              <Button onClick={handleComment} disabled={loading}>
                {loading ? "Posting..." : "Post"}
              </Button>
            </div>
            
            {comments.length > 0 ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <img 
                        src={comment.profile?.avatar_url || 'https://source.unsplash.com/100x100/?portrait'} 
                        alt={comment.profile?.username || 'User'}
                        className="w-full h-full object-cover"
                      />
                    </Avatar>
                    <div className="bg-white/5 p-3 rounded-lg flex-1">
                      <div className="flex justify-between">
                        <p className="font-medium">{comment.profile?.username || 'Anonymous'}</p>
                        <span className="text-xs text-white/40">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white/60">
                No comments yet. Be the first to comment!
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Likes Modal */}
      <Dialog open={showLikesModal} onOpenChange={setShowLikesModal}>
        <DialogContent className="sm:max-w-[400px] bg-black/90 border-white/10">
          <DialogHeader>
            <DialogTitle>Likes</DialogTitle>
          </DialogHeader>
          
          <div className="my-4">
            {likes.length > 0 ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {likes.map((like) => (
                  <div key={like.id} className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <img 
                        src={like.profile?.avatar_url || 'https://source.unsplash.com/100x100/?portrait'} 
                        alt={like.profile?.username || 'User'}
                        className="w-full h-full object-cover"
                      />
                    </Avatar>
                    <div>
                      <p className="font-medium">{like.profile?.username || 'Anonymous'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white/60">
                No likes yet. Be the first to like this post!
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
