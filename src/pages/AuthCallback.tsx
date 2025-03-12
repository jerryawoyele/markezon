import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { syncUserProfile } from '@/utils/auth';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const setupNewUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        
        // Check if the user has a profile
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, user_role, onboarding_completed')
          .eq('id', user.id)
          .single();
        
        // If the user doesn't have a profile or the user_role is not set,
        // redirect to onboarding
        if (!existingProfile || !existingProfile.user_role) {
          navigate("/profile");
        } else {
          navigate("/home");
        }
      } catch (error) {
        console.error("Error in auth callback:", error);
        navigate("/auth");
      }
    };
    
    setupNewUser();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold">Authenticating...</h2>
        <p className="text-muted-foreground">Please wait while we complete your sign-in</p>
      </div>
    </div>
  );
} 