import { Card, CardContent } from "@/components/ui/card";

interface ServiceCardProps {
  title: string;
  description: string;
  category: string;
  image: string;
  business: string;
}

export function ServiceCard({ title, description, category, image, business }: ServiceCardProps) {
  return (
    <Card className="bg-black/20 border-white/5">
      <img
        src={image}
        alt={title}
        className="w-full h-48 object-cover rounded-t-md"
      />
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-white/60 mb-4">{description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/60">{category}</span>
          <span className="text-xs text-white/60">Offered by: {business}</span>
        </div>
      </CardContent>
    </Card>
  );
}
