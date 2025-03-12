import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

interface AuthRequiredModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  message?: string;
}

export function AuthRequiredModal({ isOpen, setIsOpen, message = "You need to sign in to access this feature." }: AuthRequiredModalProps) {
  const navigate = useNavigate();

  const handleSignIn = () => {
    setIsOpen(false);
    navigate('/auth');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sign in Required</DialogTitle>
          <DialogDescription>
            {message}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center py-4">
          <LogIn className="h-12 w-12 text-primary opacity-80" />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSignIn}>
            Sign In / Sign Up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 