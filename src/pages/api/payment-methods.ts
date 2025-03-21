import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16', // Use the latest version
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // For now, we'll support only GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ message: 'Missing or invalid userId parameter' });
  }

  try {
    // First, get the user's preferred payment provider
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('preferred_payment_provider, country_code')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      // We'll continue and use the database directly
    }

    const paymentProvider = profile?.preferred_payment_provider || 'stripe';

    // Fetch payment methods based on the provider
    if (paymentProvider === 'stripe') {
      // Get the customer ID for this user (would need to be stored in your database)
      const { data: customerData, error: customerError } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', userId)
        .single();

      if (customerError || !customerData?.customer_id) {
        // If no customer ID, return payment methods from the database
        const { data, error } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        return res.status(200).json(data || []);
      }

      // If we have a customer ID, get payment methods from Stripe
      const stripePaymentMethods = await stripe.paymentMethods.list({
        customer: customerData.customer_id,
        type: 'card',
      });

      // Format the payment methods for our app
      const formattedPaymentMethods = stripePaymentMethods.data.map(method => ({
        id: method.id,
        user_id: userId,
        payment_method_id: method.id,
        card_brand: method.card?.brand || 'unknown',
        card_last4: method.card?.last4 || '0000',
        card_exp_month: method.card?.exp_month || 1,
        card_exp_year: method.card?.exp_year || 2030,
        is_default: method.metadata?.is_default === 'true',
        provider: 'stripe',
        created_at: new Date(method.created * 1000).toISOString(),
      }));

      return res.status(200).json(formattedPaymentMethods);
    } 
    else if (paymentProvider === 'paystack') {
      // For Paystack, we'll use the database for now
      // In a real implementation, you'd call Paystack's API
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'paystack')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return res.status(200).json(data || []);
    }
    else {
      // For other providers or if no provider is specified
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return res.status(200).json(data || []);
    }
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch payment methods',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 