import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CreatePostProps {
  onSubmit: (data: { text: string; image_url: string }) => Promise<void>;
}

export function CreatePost({ onSubmit }: CreatePostProps) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [localImage, setLocalImage] = useState<File | null>(null);
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("text");

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocalImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset form
  const resetForm = () => {
    setText("");
    setImageUrl("");
    setLocalImage(null);
    setLocalImagePreview(null);
    setActiveTab("text");
  };

  const handleSubmit = async () => {
    if ((!text.trim() && !localImagePreview)) return;

    setLoading(true);
    try {
      let finalImageUrl = "";

      // If we have a local image, upload it to Supabase Storage
      if (localImage) {
        const user = await supabase.auth.getUser();
        const userId = user.data.user?.id;
        
        if (!userId) {
          throw new Error("User not authenticated");
        }

        // Create a unique file path
        const fileExt = localImage.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('posts')
          .upload(filePath, localImage);

        if (error) {
          throw error;
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrl;
      } else {
        finalImageUrl = imageUrl;
      }

      await onSubmit({ text, image_url: finalImageUrl });
      resetForm();
      setIsOpen(false);
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="bg-black/20 border border-white/5 rounded-xl shadow-sm p-6">
          <div className="flex gap-3">
            <Avatar>
              <img
                src="https://source.unsplash.com/100x100/?portrait"
                alt="User"
                className="w-full h-full object-cover"
              />
            </Avatar>
            <div className="flex-1 space-y-4">
              <div className="w-full bg-white/5 rounded-full px-4 py-2 text-white/60">
                What's on your mind?
              </div>
            </div>
          </div>
        </Card>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] bg-black/90 border-white/10">
        <DialogHeader>
          <DialogTitle>Create a Post</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="text" value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">Text Post</TabsTrigger>
            <TabsTrigger value="image">Image Post</TabsTrigger>
          </TabsList>
          
          <div className="mt-4 space-y-4">
            <textarea
              placeholder="What's on your mind?"
              className="w-full bg-transparent border border-white/10 rounded-md resize-none focus:outline-none focus:border-white/30 p-3 min-h-[120px] text-white/80"
              value={text}
              onChange={e => setText(e.target.value)}
            />
            
            {activeTab === "image" && (
              <div className="space-y-4">
                {localImagePreview ? (
                  <div className="relative">
                    <img
                      src={localImagePreview}
                      alt="Post preview"
                      className="w-full h-60 object-cover rounded-md"
                    />
                    <button
                      className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full"
                      onClick={() => {
                        setLocalImage(null);
                        setLocalImagePreview(null);
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="border border-dashed border-white/20 rounded-md p-4 text-center">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <ImageIcon size={24} className="mb-2 text-white/60" />
                      <span className="text-white/60">Click to upload an image</span>
                    </label>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end">
              <Button 
                onClick={handleSubmit}
                disabled={(activeTab === "text" && !text.trim()) || (activeTab === "image" && !localImagePreview && !text.trim()) || loading}
                className="w-full"
              >
                {loading ? "Creating..." : "Create Post"}
              </Button>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
