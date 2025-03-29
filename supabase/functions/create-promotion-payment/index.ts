import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Stripe } from 'https://esm.sh/stripe@12.1.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  promotionLevel: 'basic' | 'premium' | 'featured';
  startDate: string;
  endDate: string;
  postId: string;
  userId: string;
  budget?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get request body
    const requestData = await req.json() as RequestBody;
    const { promotionLevel, startDate, endDate, postId, userId, budget } = requestData;

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user's profile to include in metadata
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('username, email')
      .eq('id', userId)
      .single();

    if (profileError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Calculate price based on promotion level
    const getBasePrice = (level: string): number => {
      switch (level) {
        case 'basic': return 500; // $5.00
        case 'premium': return 1500; // $15.00
        case 'featured': return 3000; // $30.00
        default: return 500;
      }
    };

    const amount = budget ? budget * 100 : getBasePrice(promotionLevel);
    const durationInDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${promotionLevel.charAt(0).toUpperCase() + promotionLevel.slice(1)} Post Promotion`,
              description: `Boost your post visibility for ${durationInDays} days`,
              images: ['https://yourwebsite.com/images/promotion-banner.jpg'],
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        postId,
        userId,
        promotionLevel,
        startDate,
        endDate,
        username: userProfile.username || 'user',
      },
      mode: 'payment',
      success_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'}/promotion/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'}/promotion/cancel`,
      customer_email: userProfile.email,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}); 