import { supabase } from "@/integrations/supabase/client";

/**
 * Interface for location data
 */
export interface LocationData {
  id: string;
  booking_id: string;
  service_id: string;
  provider_id: string;
  customer_id: string;
  provider_latitude?: number | null;
  provider_longitude?: number | null;
  customer_latitude?: number | null;
  customer_longitude?: number | null;
  provider_address?: string | null;
  customer_address?: string | null;
  status: 'active' | 'completed' | 'canceled';
  created_at: string;
  updated_at: string;
  estimated_arrival_time?: string | null;
}

/**
 * Service class for handling location tracking
 */
export class LocationService {
  /**
   * Initialize location tracking for a service booking
   */
  static async initializeTracking(
    bookingId: string,
    serviceId: string,
    providerId: string,
    customerId: string,
    customerAddress?: string,
    customerLatitude?: number,
    customerLongitude?: number
  ): Promise<LocationData | null> {
    try {
      const { data, error } = await supabase
        .from('location_tracking')
        .insert({
          booking_id: bookingId,
          service_id: serviceId,
          provider_id: providerId,
          customer_id: customerId,
          customer_address: customerAddress,
          customer_latitude: customerLatitude,
          customer_longitude: customerLongitude,
          status: 'active'
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error initializing location tracking:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Error in initializeTracking:", error);
      return null;
    }
  }
  
  /**
   * Update service provider's location
   */
  static async updateProviderLocation(
    trackingId: string,
    latitude: number,
    longitude: number,
    address?: string,
    estimatedArrivalTime?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('location_tracking')
        .update({
          provider_latitude: latitude,
          provider_longitude: longitude,
          provider_address: address,
          estimated_arrival_time: estimatedArrivalTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', trackingId);
      
      if (error) {
        console.error("Error updating provider location:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in updateProviderLocation:", error);
      return false;
    }
  }
  
  /**
   * Update customer's location
   */
  static async updateCustomerLocation(
    trackingId: string,
    latitude: number,
    longitude: number,
    address?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('location_tracking')
        .update({
          customer_latitude: latitude,
          customer_longitude: longitude,
          customer_address: address,
          updated_at: new Date().toISOString()
        })
        .eq('id', trackingId);
      
      if (error) {
        console.error("Error updating customer location:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in updateCustomerLocation:", error);
      return false;
    }
  }
  
  /**
   * Get current location data for a booking
   */
  static async getLocationData(bookingId: string): Promise<LocationData | null> {
    try {
      const { data, error } = await supabase
        .from('location_tracking')
        .select('*')
        .eq('booking_id', bookingId)
        .single();
      
      if (error) {
        console.error("Error fetching location data:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Error in getLocationData:", error);
      return null;
    }
  }
  
  /**
   * Complete location tracking when service is finished
   */
  static async completeTracking(trackingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('location_tracking')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', trackingId);
      
      if (error) {
        console.error("Error completing location tracking:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in completeTracking:", error);
      return false;
    }
  }
  
  /**
   * Cancel location tracking
   */
  static async cancelTracking(trackingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('location_tracking')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('id', trackingId);
      
      if (error) {
        console.error("Error canceling location tracking:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in cancelTracking:", error);
      return false;
    }
  }
  
  /**
   * Calculate distance between two points in km
   */
  static calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    // Haversine formula
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return distance;
  }
  
  /**
   * Convert degrees to radians
   */
  private static deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
  
  /**
   * Estimate arrival time based on distance and average speed
   */
  static estimateArrivalTime(
    providerLat: number, 
    providerLon: number, 
    customerLat: number, 
    customerLon: number,
    averageSpeedKmh: number = 30 // Default to 30 km/h for urban areas
  ): string {
    const distance = this.calculateDistance(providerLat, providerLon, customerLat, customerLon);
    const estimatedTimeHours = distance / averageSpeedKmh;
    const estimatedTimeMinutes = Math.round(estimatedTimeHours * 60);
    
    // Calculate estimated arrival time
    const now = new Date();
    now.setMinutes(now.getMinutes() + estimatedTimeMinutes);
    
    return now.toISOString();
  }
}

/**
 * SQL to create location_tracking table:
 * 
 * CREATE TABLE IF NOT EXISTS location_tracking (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
 *   service_id UUID REFERENCES services(id),
 *   provider_id UUID REFERENCES auth.users(id),
 *   customer_id UUID REFERENCES auth.users(id),
 *   provider_latitude DECIMAL(10, 8),
 *   provider_longitude DECIMAL(11, 8),
 *   customer_latitude DECIMAL(10, 8),
 *   customer_longitude DECIMAL(11, 8),
 *   provider_address TEXT,
 *   customer_address TEXT,
 *   status VARCHAR(20) NOT NULL,
 *   estimated_arrival_time TIMESTAMP WITH TIME ZONE,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 */ 