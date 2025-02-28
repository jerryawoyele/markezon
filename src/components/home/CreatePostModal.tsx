
import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { ImageIcon, TextIcon, X } from "lucide-react";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePost: (caption: string, image: File | null, type: "text" | "image") => void;
}

export function CreatePostModal({ 
  open, 
  onOpenChange, 
  onCreatePost 
}: CreatePostModalProps) {
  const [caption, setCaption] = useState("");
  const [postType, setPostType] = useState<"text" | "image">("text");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setSelectedImage(file);
      setPostType("image");
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = () => {
    if (!caption.trim() && !selectedImage) return;
    
    onCreatePost(caption, selectedImage, postType);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setCaption("");
    setPostType("text");
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-black/90 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl">Create a New Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Textarea
            placeholder="What's on your mind?"
            className="min-h-32 resize-none"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          <RadioGroup value={postType} onValueChange={(value) => setPostType(value as "text" | "image")}>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="text" id="text" />
                <Label htmlFor="text" className="flex items-center gap-2">
                  <TextIcon className="w-4 h-4" />
                  Text Post
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="image" id="image" />
                <Label htmlFor="image" className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Image Post
                </Label>
              </div>
            </div>
          </RadioGroup>

          {postType === "image" && (
            <div className="space-y-4">
              <div className="flex items-center">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="mr-2"
                >
                  {selectedImage ? "Change Image" : "Select Image"}
                </Button>
                {selectedImage && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="icon"
                    onClick={clearImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              {imagePreview && (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="rounded-md max-h-64 object-contain mx-auto"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">Cancel</Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={handleCreatePost}
            disabled={!caption.trim() && !selectedImage}
          >
            Create Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
