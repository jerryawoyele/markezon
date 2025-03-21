import { ImgHTMLAttributes, useState, useEffect } from 'react';
import { ProfileImageModal } from '@/components/profile/ProfileImageModal';

interface ProfileImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt: string;
  className?: string;
}

export default function ProfileImage({ src, alt, className, ...props }: ProfileImageProps) {
  const defaultImage = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  useEffect(() => {
    // Reset loading state when src changes
    setIsLoading(true);
    setRetryCount(0);
    
    const loadImage = () => {
      if (src) {
        // Preload the image
        const img = new Image();
        img.src = src;
        img.onload = () => {
          setCurrentSrc(src);
          setIsLoading(false);
        };
        img.onerror = () => {
          // If it's an external URL (like from Google), retry a few times
          if (
            retryCount < maxRetries && 
            (src.includes('googleusercontent.com') || 
             src.includes('github') || 
             src.includes('facebook') || 
             src.includes('twitter'))
          ) {
            console.log(`Retrying image load (${retryCount + 1}/${maxRetries}):`, src);
            setRetryCount(prev => prev + 1);
            // Add a slight delay before retrying
            setTimeout(loadImage, 1000);
          } else {
            console.error('Failed to load image after retries:', src);
            setCurrentSrc(defaultImage);
            setIsLoading(false);
          }
        };
      } else {
        setCurrentSrc(defaultImage);
        setIsLoading(false);
      }
    };
    
    loadImage();
  }, [src, retryCount]);
  
  return (
    <>
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-black/20 animate-pulse rounded-full flex items-center justify-center">
            <span className="sr-only">Loading image...</span>
          </div>
        )}
        <img 
          src={currentSrc || defaultImage} 
          alt={alt} 
          className={`${className} cursor-pointer transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} 
          onClick={() => setIsModalOpen(true)}
          {...props} 
        />
      </div>
      
      <ProfileImageModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageUrl={currentSrc}
        alt={alt}
      />
    </>
  );
} 