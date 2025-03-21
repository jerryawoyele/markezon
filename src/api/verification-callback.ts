import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * API route that handles verification callbacks from payment providers
 * 
 * This endpoint receives verification result data from Stripe or Paystack
 * and updates the user's verification status in the database.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST requests for callbacks
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    const { provider, data, signature } = req.body;
    
    // Validate the request
    if (!provider || !data) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }
    
    // Process based on provider
    if (provider === 'stripe') {
      await handleStripeCallback(data, signature);
    } else if (provider === 'paystack') {
      await handlePaystackCallback(data, signature);
    } else {
      return res.status(400).json({ message: 'Invalid provider' });
    }
    
    return res.status(200).json({ message: 'Verification processed successfully' });
  } catch (error) {
    console.error('Error processing verification callback:', error);
    return res.status(500).json({ 
      message: 'Error processing verification callback',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Process Stripe verification callback
 */
async function handleStripeCallback(data: any, signature: string) {
  // In production, verify the signature using the webhook secret
  // const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  // const event = stripe.webhooks.constructEvent(data, signature, stripeWebhookSecret);
  
  const event = data; // For simplicity, assume data is already the event object
  
  // Process verification session events
  if (event.type === 'identity.verification_session.verified') {
    const session = event.data.object;
    
    // Find the user with this session ID
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('kyc_session_id', session.id)
      .single();
      
    if (error || !profile) {
      console.error('Error finding user for session:', error);
      throw new Error('User not found for verification session');
    }
    
    // Update user's verification status
    await supabase
      .from('profiles')
      .update({
        kyc_status: 'verified',
        kyc_verified: true,
        kyc_verified_at: new Date().toISOString(),
        kyc_session_id: null // Clear session ID after completion
      })
      .eq('id', profile.id);
  } 
  else if (event.type === 'identity.verification_session.requires_input') {
    // Handle "requires_input" status (verification needs more info)
    const session = event.data.object;
    
    // Find the user with this session ID
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('kyc_session_id', session.id)
      .single();
      
    if (error || !profile) {
      console.error('Error finding user for session:', error);
      throw new Error('User not found for verification session');
    }
    
    // Update status to pending
    await supabase
      .from('profiles')
      .update({
        kyc_status: 'pending'
      })
      .eq('id', profile.id);
  }
}

/**
 * Process Paystack verification callback
 */
async function handlePaystackCallback(data: any, signature: string) {
  // In production, verify the signature using the webhook secret
  // const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  // Verify signature logic here
  
  // Extract verification data
  const { event, data: callbackData } = data;
  
  // Process verification events
  if (event === 'customeridentification.success') {
    const { customer, identification } = callbackData;
    
    // Find the user by email or reference
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', customer.email)
      .single();
      
    if (error || !profile) {
      console.error('Error finding user for Paystack verification:', error);
      throw new Error('User not found for verification');
    }
    
    // Update user's verification status
    await supabase
      .from('profiles')
      .update({
        kyc_status: 'verified',
        kyc_verified: true,
        kyc_verified_at: new Date().toISOString(),
        kyc_session_id: null // Clear session ID after completion
      })
      .eq('id', profile.id);
  }
  else if (event === 'customeridentification.failed') {
    const { customer, identification } = callbackData;
    
    // Find the user by email or reference
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', customer.email)
      .single();
      
    if (error || !profile) {
      console.error('Error finding user for Paystack verification:', error);
      throw new Error('User not found for verification');
    }
    
    // Update status to rejected
    await supabase
      .from('profiles')
      .update({
        kyc_status: 'rejected',
        kyc_rejection_reason: identification.reason || 'Verification failed',
        kyc_session_id: null // Clear session ID after completion
      })
      .eq('id', profile.id);
  }
} 