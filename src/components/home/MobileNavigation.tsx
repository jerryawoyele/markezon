import { useNavigate } from "react-router-dom";
import { 
  Home, 
  Search, 
  PlusSquare, 
  Heart, 
  User,
  Bell,
  Briefcase,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CUSTOMER_NAV_ITEMS, BUSINESS_NAV_ITEMS } from "./Sidebar";

interface MobileNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: "business" | "customer" | null;
}

export function MobileNavigation({ activeTab, setActiveTab, userRole = "customer" }: MobileNavigationProps) {
  const navigate = useNavigate();

  const handleNavigation = (label: string, path: string) => {
    setActiveTab(label);
    navigate(path);
  };

  // Get navigation items based on user role
  const navItems = userRole === "business" ? BUSINESS_NAV_ITEMS : CUSTOMER_NAV_ITEMS;

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-black border-t border-white/10 px-2 py-3 lg:hidden z-50">
      <ul className="flex justify-around">
        {navItems.map((item) => (
          <li key={item.label}>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "flex flex-col items-center p-2",
                activeTab === item.label 
                  ? "text-primary" 
                  : "hover:text-primary"
              )}
              onClick={() => handleNavigation(item.label, item.path)}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs sr-only">{item.label}</span>
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
} 