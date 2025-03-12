import { Sidebar } from "@/components/home/Sidebar";
import { MobileHeader } from "@/components/home/MobileHeader";

interface LoadingScreenProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: "business" | "customer" | null;
  isAuthenticated?: boolean;
}

export function LoadingScreen({ activeTab, setActiveTab, userRole, isAuthenticated = true }: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} isAuthenticated={isAuthenticated} />
      <div className="flex-1 lg:ml-64">
        <MobileHeader />
        <div className="container mx-auto py-8 px-4 flex justify-center items-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary border-r-2 mx-auto mb-4"></div>
            <p className="text-white/70">Loading...</p>
          </div>
        </div>
      </div>
    </div>
  );
} 