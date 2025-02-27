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

  // Mobile Bottom Navigation
  const mobileNav = (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-white/10 px-2 py-3 xl:hidden z-50">
      <ul className="flex justify-around">
        {SIDEBAR_ITEMS.map((item) => (
          <li key={item.label}>
            <Button
              variant="ghost"
              className={cn(
                "flex items-center px-2 py-4",
                activeTab === item.label && "bg-white/10"
              )}
              onClick={() => setActiveTab(item.label)}
            >
              <item.icon className="w-5 h-5" />
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );

  // Desktop Sidebar
  const desktopNav = (
    <aside className="hidden xl:flex w-72 fixed left-0 top-0 h-screen border-r border-white/10 bg-background p-4">
      <div className="flex flex-col h-full w-full">
        <h1 className="text-2xl font-bold mb-8 px-4">Markezon</h1>
        
        <nav className="flex-1">
          <ul className="space-y-2">
            {SIDEBAR_ITEMS.map((item) => (
              <li key={item.label}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 py-4 px-4",
                    activeTab === item.label && "bg-white/10"
                  )}
                  onClick={() => setActiveTab(item.label)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        <Button
          variant="ghost"
          className="justify-start gap-3 py-4 px-4"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate('/auth');
          }}
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  );

  return (
    <>
      {desktopNav}
      {mobileNav}
    </>
  );
}
