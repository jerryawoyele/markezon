
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { SearchDropdown } from "./SearchDropdown";

interface MobileHeaderProps {
  onSearch?: (query: string) => void;
}

export function MobileHeader({ onSearch }: MobileHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(searchQuery);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearch) onSearch(value);
    setShowResults(!!value);
  };

  return (
    <div className="fixed top-0 left-0 right-0 flex items-center justify-between gap-4 p-4 border-b border-white/10 bg-background/95 backdrop-blur-sm xl:hidden z-50 h-16">
      <h1 className="text-xl font-bold">Markezon</h1>
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
        <Input
          placeholder="Search services..."
          className="pl-9 bg-white/5 border-white/10"
          value={searchQuery}
          onChange={handleChange}
          onKeyPress={handleSearch}
          onFocus={() => setShowResults(!!searchQuery)}
        />
        <SearchDropdown 
          searchQuery={searchQuery} 
          show={showResults} 
          onClose={() => setShowResults(false)} 
        />
      </div>
    </div>
  );
}
