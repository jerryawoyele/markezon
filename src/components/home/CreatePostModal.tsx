
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LocalImageUpload } from "./LocalImageUpload";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { text: string; image_url: string }) => void;
}

export function CreatePostModal({ isOpen, onClose, onSubmit }: CreatePostModalProps) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !imageUrl) return;

    setIsSubmitting(true);
    onSubmit({
      text,
      image_url: imageUrl || "",
    });
    setIsSubmitting(false);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setText("");
    setImageUrl(null);
  };

  const handleImageSelected = (selectedImageUrl: string | null) => {
    setImageUrl(selectedImageUrl);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
          <DialogDescription>
            Share your thoughts, services, or portfolio with the community
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Textarea
            placeholder="What would you like to share?"
            className="min-h-[100px] resize-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          
          <LocalImageUpload onImageSelected={handleImageSelected} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || (!text.trim() && !imageUrl)}
            >
              {isSubmitting ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
