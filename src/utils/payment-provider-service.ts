import { supabase } from "@/integrations/supabase/client";

/**
 * Enum for supported payment providers
 */
export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYSTACK = 'paystack'
}

/**
 * Service type that a payment provider can be used for
 */
export enum ProviderServiceType {
  KYC = 'kyc',
  BANK_VERIFICATION = 'bank_verification',
  PAYMENT = 'payment'
}

/**
 * Mapping of payment providers to the countries they support
 */
const PROVIDER_COUNTRY_SUPPORT = {
  [PaymentProvider.STRIPE]: [
    'US', 'GB', 'CA', 'AU', 'NZ', 'SG', 'HK', 'JP', 'DE', 'FR', 'IT', 'ES', 
    'NL', 'BE', 'AT', 'CH', 'IE', 'SE', 'DK', 'NO', 'FI', 'LU', 'PT'
  ],
  [PaymentProvider.PAYSTACK]: [
    'NG', 'GH', 'ZA', 'KE'
  ]
};

/**
 * Countries where Stripe is preferred for payments and bank verification
 * when both providers are available
 */
const PREFER_STRIPE_COUNTRIES = ['NG', 'GH', 'ZA', 'KE'];

/**
 * Service for managing payment provider selection based on user location
 */
export class PaymentProviderService {
  /**
   * Determine the appropriate payment provider based on country code
   * 
   * @param countryCode ISO country code (e.g., 'US', 'NG')
   * @returns The appropriate payment provider for the country
   */
  static determineProvider(countryCode: string): PaymentProvider {
    // Default to Stripe if country code is unavailable
    if (!countryCode) return PaymentProvider.STRIPE;
    
    const normalizedCountry = countryCode.toUpperCase();
    
    // Check if Stripe is supported in this country
    const stripeSupported = PROVIDER_COUNTRY_SUPPORT[PaymentProvider.STRIPE].includes(normalizedCountry);
    
    // Check if Paystack is supported in this country
    const paystackSupported = PROVIDER_COUNTRY_SUPPORT[PaymentProvider.PAYSTACK].includes(normalizedCountry);
    
    // If both are supported, prefer Stripe in specific countries as requested
    if (stripeSupported && paystackSupported) {
      return PREFER_STRIPE_COUNTRIES.includes(normalizedCountry) 
        ? PaymentProvider.STRIPE 
        : PaymentProvider.PAYSTACK;
    }
    
    // Use Stripe if supported, otherwise use Paystack if supported
    if (stripeSupported) return PaymentProvider.STRIPE;
    if (paystackSupported) return PaymentProvider.PAYSTACK;
    
    // Default to Stripe if no specific support is found
    return PaymentProvider.STRIPE;
  }
  
  /**
   * Determine which provider to use for a specific service type
   * 
   * @param countryCode ISO country code
   * @param serviceType The type of service (KYC, bank verification, payment)
   * @returns The appropriate provider for the service type
   */
  static determineProviderForService(
    countryCode: string, 
    serviceType: ProviderServiceType
  ): PaymentProvider {
    // Default to base provider determination
    const baseProvider = this.determineProvider(countryCode);
    
    // Override based on service type if needed
    switch (serviceType) {
      case ProviderServiceType.KYC:
        // For KYC, prefer Stripe when possible as it has better verification
        if (PROVIDER_COUNTRY_SUPPORT[PaymentProvider.STRIPE].includes(countryCode.toUpperCase())) {
          return PaymentProvider.STRIPE;
        }
        break;
        
      case ProviderServiceType.BANK_VERIFICATION:
        // For bank verification, also prefer Stripe when possible
        if (PROVIDER_COUNTRY_SUPPORT[PaymentProvider.STRIPE].includes(countryCode.toUpperCase())) {
          return PaymentProvider.STRIPE;
        }
        break;
        
      case ProviderServiceType.PAYMENT:
        // For payments, use the base provider determination
        break;
    }
    
    return baseProvider;
  }
  
