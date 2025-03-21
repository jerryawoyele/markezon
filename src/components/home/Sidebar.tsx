import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home as HomeIcon,
  Compass,
  Send,
  Heart,
  User,
  LogOut,
  LogIn,
  Bell as BellIcon,
  Briefcase as BriefcaseIcon,
  ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { AuthRequiredModal } from "@/components/auth/AuthRequiredModal";

// Define navigation items for different user roles
export const CUSTOMER_NAV_ITEMS = [
  { icon: HomeIcon, label: "Home", path: "/home" },
  { icon: Compass, label: "Discover", path: "/discover" },
  { icon: Send, label: "Messages", path: "/messages" },
  { icon: ShoppingCart, label: "Bookings", path: "/bookings" },
  { icon: User, label: "Profile", path: "/profile" },
];

export const BUSINESS_NAV_ITEMS = [
  { icon: HomeIcon, label: "Home", path: "/home" },
  { icon: Compass, label: "Discover", path: "/discover" },
  { icon: Send, label: "Messages", path: "/messages" },
  { icon: BriefcaseIcon, label: "Services", path: "/services" },
  { icon: User, label: "Profile", path: "/profile" },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: "business" | "customer" | null;
  isAuthenticated?: boolean;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

// Add this component to define NavItem
const NavItem = ({ icon, label, isActive, onClick }: NavItemProps) => {
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start gap-3 py-6 px-4 text-base",
        isActive
          ? "bg-primary text-white hover:bg-primary"
          : "hover:bg-primary hover:text-white"
      )}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
};

export function Sidebar({
  activeTab,
  setActiveTab,
  userRole = "customer",
  isAuthenticated = true,
}: SidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (label: string, path: string) => {
    // If not authenticated and trying to access restricted pages
    const publicPages = ['/discover', '/auth'];
    const isUserProfile = path.startsWith('/user/');
    
    if (!isAuthenticated && !publicPages.includes(path) && !isUserProfile) {
      setShowAuthModal(true);
      return;
    }
    
    setActiveTab(label);
    navigate(path);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowLogoutConfirm(false);
    navigate("/auth");
  };
  
  const handleLoginClick = () => {
    navigate("/auth");
  };

  // Get navigation items based on user role
  const getNavItems = () => {
    return userRole === "business" ? BUSINESS_NAV_ITEMS : CUSTOMER_NAV_ITEMS;
  };
  
  const navItems = getNavItems();

  // Mobile Bottom Navigation
  const mobileNav = (
    <nav className="fixed bottom-0 left-0 w-full bg-background border-t border-white/10 px-2 py-3 lg:hidden z-50">
      <ul className="flex justify-around">
        {navItems.map((item) => (
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
    <div className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-black border-r border-white/5 z-30">
      <div className="p-4 border-b border-white/10 mb-2">
        <h1 
          className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent cursor-pointer"
          onClick={() => navigate('/home')}
        >
          Markezon
        </h1>
      </div>

      <div className="flex-1 px-3 py-2">
        <div className="space-y-2">
          {navItems.map((item) => (
            <NavItem
              key={item.label}
              icon={<item.icon />}
              label={item.label}
              isActive={activeTab === item.label}
              onClick={() => handleNavigation(item.label, item.path)}
            />
          ))}
        </div>
      </div>
      
      <div className="p-2 w-full border-t border-white/10 mt-2">
        {isAuthenticated ? (
          <Button
            variant="ghost"
            className="justify-start gap-3 w-full py-6 px-4 hover:bg-primary hover:text-white"
            onClick={handleLogoutClick}
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="justify-start gap-3 w-full py-6 px-4 hover:bg-primary hover:text-white"
            onClick={handleLoginClick}
          >
            <LogIn className="w-5 h-5" />
            <span>Login</span>
          </Button>
        )}
      </div>
    </div>
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
              Are you sure you want to log out? You will need to sign in again
              to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLogoutConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auth Required Modal */}
      <AuthRequiredModal 
        isOpen={showAuthModal} 
        setIsOpen={setShowAuthModal} 
        message="You need to sign in to access this feature."
      />
    </>
  );
}
