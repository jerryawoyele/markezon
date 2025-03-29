import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Return a simple dummy response since we've removed the payments tab
  return res.status(200).json({
    success: true,
    country_code: 'US', // Default to US as fallback
    method: 'default',
    timestamp: new Date().toISOString(),
  });

  /* Original implementation:
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId } = req.query;
  
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Missing or invalid userId parameter'
    });
  }

  try {
    // First check if we already have location data for this user
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('country_code, last_location_check')
      .eq('id', userId)
      .single();
    
    // If we have a recent country code (less than 24 hours old), use it
    if (profileData?.country_code && profileData?.last_location_check) {
      const lastCheck = new Date(profileData.last_location_check);
      const now = new Date();
      const hoursSinceLastCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastCheck < 24) {
        return res.status(200).json({
          success: true,
          country_code: profileData.country_code,
          method: 'cached',
          timestamp: lastCheck
        });
      }
    }
    
    // Try to get client IP address
    const forwarded = req.headers['x-forwarded-for'] as string;
    const ip = forwarded 
      ? forwarded.split(',')[0] 
      : req.socket.remoteAddress || '';
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        message: 'Could not detect client IP address'
      });
    }
    
    // Use IP-based geolocation
    let countryCode = null;
    
    try {
      // Try ipapi.co first
      const ipapiResponse = await fetch(`https://ipapi.co/${ip}/json/`);
      if (ipapiResponse.ok) {
        const ipapiData = await ipapiResponse.json();
        if (ipapiData.country_code) {
          countryCode = ipapiData.country_code;
        }
      }
    } catch (ipapiError) {
      console.error('Error with ipapi.co:', ipapiError);
      // Continue to next provider if this one fails
    }
    
    // If ipapi.co failed, try ipinfo.io
    if (!countryCode) {
      try {
        const ipinfoToken = process.env.IPINFO_TOKEN;
        const ipinfoUrl = ipinfoToken
          ? `https://ipinfo.io/${ip}?token=${ipinfoToken}`
          : `https://ipinfo.io/${ip}/json`;
          
        const ipinfoResponse = await fetch(ipinfoUrl);
        if (ipinfoResponse.ok) {
          const ipinfoData = await ipinfoResponse.json();
          if (ipinfoData.country) {
            countryCode = ipinfoData.country;
          }
        }
      } catch (ipinfoError) {
        console.error('Error with ipinfo.io:', ipinfoError);
      }
    }
    
    // If we still don't have a country code, use a default fallback
    if (!countryCode) {
      return res.status(200).json({
        success: true,
        country_code: 'US', // Default to US as fallback
        method: 'default',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Update the user's profile with the detected country code
    await supabase
      .from('profiles')
      .update({
        country_code: countryCode,
        last_location_check: new Date().toISOString()
      })
      .eq('id', userId);
    
    return res.status(200).json({
      success: true,
      country_code: countryCode,
      method: 'ip_geolocation',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error detecting location:', error);
    return res.status(500).json({
      success: false,
      message: 'Error detecting location',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  */
}