import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Regions where Stripe is available
const STRIPE_SUPPORTED_REGIONS = [
  'US', 'CA', 'UK', 'AU', 'NZ', 'SG', 'HK', 'JP', 
  'BE', 'DK', 'FI', 'FR', 'DE', 'IE', 'IT', 'LU', 
  'NL', 'NO', 'PT', 'ES', 'SE', 'CH', 'AT', 'EE', 
  'GR', 'LV', 'LT', 'PL', 'SK', 'SI'
];

// Regions where Paystack is available
const PAYSTACK_SUPPORTED_REGIONS = [
  'NG', 'GH', 'ZA', 'KE'
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'Missing userId parameter' });
    }

    // Get user's country code from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('country_code, preferred_payment_provider')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return res.status(500).json({ message: 'Failed to fetch user location' });
    }

    // If user has a preferred payment provider, use that
    if (profile?.preferred_payment_provider) {
      return res.status(200).json({ provider: profile.preferred_payment_provider });
    }

    // If user has a country code, determine provider based on location
    if (profile?.country_code) {
      const countryCode = profile.country_code.toUpperCase();
      
      // Determine payment provider based on country code
      let provider = 'none'; // Default if no providers are available
      
      if (STRIPE_SUPPORTED_REGIONS.includes(countryCode)) {
        provider = 'stripe';
      } else if (PAYSTACK_SUPPORTED_REGIONS.includes(countryCode)) {
        provider = 'paystack';
      }
      
      // Update user's preferred provider in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          preferred_payment_provider: provider,
          provider_updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error updating preferred provider:', updateError);
        // Continue anyway, as we can still return the provider
      }
      
      return res.status(200).json({ provider });
    }
    
    // If no country code is set, return default provider (stripe)
    return res.status(200).json({ provider: 'stripe' });
    
  } catch (error) {
    console.error('Error in payment provider API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 