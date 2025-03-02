
import { useState, useRef, ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image } from "lucide-react";

interface LocalImageUploadProps {
  onImageSelected: (imageUrl: string | null) => void;
}

export function LocalImageUpload({ onImageSelected }: LocalImageUploadProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedImage(null);
      onImageSelected(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedImage(result);
      onImageSelected(result);
    };
    reader.readAsDataURL(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    onImageSelected(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleButtonClick}
          className="flex items-center gap-2"
        >
          <Image className="w-4 h-4" />
          <span>Upload Image</span>
        </Button>
        <Input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageChange}
        />
        {selectedImage && (
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleRemoveImage}
            size="sm"
          >
            Remove
          </Button>
        )}
      </div>
      
      {selectedImage && (
        <div className="relative rounded-md overflow-hidden min-h-[200px] min-w-[200px] border border-white/10">
          <img 
            src={selectedImage} 
            alt="Selected" 
            className="w-full h-auto max-h-[300px] object-contain bg-black/20" 
          />
        </div>
      )}
    </div>
  );
}
