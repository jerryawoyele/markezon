import { ImgHTMLAttributes } from 'react';

interface ProfileImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt: string;
  className?: string;
}

export default function ProfileImage({ src, alt, className, ...props }: ProfileImageProps) {
  const defaultImage = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
  
  return (
    <img 
      src={src || defaultImage} 
      alt={alt} 
      className={className} 
      {...props} 
    />
  );
} 