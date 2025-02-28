
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ImageIcon, TextIcon } from "lucide-react";

interface CreatePostProps {
  postText: string;
  postImage: string;
  setPostText: (text: string) => void;
  setPostImage: (url: string) => void;
  onCreatePost: () => void;
}

export function CreatePost({ 
  postText, 
  postImage, 
  setPostText, 
  setPostImage,
  onCreatePost
}: CreatePostProps) {
  return (
    <Card className="p-6 bg-black/20 border-white/5 w-full">
      <h2 className="text-lg font-semibold mb-4">Create a Post</h2>
      <div className="space-y-4">
        <Input
          placeholder="Write something..."
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
        />
        <Input
          placeholder="Image URL (optional)"
          value={postImage}
          onChange={(e) => setPostImage(e.target.value)}
        />
        <div className="flex gap-2">
          <Button className="flex-1 gap-2" onClick={onCreatePost}>
            <TextIcon className="w-4 h-4" />
            Text Post
          </Button>
          <Button className="flex-1 gap-2" onClick={onCreatePost}>
            <ImageIcon className="w-4 h-4" />
            Image Post
          </Button>
        </div>
      </div>
    </Card>
  );
}
