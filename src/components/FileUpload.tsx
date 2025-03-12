import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { uploadFileWithFallback, generateFilePath } from "@/utils/upload-helper";

interface FileUploadProps {
  endpoint: "profilePicture" | "serviceImage" | "postImage";
  onChange: (url: string) => void;
  className?: string;
}

export function FileUpload({ endpoint, onChange, className }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();

  // Default base64 image - a simple gray placeholder with text
  const getDefaultImageForEndpoint = (): string => {
    const text = endpoint === "profilePicture" ? "Profile" : 
                endpoint === "serviceImage" ? "Service" : "Post";
    
    return `data:image/svg+xml;base64,${btoa(`<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="200" fill="#eeeeee"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="18px" text-anchor="middle" dominant-baseline="middle" fill="#999999">No ${text} Image</text></svg>`)}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    setHasError(false);
    const file = e.target.files[0];
    setIsUploading(true);

    try {
      // Get the user ID if available (for better file organization)
      let userId = 'anonymous';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          userId = session.user.id;
        }
      } catch (err) {
        console.warn('Could not get user session:', err);
      }

      // Convert endpoint to the type needed for generateFilePath
      const fileType = endpoint === 'profilePicture' 
        ? 'profile' 
        : endpoint === 'serviceImage' 
          ? 'service' 
          : 'post';
      
      // Generate a unique file path
      const filePath = generateFilePath(file, userId, fileType);
      
      console.log('Uploading file to path:', filePath);
      
      // Use the helper function to handle the upload with fallbacks
      const result = await uploadFileWithFallback(file, filePath, {
        uiCallback: (status, message) => {
          if (status === 'error') {
            console.warn(message);
            setHasError(true);
          }
        }
      });
      
      console.log('Upload result:', result);
      
      // Handle the result
      if (result.source === 'supabase') {
        onChange(result.url);
        toast({
          title: "File uploaded successfully",
          description: "Your file has been uploaded and attached.",
        });
      } else if (result.source === 'local') {
        onChange(result.url);
        setHasError(true);
        
        // Show a more specific error message for bucket not found
        if (result.error && result.error.message?.includes('Bucket not found')) {
          toast({
            title: "Storage bucket not configured",
            description: "The storage bucket isn't set up. Contact the administrator. Using local image instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Using local image",
            description: "Storage unavailable. Using local image as temporary solution.",
            variant: "destructive",
          });
        }
      } else {
        // Fallback to placeholder
        onChange(result.url || getDefaultImageForEndpoint());
        setHasError(true);
        toast({
          title: "Upload failed",
          description: "Could not upload image. Using placeholder instead.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setHasError(true);
      
      // Create a more helpful error message
      let errorMessage = "There was an error uploading your file. Using local version instead.";
      
      if (error.message?.includes("Bucket not found")) {
        errorMessage = "Storage not configured properly. Using local image instead.";
      } else if (error.message?.includes("maximum allowed size")) {
        errorMessage = "File is too large. Please select a smaller file.";
      }
      
      // Use the default placeholder
      onChange(getDefaultImageForEndpoint());
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Clear the input value to allow uploading the same file again
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  return (
    <div className={className}>
      <Label htmlFor="file-upload" className="block mb-2">
        Upload Image
      </Label>
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            disabled={isUploading}
            className={`flex-1 ${hasError ? 'border-red-400' : ''}`}
            accept="image/*"
          />
          {hasError ? (
            <AlertTriangle className="absolute left-2 top-[50%] transform translate-y-[-50%] h-4 w-4 text-red-500" />
          ) : (
            <ImageIcon className="absolute left-2 top-[50%] transform translate-y-[-50%] h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {isUploading && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {hasError 
          ? "Storage unavailable. Using local image instead." 
          : "Supported formats: JPG, PNG, GIF (max 5MB)"}
      </p>
    </div>
  );
} 