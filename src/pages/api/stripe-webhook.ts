import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { supabase } from '@/integrations/supabase/client';
import { EscrowService } from '@/utils/escrow-service';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key', {
  apiVersion: '2023-10-16',
});

// Disable body parsing, we need the raw buffer for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(500).json({ error: 'Stripe webhook secret is not configured' });
  }

  try {
    // Get the raw body as a buffer
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;
    
    // Verify the webhook signature
    try {
      event = stripe.webhooks.constructEvent(buf.toString(), sig, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  // Extract metadata from the session
  const { booking_id, service_id, customer_id, provider_id } = session.metadata || {};

  if (!booking_id || !service_id || !customer_id || !provider_id) {
    console.error('Missing required metadata in session:', session.id);
    return;
  }

  try {
    // Get the booking and service information
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    const { data: service } = await supabase
      .from('services')
      .select('*')
      .eq('id', service_id)
      .single();

    if (!booking || !service) {
      console.error('Booking or service not found:', booking_id, service_id);
      return;
    }

    // Check if payment already exists
    const { data: existingPayment } = await supabase
      .from('escrow_payments')
      .select('*')
      .eq('booking_id', booking_id)
      .single();

    let paymentId;

    if (existingPayment) {
      paymentId = existingPayment.id;
      
      // Process the existing payment
      await EscrowService.processPayment(paymentId);
    } else {
      // Create a new escrow payment
      const payment = await EscrowService.createPayment(
        booking_id,
        service.price,
        customer_id,
        provider_id,
        service_id,
        session.id // Store Stripe session ID for reference
      );
      
      if (!payment) {
        throw new Error('Failed to create escrow payment');
      }
      
      paymentId = payment.id;
    }

    // Update booking status
    await supabase
      .from('bookings')
      .update({
        status: 'pending',
        payment_status: 'completed',
      })
      .eq('id', booking_id);

    // Create a notification for the service provider
    await supabase.from('notifications').insert({
      user_id: provider_id,
      type: 'booking',
      title: 'New Booking Payment',
      message: `A customer has paid for their booking for ${service.title}`,
      is_read: false,
      data: JSON.stringify({
        booking_id,
        service_id,
        service_title: service.title,
      }),
    });

    console.log('Payment processed successfully for booking:', booking_id);
  } catch (error) {
    console.error('Error processing checkout session completion:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // This function can be used to handle payment_intent.succeeded events
  // if you need additional processing beyond the checkout.session.completed event
  
  // Typically checkout.session.completed is sufficient, but some workflows
  // might benefit from handling payment_intent.succeeded as well
  
  // The implementation would be similar to handleCheckoutSessionCompleted
  // but would extract metadata from the PaymentIntent instead
  
  // For now, we'll just log the event
  console.log('Payment intent succeeded:', paymentIntent.id);
} 