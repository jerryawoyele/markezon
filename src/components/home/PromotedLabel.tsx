import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';

interface PromotedLabelProps {
  level: 'basic' | 'premium' | 'featured';
  className?: string;
}

export function PromotedLabel({ level, className = '' }: PromotedLabelProps) {
  const getLevelStyles = (): string => {
    switch (level) {
      case 'basic':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'premium':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'featured':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getLevelLabel = (): string => {
    switch (level) {
      case 'basic':
        return 'Promoted';
      case 'premium':
        return 'Premium';
      case 'featured':
        return 'Featured';
      default:
        return 'Promoted';
    }
  };

  const getTooltipText = (): string => {
    switch (level) {
      case 'basic':
        return 'This content has been promoted by the creator';
      case 'premium':
        return 'This is premium content promoted by a verified business';
      case 'featured':
        return 'This is featured content from a top business in your area';
      default:
        return 'This content has been promoted';
    }
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <Badge variant="outline" className={`text-xs py-0 px-2 ${getLevelStyles()}`}>
        {getLevelLabel()}
      </Badge>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <InfoIcon className="h-3 w-3 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs max-w-[200px]">{getTooltipText()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
} 