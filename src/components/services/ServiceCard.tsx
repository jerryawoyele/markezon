import { useState } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServiceType } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';

interface ServiceCardProps {
  service: ServiceType;
  onClick: (service: ServiceType) => void;
}

export function ServiceCard({ service, onClick }: ServiceCardProps) {
  const navigate = useNavigate();
  
  const handleCategoryClick = (e: React.MouseEvent, category: string) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/discover?search=${encodeURIComponent(category)}&tab=services`);
  };
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all flex flex-col h-full">
      <div 
        className="h-40 bg-gray-200 overflow-hidden cursor-pointer" 
        onClick={() => onClick(service)}
      >
        <img 
          src={typeof service.image === 'string' ? service.image : '/placeholder.svg'} 
          alt={service.title} 
          className="w-full h-full object-cover"
        />
      </div>
      <CardContent className="p-4 flex-grow cursor-pointer" onClick={() => onClick(service)}>
        {service.category && (
          <Badge 
            className="mb-2 cursor-pointer hover:bg-primary/10"
            onClick={(e) => handleCategoryClick(e, service.category)}
          >
            {service.category}
          </Badge>
        )}
        <h3 className="text-lg font-bold mb-1">{service.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2">{service.description}</p>
        {service.price && (
          <div className="mt-3 font-medium">
            ${typeof service.price === 'number' ? service.price.toFixed(2) : service.price}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full" 
          onClick={(e) => {
            e.stopPropagation();
            onClick(service);
          }}
        >
          Book Service
        </Button>
      </CardFooter>
    </Card>
  );
}
