
import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServiceType } from "@/types";

interface ServiceModalProps {
  service: ServiceType | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ServiceModal({ service, isOpen, onClose }: ServiceModalProps) {
  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{service.title}</DialogTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge>{service.category}</Badge>
              {service.business && (
                <span className="text-sm text-gray-500">By {service.business}</span>
              )}
            </div>
          </DialogHeader>

          <div className="my-4 h-64 overflow-hidden rounded-md">
            <img 
              src={service.image} 
              alt={service.title} 
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Description</h3>
              <p className="text-gray-700">{service.description}</p>
            </div>

            {service.features && service.features.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-2">Features</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {service.features.map((feature, index) => (
                    <li key={index} className="text-gray-700">{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {service.price && (
              <div>
                <h3 className="text-xl font-semibold mb-2">Pricing</h3>
                <p className="text-lg font-medium">{service.price}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-6">
          <Button onClick={onClose}>Close</Button>
          <Button variant="default">Contact Provider</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
