
import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServiceType } from "@/types";

interface ServiceCardProps {
  service: ServiceType;
  onClick: (service: ServiceType) => void;
}

export function ServiceCard({ service, onClick }: ServiceCardProps) {
  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer" 
      onClick={() => onClick(service)}
    >
      <div className="h-40 bg-gray-200 overflow-hidden">
        <img 
          src={service.image} 
          alt={service.title} 
          className="w-full h-full object-cover"
        />
      </div>
      <CardContent className="p-4">
        <Badge className="mb-2">{service.category}</Badge>
        <h3 className="text-lg font-bold mb-1">{service.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2">{service.description}</p>
        {service.price && (
          <div className="mt-3 font-medium">
            {service.price}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
