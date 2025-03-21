import { supabase } from "@/integrations/supabase/client";

/**
 * Status options for escrow payments
 */
export enum EscrowStatus {
  PENDING = "pending",        // Initial payment has been made but held in escrow
  RELEASED = "released",      // Payment released to service provider
  REFUNDED = "refunded",      // Payment refunded to customer
  DISPUTED = "disputed",      // Payment is under dispute
  COMPLETED = "completed",    // Service completed and payment finalized
  CANCELED = "canceled"       // Booking canceled before service
}

/**
 * Interface for escrow payment details
 */
export interface EscrowPayment {
  id: string;
  booking_id: string;
  amount: number;
  status: EscrowStatus;
  customer_id: string;
  provider_id: string;
  service_id: string;
  created_at: string;
  updated_at: string;
  transaction_id?: string;
  release_date?: string;
}

/**
 * Service class for handling escrow payments
 */
export class EscrowService {
  /**
   * Create a new escrow payment for a booking
   */
  static async createPayment(
    bookingId: string, 
    amount: number, 
    customerId: string, 
    providerId: string, 
    serviceId: string
  ): Promise<EscrowPayment | null> {
    try {
      // In a real implementation, this would integrate with a payment processor
      // For now, we'll simulate by creating a record in the database
      
      const { data, error } = await supabase
        .from('escrow_payments')
        .insert({
          booking_id: bookingId,
          amount,
          status: EscrowStatus.PENDING,
          customer_id: customerId,
          provider_id: providerId,
          service_id: serviceId,
          transaction_id: `txn_${Math.random().toString(36).substring(2, 12)}`,
          release_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error creating escrow payment:", error);
        return null;
      }
      
      // Also update the booking status to reflect payment
      await supabase
        .from('bookings')
        .update({ payment_status: 'paid', status: 'confirmed' })
        .eq('id', bookingId);
      
      return data;
    } catch (error) {
      console.error("Error in createPayment:", error);
      return null;
    }
  }
  
  /**
   * Release payment to service provider after service completion
   */
  static async releasePayment(paymentId: string, bookingId: string): Promise<boolean> {
    try {
      // In a real implementation, this would integrate with a payment processor API
      // to instruct it to release the held funds
      
      const { error } = await supabase
        .from('escrow_payments')
        .update({
          status: EscrowStatus.RELEASED,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);
      
      if (error) {
        console.error("Error releasing escrow payment:", error);
        return false;
      }
      
      // Update booking status
      await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);
      
      return true;
    } catch (error) {
      console.error("Error in releasePayment:", error);
      return false;
    }
  }
  
  /**
   * Refund payment to customer (e.g., if service provider cancels)
   */
  static async refundPayment(paymentId: string, bookingId: string): Promise<boolean> {
    try {
      // In a real implementation, this would integrate with a payment processor
      
      const { error } = await supabase
        .from('escrow_payments')
        .update({
          status: EscrowStatus.REFUNDED,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);
      
      if (error) {
        console.error("Error refunding escrow payment:", error);
        return false;
      }
      
      // Update booking status
      await supabase
        .from('bookings')
        .update({ status: 'canceled', payment_status: 'refunded' })
        .eq('id', bookingId);
      
      return true;
    } catch (error) {
      console.error("Error in refundPayment:", error);
      return false;
    }
  }
  
  /**
   * Create a dispute for a payment
   */
  static async createDispute(
    paymentId: string, 
    bookingId: string, 
    reason: string, 
    evidenceUrl?: string
  ): Promise<boolean> {
    try {
      // First mark the payment as disputed
      const { error: paymentError } = await supabase
        .from('escrow_payments')
        .update({
          status: EscrowStatus.DISPUTED,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);
      
      if (paymentError) {
        console.error("Error marking payment as disputed:", paymentError);
        return false;
      }
      
      // Create dispute record
      const { error: disputeError } = await supabase
        .from('payment_disputes')
        .insert({
          payment_id: paymentId,
          booking_id: bookingId,
          reason,
          evidence_url: evidenceUrl,
          status: 'open'
        });
      
      if (disputeError) {
        console.error("Error creating payment dispute:", disputeError);
        return false;
      }
      
      // Update booking status
      await supabase
        .from('bookings')
        .update({ status: 'disputed' })
        .eq('id', bookingId);
      
      return true;
    } catch (error) {
      console.error("Error in createDispute:", error);
      return false;
    }
  }
  
  /**
   * Get escrow payment details
   */
  static async getPaymentDetails(paymentId: string): Promise<EscrowPayment | null> {
    try {
      const { data, error } = await supabase
        .from('escrow_payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      
      if (error) {
        console.error("Error fetching escrow payment:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Error in getPaymentDetails:", error);
      return null;
    }
  }
  
  /**
   * Get all escrow payments for a booking
   */
  static async getPaymentsByBooking(bookingId: string): Promise<EscrowPayment[] | null> {
    try {
      const { data, error } = await supabase
        .from('escrow_payments')
        .select('*')
        .eq('booking_id', bookingId);
      
      if (error) {
        console.error("Error fetching escrow payments:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Error in getPaymentsByBooking:", error);
      return null;
    }
  }
}

/**
 * SQL to create escrow_payments table:
 * 
 * CREATE TABLE IF NOT EXISTS escrow_payments (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
 *   amount DECIMAL(10, 2) NOT NULL,
 *   status VARCHAR(20) NOT NULL,
 *   customer_id UUID REFERENCES auth.users(id),
 *   provider_id UUID REFERENCES auth.users(id),
 *   service_id UUID REFERENCES services(id),
 *   transaction_id VARCHAR(100),
 *   release_date TIMESTAMP WITH TIME ZONE,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE IF NOT EXISTS payment_disputes (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   payment_id UUID REFERENCES escrow_payments(id) ON DELETE CASCADE,
 *   booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
 *   reason TEXT NOT NULL,
 *   evidence_url TEXT,
 *   status VARCHAR(20) NOT NULL,
 *   resolution TEXT,
 *   resolved_by UUID REFERENCES auth.users(id),
 *   resolved_at TIMESTAMP WITH TIME ZONE,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 */ 