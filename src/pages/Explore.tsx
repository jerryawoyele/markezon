
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Sidebar } from "@/components/home/Sidebar";
import { MobileHeader } from "@/components/home/MobileHeader";

interface Service {
  id: string;
  title: string;
  category: string;
  hashtag: string;
  image: string;
  views: string;
}

const SERVICES: Service[] = [
  {
    id: "1",
    title: "Web Development",
    category: "Technology",
    hashtag: "#webdev",
    image: "https://source.unsplash.com/random/800x600/?coding",
    views: "12.5k"
  },
  {
    id: "2",
    title: "Digital Marketing",
    category: "Marketing",
    hashtag: "#marketing",
    image: "https://source.unsplash.com/random/800x600/?marketing",
    views: "10.2k"
  },
  {
    id: "3",
    title: "Graphic Design",
    category: "Design",
    hashtag: "#design",
    image: "https://source.unsplash.com/random/800x600/?design",
    views: "8.7k"
  }
];

export default function Explore() {
  const [activeTab, setActiveTab] = useState("Explore");

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 xl:ml-72 pb-24 xl:pb-0">
        <MobileHeader />
        
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
              <Input
                placeholder="Search services..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service) => (
              <Card 
                key={service.id}
                className="overflow-hidden bg-black/20 border-white/5 hover:bg-black/30 transition-colors cursor-pointer"
              >
                <div className="aspect-video">
                  <img 
                    src={service.image} 
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium mb-2">{service.title}</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/60">{service.category}</span>
                      <span className="text-sm text-white/60">{service.hashtag}</span>
                    </div>
                    <span className="text-sm text-white/60">{service.views} views</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
