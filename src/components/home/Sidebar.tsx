
import { useNavigate } from "react-router-dom";
import { 
  Home as HomeIcon, 
  Compass, 
  Send, 
  Heart, 
  User,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const SIDEBAR_ITEMS = [
  { icon: HomeIcon, label: "Home" },
  { icon: Compass, label: "Explore" },
  { icon: Send, label: "Messages" },
  { icon: Heart, label: "Notifications" },
  { icon: User, label: "Profile" },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className="w-20 md:w-72 fixed left-0 top-0 h-screen border-r border-white/10 bg-background p-4 md:p-6">
      <div className="flex flex-col h-full">
        <h1 className="text-2xl font-bold mb-10 px-4 hidden md:block">Markezon</h1>
        
        <nav className="flex-1">
          <ul className="space-y-4">
            {SIDEBAR_ITEMS.map((item) => (
              <li key={item.label}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-center md:justify-start gap-4 text-lg py-6",
                    activeTab === item.label && "bg-white/10"
                  )}
                  onClick={() => setActiveTab(item.label)}
                >
                  <item.icon className="w-7 h-7" />
                  <span className="hidden md:inline">{item.label}</span>
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        <Button
          variant="ghost"
          className="justify-center md:justify-start gap-4 text-lg py-6"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate('/auth');
          }}
        >
          <LogOut className="w-7 h-7" />
          <span className="hidden md:inline">Logout</span>
        </Button>
      </div>
    </aside>
  );
}
