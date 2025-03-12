import { supabase } from "@/integrations/supabase/client";

/**
 * Creates or updates a user profile based on their auth data
 * Call this function after a user signs up or signs in
 */
export async function syncUserProfile() {
  try {
    // Get the current authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    // Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    // Extract metadata from auth
    const userName = user.user_metadata?.full_name || 
                    user.user_metadata?.name || 
                    user.email?.split('@')[0] || 
                    'User';
                    
    const avatarUrl = user.user_metadata?.avatar_url || null;
    
    if (!existingProfile) {
      // Create new profile if it doesn't exist
      await supabase.from('profiles').insert({
        id: user.id,
        username: userName,
        avatar_url: avatarUrl,
        email: user.email,
        updated_at: new Date().toISOString()
      });
    } else if (!existingProfile.username || !existingProfile.avatar_url) {
      // Update profile with auth data if fields are empty
      const updates: any = {};
      
      if (!existingProfile.username) {
        updates.username = userName;
      }
      
      if (!existingProfile.avatar_url && avatarUrl) {
        updates.avatar_url = avatarUrl;
      }
      
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        
        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);
      }
    }
    
    return user;
  } catch (error) {
    console.error("Error syncing user profile:", error);
    return null;
  }
} 