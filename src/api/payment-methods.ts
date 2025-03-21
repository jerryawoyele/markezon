import { supabase } from '@/integrations/supabase/client';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Validate required fields
    const requiredFields = ['user_id', 'payment_method_id', 'card_last4', 'card_brand', 'card_exp_month', 'card_exp_year'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return new Response(
          JSON.stringify({ message: `Missing required field: ${field}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Add created_at timestamp
    data.created_at = new Date().toISOString();
    
    // Check if the table exists first
    const { error: checkError } = await supabase
      .from('payment_methods')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.message.includes('relation "payment_methods" does not exist')) {
      return new Response(
        JSON.stringify({ 
          message: 'The payment_methods table does not exist. Please run the database migration.',
          details: checkError.message
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Insert the payment method
    const { error } = await supabase
      .from('payment_methods')
      .insert(data);
    
    if (error) {
      console.error('Error inserting payment method:', error);
      return new Response(
        JSON.stringify({ message: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ message: 'Payment method added successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing payment method:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 