
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const TRENDING_SERVICES = [
  { title: "Web Development", views: "12.5k", category: "Technology", hashtag: "#webdev" },
  { title: "Digital Marketing", views: "10.2k", category: "Marketing", hashtag: "#digitalmarketing" },
  { title: "Graphic Design", views: "8.7k", category: "Design", hashtag: "#graphicdesign" },
  { title: "Content Writing", views: "7.9k", category: "Content", hashtag: "#contentwriting" },
  { title: "SEO Services", views: "7.2k", category: "Marketing", hashtag: "#seo" },
  { title: "UI/UX Design", views: "6.8k", category: "Design", hashtag: "#uidesign" },
  { title: "Mobile Development", views: "6.5k", category: "Technology", hashtag: "#mobiledev" },
  { title: "Social Media", views: "6.1k", category: "Marketing", hashtag: "#socialmedia" },
  { title: "Video Editing", views: "5.9k", category: "Media", hashtag: "#videoediting" },
  { title: "Data Analytics", views: "5.7k", category: "Technology", hashtag: "#dataanalytics" },
];

export function TrendingServices() {
  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
        <Input
          placeholder="Search services..."
          className="pl-10"
        />
      </div>

      {/* Trending Services Card */}
      <Card className="p-6 bg-black/20 border-white/5">
        <h2 className="text-lg font-semibold mb-4">Trending Services</h2>
        <div className="space-y-4">
          {TRENDING_SERVICES.map((service) => (
            <div 
              key={service.title}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div>
                <h3 className="font-medium">{service.title}</h3>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white/60">{service.category}</p>
                  <p className="text-sm text-white/60">{service.hashtag}</p>
                </div>
              </div>
              <span className="text-sm text-white/60">{service.views} views</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Copyright Info */}
      <div className="text-center text-sm text-white/60 p-4">
        <p>&copy; {new Date().getFullYear()} Markezon</p>
        <p className="mt-1">All rights reserved.</p>
      </div>
    </div>
  );
}
