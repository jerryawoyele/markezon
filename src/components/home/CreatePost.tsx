
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CreatePostProps {
  onSubmit: (data: { text: string; image_url: string }) => Promise<void>;
}

export function CreatePost({ onSubmit }: CreatePostProps) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Get current user
  supabase.auth.getUser().then(({ data }) => {
    setUser(data.user);
  });

  const handleSubmit = async () => {
    if (!text.trim() && !imageUrl) return;

    setLoading(true);
    try {
      await onSubmit({ text, image_url: imageUrl });
      setText("");
      setImageUrl("");
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setLoading(false);
    }
  };

  // For demo purposes, let's just set a random image URL when the image button is clicked
  const handleImageClick = () => {
    setImageUrl("https://source.unsplash.com/random/600x400/?nature");
  };

  return (
    <Card className="p-4 bg-black/20 border-white/5">
      <div className="flex gap-3">
        <Avatar>
          <img
            src="https://source.unsplash.com/100x100/?portrait"
            alt="User"
            className="w-full h-full object-cover"
          />
        </Avatar>
        <div className="flex-1 space-y-4">
          <textarea
            placeholder="What's on your mind?"
            className="w-full bg-transparent border-b border-white/10 resize-none focus:outline-none focus:border-white/30 p-2 min-h-[80px] text-white/80"
            value={text}
            onChange={e => setText(e.target.value)}
          />
          
          {imageUrl && (
            <div className="relative">
              <img
                src={imageUrl}
                alt="Post preview"
                className="w-full h-60 object-cover rounded-md"
              />
              <button
                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"
                onClick={() => setImageUrl("")}
              >
                ✕
              </button>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <button
              className="flex items-center gap-2 text-white/60 hover:text-white/80"
              onClick={handleImageClick}
            >
              <ImageIcon size={18} />
              <span>Add Image</span>
            </button>
            
            <Button 
              onClick={handleSubmit}
              disabled={(!text.trim() && !imageUrl) || loading}
            >
              {loading ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
