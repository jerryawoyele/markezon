
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Heart, Send } from "lucide-react";

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
  profiles: Profile | null;
}

export function Post({ profiles, image_url, caption }: PostProps) {
  return (
    <Card className="overflow-hidden bg-black/20 border-white/5">
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
      
      <div className="aspect-square">
        <img 
          src={image_url} 
          alt={caption || 'Post image'}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Heart className="w-5 h-5" />
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
      </div>
    </Card>
  );
}
