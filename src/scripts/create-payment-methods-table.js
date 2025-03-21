// Script to create payment_methods table in Supabase
// const { createClient } = require('@supabase/supabase-js');
import { createClient } from '@supabase/supabase-js';
// const fs = require('fs');
import fs from 'fs'
// const path = require('path');
import path from 'path'

// Load environment variables 
// require('dotenv').config();
import 'dotenv.config'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables: VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY/VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createPaymentMethodsTable() {
  try {
    console.log('Creating payment_methods table...');
    
    // SQL for creating payment_methods table
    const sql = `
      -- Create payment_methods table
      CREATE TABLE IF NOT EXISTS payment_methods (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        payment_method_id TEXT NOT NULL,
        card_last4 TEXT NOT NULL,
        card_brand TEXT NOT NULL,
        card_exp_month INTEGER NOT NULL,
        card_exp_year INTEGER NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ
      );

      -- Add RLS policies
      ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

      -- Policy for users to only see their own payment methods
      CREATE POLICY IF NOT EXISTS "Users can view their own payment methods"
        ON payment_methods
        FOR SELECT
        USING (auth.uid() = user_id);

      -- Policy for users to insert their own payment methods
      CREATE POLICY IF NOT EXISTS "Users can insert their own payment methods"
        ON payment_methods
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);

      -- Policy for users to update their own payment methods
      CREATE POLICY IF NOT EXISTS "Users can update their own payment methods"
        ON payment_methods
        FOR UPDATE
        USING (auth.uid() = user_id);

      -- Policy for users to delete their own payment methods
      CREATE POLICY IF NOT EXISTS "Users can delete their own payment methods"
        ON payment_methods
        FOR DELETE
        USING (auth.uid() = user_id);

      -- Create index for faster lookups
      CREATE INDEX IF NOT EXISTS payment_methods_user_id_idx ON payment_methods (user_id);
    `;

    // Execute the SQL
    const { error } = await supabase.rpc('pgql', { query: sql });
    
    if (error) {
      throw error;
    }
    
    console.log('Payment methods table created successfully!');
  } catch (error) {
    console.error('Error creating payment_methods table:', error);
    process.exit(1);
  }
}

createPaymentMethodsTable(); 