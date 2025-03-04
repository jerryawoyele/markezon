import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Heart, 
  MessageCircle, 
  Send, 
  MoreVertical, 
  Trash, 
  Edit,
  ChevronLeft,
  ChevronRight 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistance } from "date-fns";

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
  onDelete?: (postId: string) => Promise<void>;
  onEdit?: (postId: string, newCaption: string) => Promise<void>;
  currentUserId?: () => Promise<string | null>;
  showDetailOnClick?: boolean;
}

export function Post({ 
  id, 
  user_id,
  profiles, 
  image_url, 
  caption, 
  created_at,
  onLike, 
  onComment, 
  onShare,
  onDelete,
  onEdit,
  currentUserId,
  showDetailOnClick = false
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
  const [showPostModal, setShowPostModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedCaption, setEditedCaption] = useState(caption || "");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [parsedImages, setParsedImages] = useState<string[]>([]);
  const [lastTap, setLastTap] = useState<number>(0);
  const navigate = useNavigate();
  const postCardRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isDetailClickEnabled = showDetailOnClick || location.pathname.includes('/discover') || location.pathname.includes('/user/');

  useEffect(() => {
    const checkOwnership = async () => {
      if (currentUserId) {
        const userId = await currentUserId();
        setIsOwner(userId === user_id);
      }
    };
    checkOwnership();
  }, [currentUserId, user_id]);

  useEffect(() => {
    try {
      const parsedData = JSON.parse(image_url);
      if (Array.isArray(parsedData)) {
        setParsedImages(parsedData);
      } else {
        setParsedImages([image_url]);
      }
    } catch (e) {
      setParsedImages([image_url]);
    }
  }, [image_url]);

  useEffect(() => {
    const fetchLikesAndComments = async () => {
      try {
        const { data: likesData, error: likesError } = await supabase
          .from('likes')
          .select(`
            id,
            user_id,
            post_id,
            created_at,
            profile:profiles(
              username,
              avatar_url
            )
          `)
          .eq('post_id', id);
          
        if (likesError) throw likesError;
        
        const user = await supabase.auth.getUser();
        const currentUserId = user.data.user?.id;
        
        if (likesData) {
          setLikes(likesData as Like[]);
          setLikesCount(likesData.length);
          setLiked(currentUserId ? likesData.some(like => like.user_id === currentUserId) : false);
        }
        
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            user_id,
            post_id,
            profile:profiles(
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
        setLikesCount(0);
        setCommentsCount(0);
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
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', currentUserId);
          
        if (error) throw error;
        
        setLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
        
        setLikes(prev => prev.filter(like => like.user_id !== currentUserId));
      } else {
        const { error, data } = await supabase
          .from('likes')
          .insert({
            post_id: id,
            user_id: currentUserId
          })
          .select('*, profile:profiles(username, avatar_url)');
          
        if (error) throw error;
        
        setLiked(true);
        setLikesCount(prev => prev + 1);
        
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
      
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: id,
          user_id: currentUserId,
          content: newComment
        })
        .select('*, profile:profiles(username, avatar_url)');
        
      if (error) throw error;
      
      if (data && data[0]) {
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

  const handleDelete = async () => {
    if (onDelete) await onDelete(id);
  };

  const handleEdit = async () => {
    if (editMode && onEdit) {
      await onEdit(id, editedCaption);
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  };

  const handleNextImage = () => {
    if (currentImageIndex < parsedImages.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  };

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  const handleImageTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // ms
    
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      handleLike();
    }
    
    setLastTap(now);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    }
    
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m`;
    }
    
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h`;
    }
    
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d`;
    }
    
    if (date.getFullYear() === now.getFullYear()) {
      return format(date, 'MMM d');
    }
    
    return format(date, 'MMM d, yyyy');
  };

  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'h:mm a');
    }
    
    return format(date, 'MMM d, h:mm a');
  };

  const isTextPost = () => {
    try {
      return parsedImages[0]?.startsWith('data:image/svg+xml');
    } catch (e) {
      return false;
    }
  };

  return (
    <>
      <Card 
        className="overflow-hidden bg-black/20 border-white/5 max-w-3xl w-full mx-auto"
        ref={postCardRef}
        onClick={() => isDetailClickEnabled && setShowPostModal(true)}
      >
        <div className="p-4 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <button onClick={handleProfileClick}>
              <Avatar>
                <img 
                  src={profiles?.avatar_url || 'https://source.unsplash.com/100x100/?portrait'} 
                  alt={profiles?.username || 'User'}
                  className="w-full h-full object-cover"
                />
              </Avatar>
            </button>
            <div>
              <button 
                className="font-medium hover:underline"
                onClick={handleProfileClick}
              >
                {profiles?.username || 'Anonymous'}
              </button>
              <div className="text-xs text-white/60">
                {formatTimeAgo(created_at)}
              </div>
            </div>
          </div>
          
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-black/90 border-white/10">
                <DropdownMenuItem 
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit();
                  }}
                >
                  <Edit className="h-4 w-4" />
                  {editMode ? "Save Edit" : "Edit Post"}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="flex items-center gap-2 text-red-500 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                >
                  <Trash className="h-4 w-4" />
                  Delete Post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {parsedImages.length > 0 && (
          <div 
            className="relative min-h-[200px] min-w-[300px]" 
            onClick={handleImageTap}
          >
            <img 
              src={parsedImages[currentImageIndex]} 
              alt={caption || 'Post image'}
              className="w-full h-auto max-h-[600px] min-h-[200px] object-contain bg-black/30"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://source.unsplash.com/800x600/?abstract';
              }}
            />
            
            {parsedImages.length > 1 && (
              <>
                <button 
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/30 p-1 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  disabled={currentImageIndex === 0}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/30 p-1 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  disabled={currentImageIndex === parsedImages.length - 1}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                  {parsedImages.map((_, index) => (
                    <div 
                      key={index} 
                      className={`w-2 h-2 rounded-full ${currentImageIndex === index ? 'bg-primary' : 'bg-white/30'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        
        <div className="p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLike}
              className={liked ? "hover:bg-black/80" : "hover:bg-white/10"}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-current text-primary' : ''}`} />
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

          {!isTextPost() && (
            editMode ? (
              <div className="flex gap-2 items-center">
                <Textarea 
                  value={editedCaption} 
                  onChange={(e) => setEditedCaption(e.target.value)}
                  className="flex-1 min-h-[100px]" 
                />
                <div className="flex flex-col gap-2">
                  <Button size="sm" onClick={handleEdit}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditMode(false);
                    setEditedCaption(caption || "");
                  }}>Cancel</Button>
                </div>
              </div>
            ) : (
              caption && (
                <p className="text-sm">
                  <span className="font-medium mr-2">{profiles?.username || 'Anonymous'}</span>
                  {caption}
                </p>
              )
            )
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
                  {comments.slice(0, 1).map((comment) => (
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
                          <span className="text-xs text-white/40">{formatCommentDate(comment.created_at)}</span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  
                  {comments.length > 1 && (
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
      
      <Dialog open={showCommentsModal} onOpenChange={setShowCommentsModal}>
        <DialogContent className="sm:max-w-[500px] bg-black/90 border-white/10 max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          
          <div className="my-4 space-y-4 max-h-[60vh] overflow-hidden flex flex-col">
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
              <div className="space-y-4 overflow-y-auto flex-1 pb-4">
                {comments.map((comment) => (
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
                        <span className="text-xs text-white/40">{formatCommentDate(comment.created_at)}</span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
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
      
      <Dialog open={showLikesModal} onOpenChange={setShowLikesModal}>
        <DialogContent className="sm:max-w-[400px] bg-black/90 border-white/10 max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Likes</DialogTitle>
          </DialogHeader>
          
          <div className="my-4 max-h-[60vh] overflow-y-auto">
            {likes.length > 0 ? (
              <div className="space-y-4">
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
      
      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent className="sm:max-w-[650px] bg-black/90 border-white/10 h-[90vh] max-h-[90vh] p-0">
          <div className="flex flex-col h-full overflow-hidden">
            {parsedImages.length > 0 && (
              <div className="relative h-auto max-h-[60%] min-h-[200px] bg-black flex items-center justify-center">
                <img 
                  src={parsedImages[currentImageIndex]} 
                  alt={caption || 'Post image'}
                  className="w-full h-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://source.unsplash.com/800x600/?abstract';
                  }}
                />
                
                {parsedImages.length > 1 && (
                  <>
                    <button 
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/30 p-1 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevImage();
                      }}
                      disabled={currentImageIndex === 0}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button 
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/30 p-1 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage();
                      }}
                      disabled={currentImageIndex === parsedImages.length - 1}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                    
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                      {parsedImages.map((_, index) => (
                        <div 
                          key={index} 
                          className={`w-2 h-2 rounded-full ${currentImageIndex === index ? 'bg-primary' : 'bg-white/30'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            
            <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
              <div className="flex items-center gap-3">
                <Avatar>
                  <img 
                    src={profiles?.avatar_url || 'https://source.unsplash.com/100x100/?portrait'} 
                    alt={profiles?.username || 'User'}
                    className="w-full h-full object-cover"
                  />
                </Avatar>
                <div>
                  <div className="font-medium">{profiles?.username || 'Anonymous'}</div>
                  <div className="text-xs text-white/60">{formatTimeAgo(created_at)}</div>
                </div>
              </div>
              
              {!isTextPost() && caption && (
                <p className="text-sm">
                  <span className="font-medium mr-2">{profiles?.username || 'Anonymous'}</span>
                  {caption}
                </p>
              )}
              
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleLike}
                  className={`${liked ? 'hover:bg-black/80' : 'hover:bg-white/10'}`}
                >
                  <Heart className={`w-5 h-5 ${liked ? 'fill-current text-primary' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon">
                  <MessageCircle className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleShare}>
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="text-sm font-medium">
                {likesCount} likes
              </div>
              
              <div className="flex flex-col gap-2 overflow-hidden flex-1">
                <h3 className="font-medium">Comments</h3>
                
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                    className="flex-1"
                  />
                  <Button onClick={handleComment} disabled={loading}>
                    {loading ? "..." : "Post"}
                  </Button>
                </div>
                
                {comments.length > 0 ? (
                  <div className="space-y-3 overflow-y-auto flex-1 pb-4">
                    {comments.map((comment) => (
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
                            <span className="text-xs text-white/40">{formatCommentDate(comment.created_at)}</span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-white/60 text-sm">
                    No comments yet. Be the first to comment!
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
