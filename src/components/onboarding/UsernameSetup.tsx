import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";

export function UsernameSetup() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Validate username on change
  useEffect(() => {
    if (!username.trim()) {
      setError(null);
      setIsAvailable(null);
      return;
    }

    // Username validation regex (letters, numbers, underscores, no spaces)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      setError("Username can only contain letters, numbers, and underscores (no spaces)");
      setIsAvailable(false);
      return;
    }

    // Check availability after typing stops
    const checkAvailability = async () => {
      setIsChecking(true);
      setError(null);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Check if username is already taken
        const { data: existingUsers, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', username.trim())
          .single();
          
        if (checkError && checkError.code === 'PGRST116') {
          // PGRST116 means no rows returned, so username is available
          setIsAvailable(true);
        } else if (existingUsers) {
          // If username exists but it's the current user's, it's still available
          if (user && existingUsers.id === user.id) {
            setIsAvailable(true);
          } else {
            setIsAvailable(false);
            setError("Username already taken");
          }
        }
      } catch (error) {
        console.error("Error checking username:", error);
      } finally {
        setIsChecking(false);
      }
    };

    const debounceTimeout = setTimeout(checkAvailability, 500);
    return () => clearTimeout(debounceTimeout);
  }, [username]);

  const handleSetUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!isAvailable) {
      toast({
        title: "Invalid username",
        description: error || "Please choose a different username.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }
      
      // Update profile with new username
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          username: username.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      toast({
        title: "Username set!",
        description: "Your profile has been updated.",
      });
      
      // Redirect to home or profile
      navigate('/home');
      
    } catch (error) {
      console.error("Error setting username:", error);
      toast({
        title: "Error",
        description: "Failed to set username. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/80 to-secondary/80">
      <div className="w-full max-w-md p-8 space-y-8 bg-black/20 rounded-lg backdrop-blur-sm border border-white/10">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Choose Your Username</h1>
          <p className="text-white/60 mt-2">
            This will be your public identifier on the platform
          </p>
        </div>
        
        <form onSubmit={handleSetUsername} className="space-y-6">
          <div className="space-y-2">
            <div className="relative">
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`bg-white/5 border-white/10 pr-10 ${
                  isAvailable === true ? "border-green-500/50" : 
                  isAvailable === false ? "border-red-500/50" : ""
                }`}
              />
              {isChecking && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              )}
              {!isChecking && isAvailable === true && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500 h-4 w-4" />
              )}
              {!isChecking && isAvailable === false && (
                <XCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 h-4 w-4" />
              )}
            </div>
            {error ? (
              <p className="text-xs text-red-400">{error}</p>
            ) : (
              <p className="text-xs text-white/60">
                Username can only contain letters, numbers, and underscores (no spaces)
              </p>
            )}
            <p className="text-xs text-white/60">
              Your profile URL will be: markezon.com/@{username || "username"}
            </p>
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !username.trim() || isAvailable !== true}
          >
            {isLoading ? "Setting up..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default UsernameSetup; 