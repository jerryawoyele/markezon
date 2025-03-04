
import React, { useState, useRef, ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image, X } from "lucide-react";

interface LocalImageUploadProps {
  onImageSelected: (imageUrl: string | null) => void;
  previewUrl?: string | null;
  multiple?: boolean;
  onMultipleImagesSelected?: (imageUrls: string[]) => void;
  maxImages?: number;
}

export function LocalImageUpload({ 
  onImageSelected, 
  previewUrl, 
  multiple = false,
  onMultipleImagesSelected,
  maxImages = 8
}: LocalImageUploadProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(previewUrl || null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update local state when previewUrl changes from parent
  React.useEffect(() => {
    if (previewUrl !== undefined) {
      setSelectedImage(previewUrl);
    }
  }, [previewUrl]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      if (!multiple) {
        setSelectedImage(null);
        onImageSelected(null);
      }
      return;
    }

    if (multiple && onMultipleImagesSelected) {
      const remainingSlots = maxImages - selectedImages.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      
      const newImages: string[] = [];
      let processed = 0;
      
      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          newImages.push(result);
          processed++;
          
          if (processed === filesToProcess.length) {
            const updatedImages = [...selectedImages, ...newImages];
            setSelectedImages(updatedImages);
            onMultipleImagesSelected(updatedImages);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      // Single image mode
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setSelectedImage(result);
        onImageSelected(result);
      };
      reader.readAsDataURL(file);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
  
  const handleRemoveMultipleImage = (index: number) => {
    if (multiple && onMultipleImagesSelected) {
      const newImages = selectedImages.filter((_, i) => i !== index);
      setSelectedImages(newImages);
      onMultipleImagesSelected(newImages);
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
          <span>Upload Image{multiple ? 's' : ''}</span>
        </Button>
        <Input
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageChange}
        />
        
        {!multiple && selectedImage && (
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
      
      {!multiple && selectedImage && (
        <div className="relative rounded-md overflow-hidden min-h-[200px] min-w-[200px] border border-white/10">
          <img 
            src={selectedImage} 
            alt="Selected" 
            className="w-full h-auto max-h-[300px] object-contain bg-black/20" 
          />
        </div>
      )}
      
      {multiple && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedImages.map((image, index) => (
            <div key={index} className="relative w-24 h-24 border border-white/10 rounded-md overflow-hidden">
              <img src={image} alt={`Preview ${index}`} className="w-full h-full object-cover" />
              <button 
                type="button" 
                className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
                onClick={() => handleRemoveMultipleImage(index)}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
