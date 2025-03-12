import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export function UsernameSetup() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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
    
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }
      
      // Check if username is already taken
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim())
        .neq('id', user.id);
        
      if (checkError) throw checkError;
      
      if (existingUsers && existingUsers.length > 0) {
        toast({
          title: "Username already taken",
          description: "Please choose a different username.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
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
            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-white/5 border-white/10"
            />
            <p className="text-xs text-white/60">
              Username can only contain letters, numbers, and underscores
            </p>
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !username.trim()}
          >
            {isLoading ? "Setting up..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default UsernameSetup; 