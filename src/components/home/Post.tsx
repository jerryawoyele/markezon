
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Heart, Send, MessageCircle } from "lucide-react";

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
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
  const [likesCount, setLikesCount] = useState(Math.floor(Math.random() * 50)); // Mock count
  const [commentsCount, setCommentsCount] = useState(Math.floor(Math.random() * 20)); // Mock count
  const navigate = useNavigate();

  const handleLike = () => {
    setLiked(!liked);
    if (!liked) {
      setLikesCount(likesCount + 1);
    } else {
      setLikesCount(Math.max(0, likesCount - 1));
    }
    if (onLike) onLike();
  };

  const handleComment = async () => {
    if (newComment.trim() && onComment) {
      await onComment(id, newComment);
      setNewComment("");
      setCommentsCount(commentsCount + 1);
    }
  };

  const handleShare = () => {
    if (onShare) onShare();
  };

  const handleProfileClick = () => {
    navigate(`/user/${user_id}`);
  };

  return (
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
          <span className="font-medium">{likesCount} likes</span>
          <span>{commentsCount} comments</span>
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
              <Button onClick={handleComment}>Post</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
