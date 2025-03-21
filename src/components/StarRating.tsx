import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: number;
}

export function StarRating({ 
  value, 
  onChange, 
  readOnly = false,
  size = 6
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  
  const handleMouseEnter = (index: number) => {
    if (readOnly) return;
    setHoverValue(index);
  };
  
  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverValue(null);
  };
  
  const handleClick = (index: number) => {
    if (readOnly) return;
    onChange?.(index);
  };
  
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((index) => {
        const filled = (hoverValue !== null ? index <= hoverValue : index <= value);
        
        return (
          <Star
            key={index}
            className={`h-${size} w-${size} cursor-${readOnly ? 'default' : 'pointer'} transition-colors ${
              filled 
                ? 'text-amber-500 fill-amber-500' 
                : 'text-gray-300'
            }`}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(index)}
          />
        );
      })}
    </div>
  );
} 