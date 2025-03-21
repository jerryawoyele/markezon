import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface UserDetails {
  id: string;
  username?: string;
  avatar_url?: string;
  user_role?: 'business' | 'customer';
  email?: string;
}

interface UseUserReturn {
  user: User | null;
  profile: UserDetails | null;
  isLoading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      setProfile(data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch user profile'));
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        throw error;
      }
      
      setUser(data.user);
      
      if (data.user) {
        await fetchUserProfile(data.user.id);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
      setError(err instanceof Error ? err : new Error('Failed to refresh user'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeUser = async () => {
      setIsLoading(true);
      
      try {
        // Get current session
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
          throw error;
        }
        
        setUser(data.user);
        
        if (data.user) {
          await fetchUserProfile(data.user.id);
        }
      } catch (err) {
        console.error('Error initializing user:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize user'));
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err instanceof Error ? err : new Error('Failed to sign out'));
    }
  };

  return { 
    user, 
    profile, 
    isLoading, 
    error, 
    signOut,
    refreshUser 
  };
} 