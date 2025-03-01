
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
import { useState } from "react";
import { SearchDropdown } from "./SearchDropdown";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowResults(!!value);
  };

  return (
    <div className="space-y-6">
      {/* Use the same search bar style as the top */}
      <div className="relative">
        <div className="glass rounded-lg p-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search for services..."
              className="w-full bg-white/5 border-0 rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-white/40 focus:ring-0 focus:outline-none"
              value={searchQuery}
              onChange={handleChange}
              onFocus={() => setShowResults(!!searchQuery)}
            />
          </div>
        </div>
        <SearchDropdown 
          searchQuery={searchQuery} 
          show={showResults} 
          onClose={() => setShowResults(false)} 
        />
      </div>

      <Card className="p-6 bg-black/20 border-white/5">
        <h2 className="text-lg font-semibold mb-4">Trending Services</h2>
        <div className="space-y-4">
          {TRENDING_SERVICES.map((service, index) => (
            <div 
              key={service.title}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex gap-3">
                <span className="text-white/60">{index + 1}.</span>
                <div>
                  <h3 className="font-medium">{service.title}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white/60">{service.category}</p>
                    <p className="text-sm text-white/60">{service.hashtag}</p>
                  </div>
                </div>
              </div>
              <span className="text-sm text-white/60">{service.views} views</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="text-center text-sm text-white/60 p-4 mt-0">
        <p>&copy; {new Date().getFullYear()} Markezon</p>
        <p className="mt-1">All rights reserved.</p>
      </div>
    </div>
  );
}
