
import { useState } from "react";
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

interface Comment {
  id: string;
  text: string;
  username: string;
  avatar_url: string;
}

interface PostProps {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  profiles: Profile | null;
}

export function Post({ profiles, image_url, caption }: PostProps) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  // Mock comments data
  const comments: Comment[] = [
    {
      id: "1",
      text: "Great post!",
      username: "jane_doe",
      avatar_url: "https://source.unsplash.com/100x100/?portrait",
    },
    {
      id: "2",
      text: "Nice work",
      username: "john_smith",
      avatar_url: "https://source.unsplash.com/100x100/?face",
    },
  ];

  const handleComment = () => {
    if (newComment.trim()) {
      // Here you would typically save the comment to your backend
      console.log("New comment:", newComment);
      setNewComment("");
    }
  };

  return (
    <Card className="overflow-hidden bg-black/20 border-white/5 max-w-3xl w-full mx-auto">
      <div className="p-4 flex items-center gap-3">
        <Avatar>
          <img 
            src={profiles?.avatar_url || 'https://source.unsplash.com/100x100/?portrait'} 
            alt={profiles?.username || 'User'}
            className="w-full h-full object-cover"
          />
        </Avatar>
        <span className="font-medium">{profiles?.username || 'Anonymous'}</span>
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
          <Button variant="ghost" size="icon">
            <Heart className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowComments(!showComments)}>
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Send className="w-5 h-5" />
          </Button>
        </div>
        
        {caption && (
          <p className="text-sm">
            <span className="font-medium mr-2">{profiles?.username}</span>
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
                className="flex-1"
              />
              <Button onClick={handleComment}>Post</Button>
            </div>

            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2">
                  <Avatar className="w-8 h-8">
                    <img 
                      src={comment.avatar_url}
                      alt={comment.username}
                      className="w-full h-full object-cover"
                    />
                  </Avatar>
                  <div>
                    <span className="font-medium text-sm mr-2">{comment.username}</span>
                    <span className="text-sm text-white/70">{comment.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
