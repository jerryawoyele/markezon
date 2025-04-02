import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface ShareProfileButtonProps {
  userId: string;
  username?: string;
  className?: string;
}

export function ShareProfileButton({ userId, username, className = "" }: ShareProfileButtonProps) {
  const { toast } = useToast();
  
  const handleShare = async () => {
    // Generate the URL to share (use username in URL if available for better SEO)
    const profileUrl = username 
      ? `${window.location.origin}/user/${username}`
      : `${window.location.origin}/user/${userId}`;
    
    if (navigator.share) {
      // Use the Web Share API if available (mobile devices)
      try {
        await navigator.share({
          title: `${username || 'User'}'s Profile on Venturezon`,
          text: `Check out ${username || 'this user'}'s profile on Venturezon!`,
          url: profileUrl
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
          // Fallback to clipboard
          copyToClipboard(profileUrl);
        }
      }
    } else {
      // Fallback for desktop: copy to clipboard
      copyToClipboard(profileUrl);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Link copied!",
        description: "Profile link copied to clipboard"
      });
    }).catch(err => {
      console.error('Failed to copy:', err);
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive"
      });
    });
  };
  
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleShare}
      className={className}
      aria-label="Share profile"
    >
      <Share2 className="h-5 w-5" />
    </Button>
  );
} 