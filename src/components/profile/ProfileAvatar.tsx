import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileAvatarProps {
  userProfile: any; // User profile data
  size?: number; // Optional size in pixels
  className?: string; // Optional additional classes
}

export function ProfileAvatar({ userProfile, size = 40, className = "" }: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  // Default avatar if none exists
  const defaultAvatar = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";
  
  // Extract first letter of username for fallback
  const fallbackText = userProfile?.username?.[0]?.toUpperCase() || 
                      userProfile?.full_name?.[0]?.toUpperCase() || 
                      userProfile?.email?.[0]?.toUpperCase() || 
                      "U";
  
  // Determine whether to use the avatar URL or default
  // If imageError is true, we had a loading error and should use the default
  // If the user profile is missing or doesn't have an avatar_url, use the default
  const avatarUrl = (!imageError && userProfile?.avatar_url) ? userProfile.avatar_url : defaultAvatar;
  
  return (
    <Avatar 
      className={`${className}`} 
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <AvatarImage 
        src={avatarUrl} 
        alt={userProfile?.username || "User"}
        onError={() => setImageError(true)}
      />
      <AvatarFallback>{fallbackText}</AvatarFallback>
    </Avatar>
  );
} 