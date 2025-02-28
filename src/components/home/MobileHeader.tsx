
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface MobileHeaderProps {
  onSearch?: (query: string) => void;
}

export function MobileHeader({ onSearch }: MobileHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 flex items-center justify-between gap-4 p-4 border-b border-white/10 bg-background/95 backdrop-blur-sm xl:hidden z-50 h-16">
      <h1 className="text-xl font-bold">Markezon</h1>
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
        <Input
          placeholder="Search services..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleSearch}
        />
      </div>
    </div>
  );
}
