import { supabase } from "@/integrations/supabase/client";
import { generateFilePath, uploadFileWithFallback } from "./upload-helper";

/**
 * Downloads an image from a URL and stores it in Supabase storage
 * Used for storing OAuth profile images locally
 */
export async function storeExternalProfileImage(imageUrl: string, userId: string): Promise<string | null> {
  try {
    if (!imageUrl || !userId) return null;
    
    console.log('Downloading external profile image:', imageUrl);
    
    // Download the image
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    // Get the image as a blob
    const imageBlob = await response.blob();
    
    // Create a file from the blob
    const filename = `profile-${Date.now()}.jpg`;
    const file = new File([imageBlob], filename, { type: 'image/jpeg' });
    
    // Generate a path for the file
    const filePath = generateFilePath(file, userId, 'profile');
    
    // Upload the file to Supabase
    const { url, error } = await uploadFileWithFallback(file, filePath);
    
    if (error) {
      throw error;
    }
    
    console.log('Successfully stored profile image in Supabase:', url);
    return url;
  } catch (error) {
    console.error('Error storing external profile image:', error);
    return null;
  }
}

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
                    
    let avatarUrl = user.user_metadata?.avatar_url || null;
    
    // Check if the avatar URL is from an external provider (Google, GitHub, etc.)
    const isExternalUrl = avatarUrl && (
      avatarUrl.includes('googleusercontent.com') || 
      avatarUrl.includes('github') ||
      avatarUrl.includes('twitter') ||
      avatarUrl.includes('facebook')
    );
    
    // If external URL and we need to store it locally
    if (isExternalUrl && user.id) {
      const storedUrl = await storeExternalProfileImage(avatarUrl, user.id);
      if (storedUrl) {
        // Update the avatar URL to the stored one
        avatarUrl = storedUrl;
        
        // Update the user's metadata with the new avatar URL
        await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            avatar_url: storedUrl
          }
        });
      }
    }
    
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
    } else if (isExternalUrl && avatarUrl && avatarUrl !== existingProfile.avatar_url) {
      // If we have a new stored URL from an external provider, update the profile
      await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }
    
    return user;
  } catch (error) {
    console.error("Error syncing user profile:", error);
    return null;
  }
} 