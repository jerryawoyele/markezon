import { Database as OriginalDatabase } from '@supabase/supabase-js';

// This file extends the Supabase Database type to include our custom tables
export interface Database extends OriginalDatabase {
  public: {
    Tables: {
      // Keep original tables (comes from the generated types)
      profiles: OriginalDatabase['public']['Tables']['profiles'];
      comments: OriginalDatabase['public']['Tables']['comments'];
      posts: OriginalDatabase['public']['Tables']['posts'];
      likes: OriginalDatabase['public']['Tables']['likes'];
      messages: OriginalDatabase['public']['Tables']['messages'];
      notifications: OriginalDatabase['public']['Tables']['notifications'];
      services: OriginalDatabase['public']['Tables']['services'];
      users: OriginalDatabase['public']['Tables']['users'];
      
      // Add our custom payment_methods table
      payment_methods: {
        Row: {
          id: string;
          user_id: string;
          payment_method_id: string;
          card_last4: string;
          card_brand: string;
          card_exp_month: number;
          card_exp_year: number;
          is_default: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          payment_method_id: string;
          card_last4: string;
          card_brand: string;
          card_exp_month: number;
          card_exp_year: number;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          payment_method_id?: string;
          card_last4?: string;
          card_brand?: string;
          card_exp_month?: number;
          card_exp_year?: number;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
      };
    };
    Views: OriginalDatabase['public']['Views'];
    Functions: OriginalDatabase['public']['Functions'];
    Enums: OriginalDatabase['public']['Enums'];
    CompositeTypes: OriginalDatabase['public']['CompositeTypes'];
  };
} 