  /**
   * Detect the user's country code from their IP address
   * 
   * @returns Promise resolving to country code or null if detection fails
   */
  static async detectCountryFromIP(): Promise<string | null> {
    try {
      // Use ipinfo.io for IP-based country detection
      const response = await fetch('https://ipinfo.io/json');
      
      if (!response.ok) {
        console.error('Failed to fetch country from IP:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      return data.country || null;
    } catch (error) {
      console.error('Error detecting country from IP:', error);
      return null;
    }
  }
  
  /**
   * Save the detected country code for a user
   * 
   * @param userId The user ID
   * @param countryCode The country code to save
   * @returns True if saved successfully, false otherwise
   */
  static async saveUserCountry(userId: string, countryCode: string): Promise<boolean> {
    try {
      if (!userId || !countryCode) return false;
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          country_code: countryCode,
          location_updated_at: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (error) {
        console.error('Error saving user country:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception saving user country:', error);
      return false;
    }
  }
  
  /**
   * Get the saved country code for a user
   * 
   * @param userId The user ID
   * @returns Promise resolving to country code or null if not found
   */
  static async getUserCountry(userId: string): Promise<string | null> {
    try {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('country_code')
        .eq('id', userId)
        .single();
        
      if (error || !data) {
        console.error('Error fetching user country:', error);
        return null;
      }
      
      return data.country_code || null;
    } catch (error) {
      console.error('Exception fetching user country:', error);
      return null;
    }
  }
  
  /**
   * Determine and save the appropriate payment provider for a user
   * This will detect country from IP if not already saved
   * 
   * @param userId The user ID
   * @returns The determined payment provider
   */
  static async determineAndSaveUserProvider(userId: string): Promise<PaymentProvider> {
    try {
      if (!userId) return PaymentProvider.STRIPE;
      
      // Check if we already have country info for the user
      let countryCode = await this.getUserCountry(userId);
      
      // If not, detect it from IP and save
      if (!countryCode) {
        countryCode = await this.detectCountryFromIP();
        
        if (countryCode) {
          await this.saveUserCountry(userId, countryCode);
        }
      }
      
      // Determine provider based on country
      const provider = this.determineProvider(countryCode || '');
      
      // Save the preferred provider to the user profile
      await supabase
        .from('profiles')
        .update({ 
          preferred_payment_provider: provider,
          provider_updated_at: new Date().toISOString()
        })
        .eq('id', userId);
        
      return provider;
    } catch (error) {
      console.error('Error determining user provider:', error);
      return PaymentProvider.STRIPE; // Default to Stripe on error
    }
  }
  
  /**
   * Check if a specific provider is available for a user based on their location
   * 
   * @param userId The user ID
   * @param provider The provider to check availability for
   * @returns True if the provider is available, false otherwise
   */
  static async isProviderAvailable(
    userId: string, 
    provider: PaymentProvider
  ): Promise<boolean> {
    try {
      const countryCode = await this.getUserCountry(userId);
      
      if (!countryCode) return true; // Default to available if we can't determine
      
      return PROVIDER_COUNTRY_SUPPORT[provider].includes(countryCode.toUpperCase());
    } catch (error) {
      console.error('Error checking provider availability:', error);
      return true; // Default to available on error
    }
  }
  
  /**
   * Get the appropriate payment provider for a specific transaction
   * This is used when making payments for services or promotions
   * 
   * @param userId The user making the payment
   * @param serviceType The type of service being paid for
   * @returns The appropriate payment provider
   */
  static async getPaymentProviderForTransaction(
    userId: string,
    serviceType: ProviderServiceType = ProviderServiceType.PAYMENT
  ): Promise<PaymentProvider> {
    try {
      if (!userId) return PaymentProvider.STRIPE;
      
      // Check if user has country code saved
      const countryCode = await this.getUserCountry(userId);
      
      // If we have a country code, determine provider based on service type
      if (countryCode) {
        return this.determineProviderForService(countryCode, serviceType);
      }
      
      // If no country code, determine and save provider
      return this.determineAndSaveUserProvider(userId);
    } catch (error) {
      console.error('Error getting payment provider for transaction:', error);
      return PaymentProvider.STRIPE; // Default to Stripe on error
    }
  }
} 