import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Search, Home, User } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const [errorType, setErrorType] = useState<'profile' | 'general'>('general');
  const [username, setUsername] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Profile");

  useEffect(() => {
    // Log the error
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    
    // Check if this is a profile URL
    if (location.pathname.startsWith("/@")) {
      setErrorType('profile');
      // Extract username from URL
      const pathUsername = location.pathname.substring(2); // Remove "/@"
      setUsername(pathUsername);
    }
  }, [location.pathname]);

  return (
    <MainLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="bg-red-500/10 text-red-500 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl font-bold">404</span>
          </div>
          
          {errorType === 'profile' ? (
            <>
              <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
              <p className="text-white/70 mb-6">
                We couldn't find a user with the username <span className="font-mono bg-white/10 px-2 py-1 rounded">{username}</span>
              </p>
              <div className="space-y-4">
                <p className="text-white/60 text-sm">
                  This user may have changed their username or the account might not exist.
                  Usernames are case-sensitive, so make sure you typed it correctly.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/discover">
                    <Button variant="outline" className="w-full sm:w-auto" size="sm">
                      <Search className="mr-2 h-4 w-4" />
                      Find Users
                    </Button>
                  </Link>
                  <Link to="/">
                    <Button className="w-full sm:w-auto" size="sm">
                      <Home className="mr-2 h-4 w-4" />
                      Return Home
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
              <p className="text-white/70 mb-6">
                The page you're looking for doesn't exist or has been moved.
              </p>
              <Link to="/">
                <Button>
                  <Home className="mr-2 h-4 w-4" />
                  Return to Home
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default NotFound;
