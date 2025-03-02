
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { PlusCircle, Image } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreatePostProps {
  onSubmit: (data: { text: string; image_url: string }) => Promise<void>;
}

export function CreatePost({ onSubmit }: CreatePostProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isTextPost, setIsTextPost] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() && !imageUrl.trim()) return;
    
    setLoading(true);
    try {
      await onSubmit({
        text: text.trim(),
        image_url: imageUrl.trim()
      });
      
      setText("");
      setImageUrl("");
      setImagePreview(null);
      setOpen(false);
    } catch (error) {
      console.error("Error submitting post:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUrlChange = (url: string) => {
    setImageUrl(url);
    setImagePreview(url);
  };

  const togglePostType = () => {
    setIsTextPost(!isTextPost);
  };

  return (
    <>
      <Card className="p-6 bg-black/20 border-white/5">
        <div className="flex items-center gap-3">
          <Avatar>
            <img
              src="https://source.unsplash.com/100x100/?portrait"
              alt="User avatar"
              className="w-full h-full object-cover"
            />
          </Avatar>
          <button
            className="flex-1 bg-white/5 hover:bg-white/10 rounded-full px-4 py-3 text-left text-white/60 cursor-pointer"
            onClick={() => setOpen(true)}
          >
            What's happening in your business?
          </button>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-background border-white/10">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
            <DialogDescription>
              Share updates about your business with the community
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-3 mb-4">
            <Button 
              variant={isTextPost ? "default" : "outline"} 
              onClick={() => setIsTextPost(true)}
              className="flex-1"
            >
              Text Post
            </Button>
            <Button 
              variant={!isTextPost ? "default" : "outline"} 
              onClick={() => setIsTextPost(false)}
              className="flex-1"
            >
              Image Post
            </Button>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="post-text">Post Content</Label>
              <textarea
                id="post-text"
                className="flex w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none min-h-[100px]"
                placeholder="Share your thoughts, updates, or services..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            
            {!isTextPost && (
              <div className="space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  id="image-url"
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => handleImageUrlChange(e.target.value)}
                />
                
                {imagePreview && (
                  <div className="mt-3 relative aspect-video rounded-md overflow-hidden bg-white/5">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                      onError={() => setImagePreview(null)}
                    />
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || (!text.trim() && !imageUrl.trim())}
              >
                {loading ? "Creating..." : "Create Post"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
