import { supabase } from '@/integrations/supabase/client';

// Create necessary storage buckets if they don't exist
export async function ensureStorageBuckets() {
  // List of buckets to ensure
  const bucketsToCreate = ['profiles', 'services', 'posts'];
  
  for (const bucketName of bucketsToCreate) {
    try {
      // First check if bucket exists
      const { data, error } = await supabase.storage.getBucket(bucketName);
      
      if (error) {
        if (error.message.includes('not found') || error.status === 400 || error.status === 404) {
          console.log(`${bucketName} bucket not found, attempting to create it`);
          
          try {
            // Create the bucket
            const { data: createData, error: createError } = await supabase.storage.createBucket(bucketName, {
              public: true,
              fileSizeLimit: 10 * 1024 * 1024, // 10MB limit
            });
            
            if (createError) {
              console.error(`Error creating ${bucketName} bucket:`, createError);
              
              // Try another approach if creation fails
              try {
                // Sometimes we need to try with different options
                const { error: retryError } = await supabase.storage.createBucket(bucketName, {
                  public: true,
                });
                
                if (retryError) {
                  console.error(`Error in retry attempt for ${bucketName} bucket:`, retryError);
                } else {
                  console.log(`Successfully created ${bucketName} bucket on retry`);
                }
              } catch (retryError) {
                console.error(`Exception in retry for ${bucketName} bucket:`, retryError);
              }
            } else {
              console.log(`Successfully created ${bucketName} bucket`);
            }
          } catch (createEx) {
            console.error(`Exception creating ${bucketName} bucket:`, createEx);
          }
        } else {
          console.error(`Error checking ${bucketName} bucket:`, error);
        }
      } else {
        console.log(`${bucketName} bucket already exists`);
      }
    } catch (e) {
      console.warn(`Exception checking/creating ${bucketName} bucket:`, e);
    }
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
): Promise<{ url: string, source: string, error?: Error }> {
  // Try to ensure the buckets exist
  try {
    await ensureStorageBuckets();
  } catch (e) {
    console.warn('Failed to ensure storage buckets:', e);
  }
  
  // Parse the path to determine appropriate bucket
  let bucketName = 'services'; // Default bucket
  
  if (path.includes('profile') || path.includes('avatar')) {
    bucketName = 'profiles';
  } else if (path.includes('post')) {
    bucketName = 'posts';
  }
  
  const { uiCallback } = options || {};
  
  // Notify upload starting
  uiCallback?.('uploading', 'Starting file upload...');
  
  // Determine correct content type for the file
  let contentType = file.type;
  
  // Fix for files which might have incorrect content type
  if (!contentType || contentType === 'application/octet-stream') {
    // Map file extensions to content types
    const extensionMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
    };
    
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (extensionMap[ext]) {
      contentType = extensionMap[ext];
    }
  }
  
  // Prepare the file and path
  let fileToUpload = file;
  let finalPath = path;
  
  // Convert BMP to PNG if needed (BMP files can cause issues)
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
  console.log('- Bucket:', bucketName);
  
  // Try main upload to Supabase
  try {
    // Upload with explicit content type
    const { error, data } = await supabase.storage
      .from(bucketName)
      .upload(finalPath, fileToUpload, {
        contentType: contentType || 'application/octet-stream',
        upsert: true,
        cacheControl: '3600'
      });
      
    if (error) {
      console.warn(`Upload failed:`, error.message);
      throw error;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(finalPath);
      
    console.log('Successfully uploaded file');
    console.log('Public URL:', urlData?.publicUrl);
    
    // Verify the URL works
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
    return { url: urlData?.publicUrl || '', source: 'supabase', bucket: bucketName };
  } catch (uploadError) {
    console.error('Primary upload failed:', uploadError);
    
    // Try alternate bucket as fallback
    let alternateBucketName = bucketName === 'profiles' ? 'services' : 'profiles';
    
    try {
      console.log(`Trying alternate bucket: ${alternateBucketName}`);
      
      // Upload to alternate bucket
      const { error, data } = await supabase.storage
        .from(alternateBucketName)
        .upload(finalPath, fileToUpload, {
          contentType: contentType || 'application/octet-stream',
          upsert: true,
          cacheControl: '3600'
        });
        
      if (error) {
        console.warn(`Alternate upload failed:`, error.message);
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(alternateBucketName)
        .getPublicUrl(finalPath);
        
      console.log('Successfully uploaded file to alternate bucket');
      console.log('Public URL:', urlData?.publicUrl);
      
      uiCallback?.('success', `File uploaded successfully to alternate storage`);
      return { url: urlData?.publicUrl || '', source: 'supabase-alternate', bucket: alternateBucketName };
    } catch (alternateError) {
      console.error('Alternate upload also failed:', alternateError);
      
      // Fall back to data URL if all else fails
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
      } catch (dataUrlError) {
        console.error('Error creating data URL:', dataUrlError);
        
        // Final fallback to generated SVG placeholder
        const placeholder = getDefaultImageForEndpoint(path);
        return { 
          url: placeholder || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y', 
          source: 'placeholder',
          error: dataUrlError as Error
        };
      }
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
      path = `profiles/${userId}/${timestamp}_${randomId}.${fileExt}`;
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
