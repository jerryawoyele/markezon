import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Briefcase, User } from "lucide-react";

interface RoleSetupModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function RoleSetupModal({ isOpen, onComplete }: RoleSetupModalProps) {
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState<"business" | "customer">("customer");
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const { toast } = useToast();

  const validateUsername = (value: string) => {
    if (!value.trim()) {
      setUsernameError("Username is required");
      return false;
    }
    
    if (value.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError("Username can only contain letters, numbers, and underscores");
      return false;
    }
    
    setUsernameError("");
    return true;
  };

  const handleSubmit = async () => {
    if (!validateUsername(username)) return;
    
    setLoading(true);
    try {
      // Check if username is available
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .limit(1);
        
      if (checkError) throw checkError;
      
      if (existingUsers && existingUsers.length > 0) {
        setUsernameError("This username is already taken");
        return;
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Update user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          username,
          user_role: userRole,
          onboarding_completed: true
        })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      toast({
        title: "Profile updated",
        description: "Your profile has been set up successfully!",
      });
      
      onComplete();
    } catch (error) {
      console.error("Error setting up profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to set up your profile. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Welcome to Markezon!</DialogTitle>
          <DialogDescription>
            Let's set up your profile before you get started.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Choose a username</Label>
            <Input
              id="username"
              placeholder="e.g., john_doe"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                validateUsername(e.target.value);
              }}
            />
            {usernameError && (
              <p className="text-red-500 text-sm">{usernameError}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>I am a...</Label>
            <RadioGroup value={userRole} onValueChange={(value) => setUserRole(value as "business" | "customer")} className="grid grid-cols-2 gap-4 pt-2">
              <div className={`border rounded-lg p-4 cursor-pointer ${userRole === "customer" ? "border-primary" : "border-white/10"}`}
                onClick={() => setUserRole("customer")}>
                <RadioGroupItem value="customer" id="customer" className="sr-only" />
                <Label htmlFor="customer" className="flex flex-col items-center gap-2 cursor-pointer">
                  <User className="h-8 w-8" />
                  <span className="font-medium">Customer</span>
                  <span className="text-sm text-white/60 text-center">I want to discover services</span>
                </Label>
              </div>
              
              <div className={`border rounded-lg p-4 cursor-pointer ${userRole === "business" ? "border-primary" : "border-white/10"}`}
                onClick={() => setUserRole("business")}>
                <RadioGroupItem value="business" id="business" className="sr-only" />
                <Label htmlFor="business" className="flex flex-col items-center gap-2 cursor-pointer">
                  <Briefcase className="h-8 w-8" />
                  <span className="font-medium">Business Owner</span>
                  <span className="text-sm text-white/60 text-center">I offer services</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        <Button 
          onClick={handleSubmit} 
          disabled={loading || !username.trim() || !!usernameError}
          className="w-full"
        >
          {loading ? "Setting up..." : "Continue"}
        </Button>
      </DialogContent>
    </Dialog>
  );
} 