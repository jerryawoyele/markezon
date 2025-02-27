
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function MobileHeader() {
  return (
    <div className="flex items-center justify-between gap-4 p-4 border-b border-white/10 bg-background/95 backdrop-blur-sm xl:hidden">
      <h1 className="text-xl font-bold">Markezon</h1>
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
        <Input
          placeholder="Search services..."
          className="pl-9"
        />
      </div>
    </div>
  );
}
