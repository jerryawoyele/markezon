import {
  Home as HomeIcon,
  Compass,
  Send,
  Heart,
  User,
  Briefcase as BriefcaseIcon,
  ShoppingCart
} from "lucide-react";

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