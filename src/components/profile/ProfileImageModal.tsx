import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProfileImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  alt: string;
}

export function ProfileImageModal({ isOpen, onClose, imageUrl, alt }: ProfileImageModalProps) {
  const defaultImage = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-fit h-fit max-w-[90vw] max-h-[90vh] p-0">
        <ScrollArea className="w-full h-full max-h-[80vh] overflow-auto">
          <div className="flex items-center justify-center p-8">
            <img
              src={imageUrl || defaultImage}
              alt={alt}
              className="max-w-full h-auto"
              style={{ objectFit: 'contain' }}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 