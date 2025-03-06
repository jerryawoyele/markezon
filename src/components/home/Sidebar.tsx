
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home as HomeIcon, 
  Compass, 
  Send, 
  Heart, 
  User,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const SIDEBAR_ITEMS = [
  { icon: HomeIcon, label: "Home", path: "/home" },
  { icon: Compass, label: "Discover", path: "/discover" },
  { icon: Send, label: "Messages", path: "/messages" },
  { icon: Heart, label: "Notifications", path: "/notifications" },
  { icon: User, label: "Profile", path: "/profile" },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (label: string, path: string) => {
    setActiveTab(label);
    navigate(path);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowLogoutConfirm(false);
    navigate('/auth');
  };

  // Mobile Bottom Navigation
  const mobileNav = (
    <nav className="fixed bottom-0 left-0 w-full bg-background border-t border-white/10 px-2 py-3 lg:hidden z-50">
      <ul className="flex justify-around">
        {SIDEBAR_ITEMS.map((item) => (
          <li key={item.label}>
            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center p-2",
                activeTab === item.label && "bg-primary text-white"
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

  // Desktop Sidebar
  const desktopNav = (
    <aside className="hidden lg:flex w-64 fixed left-0 top-0 h-screen border-r border-white/10 bg-background p-4">
      <div className="flex flex-col h-full w-full">
        <h1 className="text-2xl font-bold px-4 mb-8">Markezon</h1>
        
        <nav className="flex-1">
          <ul className="space-y-2 mt-4">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = activeTab === item.label || location.pathname === item.path;
              return (
                <li key={item.label}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 py-6 px-4",
                      isActive ? "bg-primary text-white hover:bg-primary" : "hover:bg-primary hover:text-white"
                    )}
                    onClick={() => handleNavigation(item.label, item.path)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>

        <Button
          variant="ghost"
          className="justify-start gap-3 py-6 px-4 hover:bg-primary hover:text-white"
          onClick={handleLogoutClick}
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
      
      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out? You will need to sign in again to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
