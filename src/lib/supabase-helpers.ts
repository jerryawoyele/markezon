
import { supabase } from "@/integrations/supabase/client";
import { ServiceType } from "@/types";

// Custom function to fetch services since the type definitions don't include it yet
export const fetchServices = async (userId?: string) => {
  try {
    let query = supabase.from('services').select('*');
    
    // If userId is provided, filter by user_id
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return data as ServiceType[];
  } catch (error) {
    console.error('Error fetching services:', error);
    return [];
  }
};
