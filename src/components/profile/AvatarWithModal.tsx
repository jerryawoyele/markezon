import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileImageModal } from './ProfileImageModal';
import { Skeleton } from "@/components/ui/skeleton";
import type { Profile as ProfileType } from "@/types";

interface AvatarWithModalProps {
  profile?: ProfileType | null;
  avatarUrl?: string | null;
  username?: string;
  className?: string;
  fallback?: string;
  size?: number;
  isLoading?: boolean;
}

export function AvatarWithModal({ 
  profile, 
  avatarUrl, 
  username, 
  className, 
  fallback, 
  size = 40, 
  isLoading = false 
}: AvatarWithModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Use profile data if provided, otherwise use direct props
  const actualAvatarUrl = profile?.avatar_url || avatarUrl;
  const actualUsername = profile?.username || username;
  const fallbackText = fallback || actualUsername?.[0] || 'U';
  
  const sizeStyle = { width: `${size}px`, height: `${size}px` };
  
  if (isLoading) {
    return <Skeleton className="rounded-full" style={sizeStyle} />;
  }
  
  return (
    <>
      <Avatar 
        className={`${className} cursor-pointer`} 
        onClick={() => setIsModalOpen(true)}
        style={sizeStyle}
      >
        <AvatarImage src={actualAvatarUrl || undefined} />
        <AvatarFallback>{fallbackText}</AvatarFallback>
      </Avatar>
      
      <ProfileImageModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageUrl={actualAvatarUrl}
        alt={`${actualUsername || 'User'}'s profile picture`}
      />
    </>
  );
} 