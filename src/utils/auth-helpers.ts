import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

// Function to safely get the current user with retry logic
export async function getCurrentUser(maxRetries = 3, retryDelay = 1000) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        throw error;
      }
      
      return data.user;
    } catch (error: any) {
      retries++;
      
      // If we've hit max retries, throw the error
      if (retries >= maxRetries) {
        console.error('Authentication error after max retries:', error);
        toast({
          title: 'Authentication Error',
          description: 'Please refresh the page and try again.',
          variant: 'destructive',
        });
        return null;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  return null;
}

// Function to safely get the current session with retry logic
export async function getCurrentSession(maxRetries = 3, retryDelay = 1000) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      return data.session;
    } catch (error: any) {
      retries++;
      
      // If we've hit max retries, throw the error
      if (retries >= maxRetries) {
        console.error('Session error after max retries:', error);
        toast({
          title: 'Connection Error',
          description: 'Please refresh the page and try again.',
          variant: 'destructive',
        });
        return null;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  return null;
} 