import { supabase } from '@/integrations/supabase/client';

// Create necessary storage buckets if they don't exist
export async function ensureStorageBuckets() {
  try {
    // Check if the services bucket exists
    const { data: publicBucket, error: publicBucketError } = await supabase.storage.getBucket('services');
    
    if (publicBucketError && publicBucketError.message.includes('not found')) {
      console.log('services bucket not found, attempting to create it');
      try {
        // Create services bucket
        const { data, error } = await supabase.storage.createBucket('services', {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
        });
        
        if (error) {
          console.error('Error creating services bucket:', error);
        } else {
          console.log('Successfully created services bucket');
        }
      } catch (createError) {
        console.error('Error creating services bucket:', createError);
      }
    }
  } catch (e) {
    console.warn('Could not check or create storage buckets:', e);
  }
}

// Initialize buckets
ensureStorageBuckets();

// Function to upload a file to various buckets with fallback
export async function uploadFileWithFallback(
  file: File, 
  path: string, 
  options?: {
    buckets?: string[];
    uiCallback?: (status: 'uploading' | 'success' | 'error', message?: string) => void;
  }
) {
  // Try to ensure the services bucket exists
  try {
    await ensureStorageBuckets();
  } catch (e) {
    console.warn('Failed to check storage buckets:', e);
  }
  
  const bucketOrder = ['services']; // Default to just using services bucket
  const { uiCallback } = options || {};
  
  // Notify upload starting
  uiCallback?.('uploading', 'Starting file upload...');
  
  // Determine correct content type for the file
  let contentType = file.type;
  
  // Fix for BMP files which might not have correct content type
  if (file.name.toLowerCase().endsWith('.bmp') && (!contentType || contentType === 'application/octet-stream')) {
    contentType = 'image/bmp';
  }
  
  // Prepare the file and path
  let fileToUpload = file;
  let finalPath = path;
  
  // Convert BMP to PNG if needed
  if (file.name.toLowerCase().endsWith('.bmp')) {
    try {
      // Create a temporary canvas to convert BMP to PNG
      const img = document.createElement('img');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Load the image
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
      
      // Set canvas dimensions and draw image
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      // Convert to PNG
      const pngBlob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/png');
      });
      
      if (pngBlob) {
        // Create a new file with PNG extension
        const newFileName = path.replace(/\.bmp$/i, '.png');
        fileToUpload = new File([pngBlob], newFileName.split('/').pop() || 'image.png', { type: 'image/png' });
        finalPath = newFileName;
        console.log('Converted BMP to PNG for upload');
      }
    } catch (conversionError) {
      console.warn('Failed to convert BMP to PNG, will try uploading original file', conversionError);
    }
  }

  console.log('Attempting upload with parameters:');
  console.log('- File name:', fileToUpload.name);
  console.log('- File type:', fileToUpload.type);
  console.log('- File size:', Math.round(fileToUpload.size / 1024), 'KB');
  console.log('- Target path:', finalPath);
  
  // Try the main upload
  try {
    // Upload with explicit content type
    const { error, data } = await supabase.storage
      .from('services')
      .upload(finalPath, fileToUpload, {
        contentType: fileToUpload.type || contentType || 'application/octet-stream',
        upsert: true,
        cacheControl: '3600'
      });
      
    if (error) {
      console.warn(`Upload failed:`, error.message);
      throw error;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('services')
      .getPublicUrl(finalPath);
      
    console.log('Successfully uploaded file');
    console.log('Public URL:', urlData?.publicUrl);
    
    // Test the URL before returning
    try {
      const testFetch = await fetch(urlData?.publicUrl || '', { method: 'HEAD' });
      if (!testFetch.ok) {
        console.warn(`URL test failed with status ${testFetch.status}`);
        throw new Error(`URL test failed with status ${testFetch.status}`);
      }
    } catch (testError) {
      console.warn('URL test failed, but proceeding anyway:', testError);
    }
    
    uiCallback?.('success', `File uploaded successfully`);
    return { url: urlData?.publicUrl || '', source: 'supabase', bucket: 'services' };
  } catch (uploadError) {
    console.error('Upload failed:', uploadError);
    
    // Fall back to data URL
    try {
      console.log('Falling back to data URL');
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      uiCallback?.('error', 'Cloud storage unavailable. Using local file instead.');
      return { 
        url: dataUrl, 
        source: 'local',
        error: uploadError as Error 
      };
    } catch (error) {
      console.error('Error creating data URL:', error);
      
      // Final fallback to SVG placeholder
      const placeholder = getDefaultImageForEndpoint(path);
      return { 
        url: placeholder, 
        source: 'placeholder',
        error: error as Error
      };
    }
  }
}

// Function to generate a unique file path for uploads
export function generateFilePath(file: File, userId: string, type: 'profile' | 'service' | 'post') {
  const timestamp = new Date().getTime(); // Add timestamp for uniqueness
  const randomId = Math.random().toString(36).substring(2, 9);
  
  // Get file extension, defaulting to 'png' if none found
  let fileExt = file.name.split('.').pop()?.toLowerCase();
  if (!fileExt || fileExt === file.name) {
    // Default extension based on mime type
    if (file.type.startsWith('image/')) {
      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/bmp': 'png' // Convert BMP to PNG
      };
      fileExt = mimeToExt[file.type] || 'png';
    } else {
      fileExt = 'bin'; // Generic binary extension
    }
  }
  
  // Always use lowercase extension
  fileExt = fileExt.toLowerCase();
  
  // Convert BMP to PNG
  if (fileExt === 'bmp') {
    fileExt = 'png';
  }
  
  // Generate path based on type
  let path = '';
  switch (type) {
    case 'profile':
      path = `profile/${userId}_${timestamp}_${randomId}.${fileExt}`;
      break;
    case 'service':
      path = `services/${userId}_${timestamp}_${randomId}.${fileExt}`;
      break;
    case 'post':
      path = `posts/${userId}_${timestamp}_${randomId}.${fileExt}`;
      break;
  }
  
  return path;
}

// Get default image for different endpoints
function getDefaultImageForEndpoint(path: string): string | null {
  // Determine type based on path
  const isProfile = path.includes('profile');
  const isService = path.includes('service');
  const isPost = path.includes('post');
  
  // For services, return null to allow the UI to show the default "No image" element
  if (isService) {
    return null;
  }
  
  // Colors for different types
  const bgColor = isProfile ? '#6366F1' : '#10B981'; // Only for profile and post
  const textColor = '#FFFFFF';
  
  // Text for different types
  const text = isProfile ? 'Profile' : 'Post';
  
  // Generate SVG
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="${bgColor}" />
      <text x="200" y="200" font-family="Arial" font-size="32" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${text}</text>
    </svg>
  `;
  
  // Convert to data URL
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
