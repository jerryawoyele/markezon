import { Card, CardContent } from "@/components/ui/card";
import { ServiceType } from "@/types";
import { getUserAvatar } from "@/integrations/supabase/client";

interface ServiceCardProps {
  service: ServiceType;
  onClick?: () => void;
}

export function ServiceCard({ service, onClick }: ServiceCardProps) {
  // Add a guard clause to prevent rendering if service is undefined
  if (!service) {
    return null;
  }
  
  return (
    <Card 
      className="bg-black/20 border-white/5 cursor-pointer transition-all hover:bg-black/30"
      onClick={onClick}
    >
      <img
        src={service.image && typeof service.image === 'string' ? (service.image.startsWith("/") ? service.image : `/${service.image}`) : '/placeholder.svg'}
        alt={service.title}
        className="w-full h-48 object-cover rounded-t-lg"
        onError={(e) => {
          e.currentTarget.src = "/placeholder.svg";
        }}
      />
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
        <p className="text-sm text-white/60 mb-4">{service.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/60">{service.category}</span>
          <span className="text-xs text-white/60">Offered by: {service.business || "Anonymous"}</span>
        </div>
      </CardContent>
    </Card>
  );
}
