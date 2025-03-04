
import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { PlusCircle, Image, Upload, X } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LocalImageUpload } from "./LocalImageUpload";

interface CreatePostProps {
  onSubmit: (data: { text: string; image_url: string | string[]; isTextPost: boolean }) => Promise<void>;
}

export function CreatePost({ onSubmit }: CreatePostProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isTextPost, setIsTextPost] = useState(true);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!text.trim() && imageUrls.length === 0) return;
    
    setLoading(true);
    try {
      await onSubmit({
        text: text.trim(),
        image_url: isTextPost ? text.trim() : imageUrls,
        isTextPost
      });
      
      setText("");
      setImageUrls([]);
      setImagePreviews([]);
      setOpen(false);
    } catch (error) {
      console.error("Error submitting post:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Limit to 8 images total
    const remainingSlots = 8 - imageUrls.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setImageUrls(prev => [...prev, result]);
        setImagePreviews(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls(prevUrls => prevUrls.filter((_, i) => i !== index));
    setImagePreviews(prevPreviews => prevPreviews.filter((_, i) => i !== index));
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
        <DialogContent className="sm:max-w-md bg-background border-white/10 max-h-[90vh] overflow-hidden">
          <DialogHeader className="mb-4">
            <DialogTitle>Create Post</DialogTitle>
            <DialogDescription>
              Share updates about your business with the community
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-11rem)] pb-4">
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
              {isTextPost ? (
                <div>
                  <Label htmlFor="post-text">Text Content</Label>
                  <Textarea
                    id="post-text"
                    className="flex w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none min-h-[200px]"
                    placeholder="Share your thoughts, updates, or services..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <p className="text-xs text-white/50 mt-1">This will create a text-based post.</p>
                </div>
              ) : (
                <>
                  {/* Caption input for image posts */}
                  <div>
                    <Label htmlFor="post-caption">Caption</Label>
                    <Textarea
                      id="post-caption"
                      className="flex w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none min-h-[100px]"
                      placeholder="Add a caption to your images..."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </div>
                  
                  {/* Multiple image upload */}
                  <div className="space-y-2">
                    <Label>Upload Images (max 8)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative w-24 h-24 border border-white/10 rounded-md overflow-hidden">
                          <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
                            onClick={() => handleRemoveImage(index)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      
                      {imagePreviews.length < 8 && (
                        <button 
                          type="button" 
                          className="w-24 h-24 border border-dashed border-white/20 rounded-md flex items-center justify-center"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <PlusCircle size={24} className="text-white/40" />
                        </button>
                      )}
                    </div>
                    
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                    />
                    
                    <p className="text-xs text-white/50 mt-1">
                      {imagePreviews.length === 0 
                        ? "Select up to 8 images to upload" 
                        : `${imagePreviews.length} image${imagePreviews.length !== 1 ? 's' : ''} selected (${8 - imagePreviews.length} remaining)`}
                    </p>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
          
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || (isTextPost ? !text.trim() : (!text.trim() && imageUrls.length === 0))}
            >
              {loading ? "Creating..." : "Create Post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
