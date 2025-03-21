import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // For GET requests, we'll detect location based on IP
    // For POST requests, we'll update the user's location

    const userId = req.query.userId || req.body?.userId;

    if (!userId) {
      return res.status(400).json({ message: 'Missing userId parameter' });
    }

    // If it's a POST request with a country code, update the user's location
    if (req.method === 'POST') {
      const { countryCode } = req.body;
      
      if (!countryCode || typeof countryCode !== 'string' || countryCode.length !== 2) {
        return res.status(400).json({ message: 'Invalid country code' });
      }

      // Update the user's country code in the profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          country_code: countryCode.toUpperCase(),
          location_updated_at: new Date().toISOString() 
        })
        .eq('id', userId);

      if (updateError) {
        return res.status(500).json({ 
          message: 'Failed to update location',
          error: updateError.message
        });
      }

      return res.status(200).json({ 
        country_code: countryCode.toUpperCase(),
        message: 'Location updated successfully' 
      });
    }

    // If it's a GET request, first check if we already have location info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('country_code, location_updated_at')
      .eq('id', userId)
      .single();

    // If we have recent location data (less than 7 days old), use that
    if (profile?.country_code && profile?.location_updated_at) {
      const lastUpdated = new Date(profile.location_updated_at);
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 3600 * 24);
      
      if (daysSinceUpdate < 7) {
        return res.status(200).json({ 
          country_code: profile.country_code,
          source: 'database'
        });
      }
    }

    // Otherwise, try to detect location from IP
    try {
      // Use a public IP geolocation API (you might want to use a more reliable service in production)
      const ipResponse = await axios.get('https://ipapi.co/json/');
      
      if (ipResponse.data && ipResponse.data.country_code) {
        const countryCode = ipResponse.data.country_code;
        
        // Update the user's location in the database
        await supabase
          .from('profiles')
          .update({ 
            country_code: countryCode,
            location_updated_at: new Date().toISOString() 
          })
          .eq('id', userId);
        
        return res.status(200).json({
          country_code: countryCode,
          source: 'ip_detection'
        });
      }
    } catch (ipError) {
      console.error('IP geolocation error:', ipError);
      // Continue to fallback
    }

    // Fallback: If we can't detect location and don't have it stored
    return res.status(200).json({
      country_code: 'US', // Default to US as fallback
      source: 'default'
    });
    
  } catch (error) {
    console.error('Error in location detection API:', error);
    return res.status(500).json({ 
      message: 'Error detecting location',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}