import { supabase } from '../../integrations/supabase/client';

export const handlePaymentMethods = async (req, res) => {
  if (req.method === 'POST') {
    try {
      const data = req.body;
      
      // Validate required fields
      const requiredFields = ['user_id', 'payment_method_id', 'card_last4', 'card_brand', 'card_exp_month', 'card_exp_year'];
      for (const field of requiredFields) {
        if (!data[field]) {
          return res.status(400).json({ message: `Missing required field: ${field}` });
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
        return res.status(404).json({ 
          message: 'The payment_methods table does not exist. Please run the database migration.',
          details: checkError.message
        });
      }
      
      // Insert the payment method
      const { error } = await supabase
        .from('payment_methods')
        .insert(data);
      
      if (error) {
        console.error('Error inserting payment method:', error);
        return res.status(500).json({ message: error.message });
      }
      
      return res.status(200).json({ message: 'Payment method added successfully' });
    } catch (error) {
      console.error('Error processing payment method:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    try {
      const userId = req.query.userId;
      
      if (!userId) {
        return res.status(400).json({ message: 'Missing required query parameter: userId' });
      }
      
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching payment methods:', error);
        return res.status(500).json({ message: error.message });
      }
      
      return res.status(200).json(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id, userId } = req.body;
      
      if (!id || !userId) {
        return res.status(400).json({ message: 'Missing required fields: id and userId' });
      }
      
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error deleting payment method:', error);
        return res.status(500).json({ message: error.message });
      }
      
      return res.status(200).json({ message: 'Payment method deleted successfully' });
    } catch (error) {
      console.error('Error deleting payment method:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, userId, is_default } = req.body;
      
      if (!id || !userId || is_default === undefined) {
        return res.status(400).json({ message: 'Missing required fields: id, userId, and is_default' });
      }
      
      // If setting a default, clear other defaults first
      if (is_default) {
        const { error: resetError } = await supabase
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', userId);
        
        if (resetError) {
          console.error('Error resetting default payment methods:', resetError);
          return res.status(500).json({ message: resetError.message });
        }
      }
      
      // Update the specified payment method
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default })
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error updating payment method:', error);
        return res.status(500).json({ message: error.message });
      }
      
      return res.status(200).json({ message: 'Payment method updated successfully' });
    } catch (error) {
      console.error('Error updating payment method:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}; 