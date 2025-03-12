import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Loader2, Star } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  content: string;
  created_at: string;
  reviewer_id: string;
  reviewer: {
    username: string | null;
    avatar_url: string | null;
  };
};

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentUserId: string | null;
}

export function ReviewsModal({ isOpen, onClose, userId, currentUserId }: ReviewsModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReviews = async () => {
      if (!isOpen) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch reviews
        const { data, error } = await supabase
          .from('reviews')
          .select(`
            *,
            reviewer:reviewer_id (
              username,
              avatar_url
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setReviews(data || []);
        
        // Calculate average rating
        if (data && data.length > 0) {
          const total = data.reduce((sum, review) => sum + review.rating, 0);
          setAverageRating(total / data.length);
        } else {
          setAverageRating(null);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
        setError("Failed to load reviews. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchReviews();
  }, [isOpen, userId]);
  
  const handleReviewerClick = (reviewerId: string) => {
    onClose();
    navigate(`/user/${reviewerId}`);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  // Render stars for a rating
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star 
          key={i} 
          className={`h-4 w-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} 
        />
      );
    }
    return stars;
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            Reviews 
            {averageRating !== null && (
              <span className="text-sm font-normal text-white/60">
                ({averageRating.toFixed(1)}) {renderStars(Math.round(averageRating))}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="p-6 pt-2 max-h-[calc(80vh-80px)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-white/60">
              <p>{error}</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              <p>No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map(review => (
                <div 
                  key={review.id}
                  className="p-4 bg-white/5 rounded-lg"
                >
                  <div className="flex justify-between mb-2">
                    <div 
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => handleReviewerClick(review.reviewer_id)}
                    >
                      <Avatar className="h-8 w-8">
                        {review.reviewer?.avatar_url ? (
                          <AvatarImage src={review.reviewer.avatar_url} alt={review.reviewer?.username || ""} />
                        ) : (
                          <AvatarFallback>{review.reviewer?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <h4 className="text-sm font-medium">{review.reviewer?.username || "Anonymous"}</h4>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="flex mr-2">
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-xs text-white/60">{formatDate(review.created_at)}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-white/90 mt-2">{review.content || "No comment provided."}</p>
                  
                  {currentUserId === review.reviewer_id && (
                    <div className="mt-2 text-xs text-right">
                      <span className="bg-primary/20 text-primary px-2 py-1 rounded">
                        Your review
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 