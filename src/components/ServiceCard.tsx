
import { Card } from "@/components/ui/card";

interface ServiceCardProps {
  title: string;
  description: string;
  category: string;
  image: string;
  business: string;
}

export function ServiceCard({ title, description, category, image, business }: ServiceCardProps) {
  return (
    <Card className="group overflow-hidden bg-black/20 border-white/5 hover:border-white/10 transition-all duration-300">
      <div className="aspect-video overflow-hidden">
        <img
          src={image}
          alt={title}
          className="object-cover w-full h-full transform transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-white/5 text-white/80">
            {category}
          </span>
          <span className="text-sm text-white/60">{business}</span>
        </div>
        <h3 className="text-lg font-semibold mb-2 text-white/90">{title}</h3>
        <p className="text-sm text-white/60 line-clamp-2">{description}</p>
      </div>
    </Card>
  );
}
