import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '@/integrations/supabase/client';

// Initialize Stripe with your secret key
// In production, use environment variables to store sensitive information
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key', {
  apiVersion: '2023-10-16',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract parameters
    const {
      booking_id,
      service_id,
      customer_id,
      provider_id,
      amount,
      success_url,
      cancel_url
    } = req.method === 'POST' ? req.body : req.query;

    // Validate required parameters
    if (!booking_id || !service_id || !customer_id || !provider_id || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get booking and service details
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    const { data: service } = await supabase
      .from('services')
      .select('title')
      .eq('id', service_id)
      .single();

    if (!booking || !service) {
      return res.status(400).json({ error: 'Booking or service not found' });
    }

    // Calculate amounts (should match the calculations in the PaymentPage)
    const amountInCents = Math.round(parseFloat(amount as string) * 100);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: service.title,
              description: `Booking ID: ${booking_id}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url || `${process.env.NEXT_PUBLIC_SITE_URL}/payment/${booking_id}?payment_status=success`,
      cancel_url: cancel_url || `${process.env.NEXT_PUBLIC_SITE_URL}/payment/${booking_id}?payment_status=canceled`,
      metadata: {
        booking_id,
        service_id,
        customer_id,
        provider_id,
      },
    });

    // If this is a GET request, redirect to the checkout URL
    if (req.method === 'GET') {
      return res.redirect(session.url || '/');
    }

    // Otherwise, return the session data for client-side redirection
    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
} 