
import { useState, useEffect } from 'react';
import { AlertCircle, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function OfflineAlert() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Set up event listeners for online/offline status
    const handleOnline = () => {
      setIsOffline(false);
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };
    
    // Check initial network status
    setIsOffline(!navigator.onLine);
    
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Clean up
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      <Alert variant="destructive" className="border-red-500/50 bg-red-950/90 backdrop-blur-sm">
        <WifiOff className="h-4 w-4 mr-2" />
        <AlertTitle>You're offline</AlertTitle>
        <AlertDescription>
          Your internet connection was lost. Some features may be unavailable until connection is restored.
        </AlertDescription>
      </Alert>
    </div>
  );
}
