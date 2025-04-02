import { createClient } from '@supabase/supabase-js';
import { toast } from "sonner";
import { PaymentProvider, PaymentProviderService } from "./payment-provider-service";

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// API keys for various verification providers
const stripeApiKey = import.meta.env.VITE_STRIPE_SECRET_KEY as string;
const paystackApiKey = import.meta.env.VITE_PAYSTACK_SECRET_KEY as string;
const sumsumApiKey = import.meta.env.VITE_SUMSUB_SECRET_KEY as string;

// Define verification provider enum
export enum VerificationProvider {
  SUMSUB = 'sumsub',
  STRIPE = 'stripe',
  PAYSTACK = 'paystack'
}

// API configuration for different providers
const API_CONFIGS = {
  [VerificationProvider.SUMSUB]: {
    urls: {
      primary: "https://api.sumsub.com/resources/accessTokens",
      fallback: "https://api-eu.sumsub.com/resources/accessTokens",
      directIntegration: "https://hosted.sumsub.com"
    },
    secretKey: import.meta.env.VITE_SUMSUB_SECRET_KEY || "",
    publicKey: import.meta.env.VITE_SUMSUB_APP_TOKEN || ""
  },
  [VerificationProvider.STRIPE]: {
    urls: {
      primary: "https://api.stripe.com/v1/identity/verification_sessions",
      fallback: "https://api-secondary.stripe.com/v1/identity/verification_sessions",
      directIntegration: "https://dashboard.stripe.com/account/onboarding/verification"
    },
    secretKey: import.meta.env.VITE_STRIPE_SECRET_KEY || "",
    publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY || ""
  },
  [VerificationProvider.PAYSTACK]: {
    urls: {
      primary: "https://api.paystack.co/verification/business",
      fallback: "https://api.paystack.co/verification/business",
      directIntegration: "https://dashboard.paystack.com/verification/business"
    },
    secretKey: import.meta.env.VITE_PAYSTACK_SECRET_KEY || "",
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || ""
  }
};

interface VerificationResult {
  status: 'success' | 'error';
  message: string;
  url?: string;
  provider?: VerificationProvider;
}

/**
 * Service for handling business verification using multiple providers based on location
 * 
 * This service provides methods for initiating verification, checking status,
 * and handling verification results for business accounts, using either Stripe or
 * Paystack depending on the user's location.
 */
export class KYCVerificationService {
  // Base URL for API calls to our backend
  private static apiUrl = import.meta.env.VITE_API_URL || "https://api.venturezon.com/api";
  // Fallback URL if main API is down
  private static fallbackApiUrl = "https://backup-api.venturezon.com/api";

  /**
   * Check if a user is eligible for verification (business accounts only)
   * 
   * @param userId The ID of the user to check
   * @returns Boolean indicating if the user is eligible for verification
   */
  static async isEligibleForVerification(userId: string): Promise<boolean> {
    try {
      // Get user profile to check role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_role, kyc_status')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Error checking verification eligibility:", error);
        return false;
      }
      
      // Only business accounts need verification
      return profile?.user_role === 'business';
    } catch (error) {
      console.error("Error in isEligibleForVerification:", error);
      return false;
    }
  }

  /**
   * Get the appropriate verification API config based on user location
   * 
   * @param userId User ID
   * @returns API configuration for the appropriate provider
   */
  private static async getVerificationConfig(userId: string): Promise<{config: any, provider: VerificationProvider}> {
    // Always use Sumsub for verification, regardless of user location
    const provider = VerificationProvider.SUMSUB;
    
    // Get provider-specific configuration
    const config = API_CONFIGS[provider];
    
    // Ensure API keys are present
    if (!config.secretKey || config.secretKey === "") {
      console.error(`Missing API key for ${provider}. Check your environment variables.`);
    }
    
    return { config, provider };
  }

  /**
   * Create verification data for different providers
   * 
   * @param userId User ID
   * @param provider Payment provider
   * @param userProfile User profile data
   * @returns Verification data formatted for the provider
   */
  private static async createVerificationData(
    userId: string, 
    provider: VerificationProvider, 
    userProfile: any
  ): Promise<any> {
    // Make sure we have absolute URLs for return paths
    const baseUrl = window.location.origin;
    const baseReturnUrl = `${baseUrl}/settings?tab=verification&status=success`;
    const baseFailureUrl = `${baseUrl}/settings?tab=verification&status=error`;
    
    // Common metadata for all providers
    const commonMetadata = {
      userId: userId,
      email: userProfile.email || '',
      businessName: userProfile.business_name || userProfile.full_name || ''
    };
    
    // Provider-specific data formatting
    switch (provider) {
      case VerificationProvider.SUMSUB:
        return {
          externalUserId: userId,
          ttlInSecs: 1200, // 20 minutes
          email: userProfile.email,
          phone: userProfile.phone,
          userInfo: {
            firstName: userProfile.full_name?.split(' ')[0] || '',
            lastName: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
            email: userProfile.email || '',
            phone: userProfile.phone || '',
            country: userProfile.country_code || '',
            companyName: userProfile.business_name || ''
          },
          fixedInfo: {
            userType: "business"
          },
          customizations: {
            lang: "en",
            callbackUrl: baseReturnUrl
          }
        };
        
      case VerificationProvider.STRIPE:
        return {
          type: 'business',
          metadata: commonMetadata,
          return_url: baseReturnUrl,
          failure_url: baseFailureUrl,
          success_url: baseReturnUrl,
          cancel_url: baseFailureUrl
        };
        
      case VerificationProvider.PAYSTACK:
        return {
          business_type: 'business',
          customer: {
            email: userProfile.email || '',
            first_name: userProfile.full_name?.split(' ')[0] || '',
            last_name: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
            phone: userProfile.phone || ''
          },
          metadata: commonMetadata,
          callback_url: baseReturnUrl,
          success_url: baseReturnUrl,
          cancel_url: baseFailureUrl
        };
        
      default:
        return {
          type: 'business',
          metadata: commonMetadata,
          return_url: baseReturnUrl,
          failure_url: baseFailureUrl,
          success_url: baseReturnUrl,
          cancel_url: baseFailureUrl
        };
    }
  }

  /**
   * Start a new verification process for a business user
   * 
   * This creates a new verification session with the appropriate provider based on
   * the user's location and returns a URL that the user can access to complete verification.
   * 
   * @param userId The ID of the user to verify
   * @returns An object containing the verification URL and session ID
   */
  static async startVerification(userId: string): Promise<VerificationResult> {
    try {
      // Check if user is eligible for verification
      const isEligible = await this.isEligibleForVerification(userId);
      if (!isEligible) {
        return {
          status: 'error',
          message: 'Only business accounts are eligible for verification.'
        };
      }
      
      // Get user details for verification
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (userError || !userProfile) {
        console.error('Error fetching user data:', userError);
        return {
          status: 'error',
          message: 'Unable to retrieve your account information. Please try again later.'
        };
      }
      
      // Get the appropriate provider and config based on location
      const { config, provider } = await this.getVerificationConfig(userId);
      
      // Check if API keys are configured properly
      if (!config.secretKey || config.secretKey.trim() === '') {
        console.error(`Missing API key for ${provider}. Check your environment variables.`);
        return {
          status: 'error',
          message: 'Verification service is not properly configured. Please contact support.'
        };
      }
      
      // Prepare verification data based on provider
      const verificationData = await this.createVerificationData(userId, provider, userProfile);
      
      try {
        // Different approach for Sumsub vs other providers
        if (provider === VerificationProvider.SUMSUB) {
          const timestamp = Math.floor(Date.now() / 1000).toString();
          const signature = await this.generateSumsSubSignature(
            'POST', 
            '/resources/accessTokens', 
            JSON.stringify(verificationData),
            timestamp,
            config.secretKey
          );
          
          // Primary API request for Sumsub
          const response = await fetch(config.urls.primary, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-App-Token': config.publicKey,
              'X-App-Access-Sig': signature,
              'X-App-Access-Ts': timestamp
            },
            body: JSON.stringify(verificationData)
          });
          
          const data = await response.json();
          
          if (response.ok && data?.token) {
            // Update the user's KYC status
            await supabase
              .from('profiles')
              .update({
                kyc_status: 'started',
                kyc_provider: provider,
                kyc_updated_at: new Date().toISOString()
              })
              .eq('id', userId);
              
            // Construct the Sumsub URL with token
            const sumsSubUrl = `${config.urls.directIntegration}?clientId=${config.publicKey}&accessToken=${data.token}`;
              
            return {
              status: 'success',
              message: 'Verification process started successfully. You will be redirected to complete the verification.',
              url: sumsSubUrl,
              provider
            };
          } else {
            throw new Error(data.message || data.error?.message || 'Primary API request failed');
          }
        } else {
          // Standard approach for other providers
          const response = await fetch(config.urls.primary, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.secretKey}`
            },
            body: JSON.stringify(verificationData)
          });
          
          const data = await response.json();
          
          if (response.ok && data?.url) {
            // Update the user's KYC status
            await supabase
              .from('profiles')
              .update({
                kyc_status: 'started',
                kyc_provider: provider,
                kyc_updated_at: new Date().toISOString()
              })
              .eq('id', userId);
              
            return {
              status: 'success',
              message: 'Verification process started successfully. You will be redirected to complete the verification.',
              url: data.url,
              provider
            };
          } else {
            throw new Error(data.error?.message || 'Primary API request failed');
          }
        }
      } catch (primaryError) {
        console.error('Primary API error:', primaryError);
        
        try {
          // Fallback API request - different approach for Sumsub
          console.log('Trying fallback API...');
          
          if (provider === VerificationProvider.SUMSUB) {
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const signature = await this.generateSumsSubSignature(
              'POST', 
              '/resources/accessTokens', 
              JSON.stringify(verificationData),
              timestamp,
              config.secretKey
            );
            
            // Fallback API request for Sumsub
            const fallbackResponse = await fetch(config.urls.fallback, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-App-Token': config.publicKey,
                'X-App-Access-Sig': signature,
                'X-App-Access-Ts': timestamp
              },
              body: JSON.stringify(verificationData)
            });
            
            const fallbackData = await fallbackResponse.json();
            
            if (fallbackResponse.ok && fallbackData?.token) {
              // Update the user's KYC status
              await supabase
                .from('profiles')
                .update({
                  kyc_status: 'started',
                  kyc_provider: provider,
                  kyc_updated_at: new Date().toISOString()
                })
                .eq('id', userId);
                
              // Construct the Sumsub URL with token
              const sumsSubUrl = `${config.urls.directIntegration}?clientId=${config.publicKey}&accessToken=${fallbackData.token}`;
                
              return {
                status: 'success',
                message: 'Verification process started successfully. You will be redirected to complete the verification.',
                url: sumsSubUrl,
                provider
              };
            } else {
              throw new Error(fallbackData.message || fallbackData.error?.message || 'Fallback API request failed');
            }
          } else {
            // Standard fallback for other providers
            const fallbackResponse = await fetch(config.urls.fallback, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.secretKey}`
              },
              body: JSON.stringify(verificationData)
            });
            
            const fallbackData = await fallbackResponse.json();
            
            if (fallbackResponse.ok && fallbackData?.url) {
              // Update the user's KYC status
              await supabase
                .from('profiles')
                .update({
                  kyc_status: 'started',
                  kyc_provider: provider,
                  kyc_updated_at: new Date().toISOString()
                })
                .eq('id', userId);
                
              return {
                status: 'success',
                message: 'Verification process started successfully. You will be redirected to complete the verification.',
                url: fallbackData.url,
                provider
              };
            } else {
              throw new Error(fallbackData.error?.message || 'Fallback API request failed');
            }
          }
        } catch (fallbackError) {
          console.error('Fallback API error:', fallbackError);
          
          // Last resort: Use direct integration URL
          console.log('Using direct integration URL as last resort');
          
          // Update the user's KYC status for direct integration
          await supabase
            .from('profiles')
            .update({
              kyc_status: 'started',
              kyc_provider: provider,
              kyc_updated_at: new Date().toISOString()
            })
            .eq('id', userId);
          
          // For Sumsub we can't directly use the integration URL without a token
          if (provider === VerificationProvider.SUMSUB) {
            return {
              status: 'error',
              message: 'Unable to establish connection with our verification partner. Please try again later or contact support.',
              provider
            };
          }
          
          return {
            status: 'success',
            message: 'Our API is currently unavailable. You will be redirected to the verification portal to complete the process.',
            url: config.urls.directIntegration,
            provider
          };
        }
      }
    } catch (err) {
      console.error('Error starting verification:', err);
      return {
        status: 'error',
        message: `Error starting verification: ${err instanceof Error ? err.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Generate a signature for Sumsub API requests
   */
  private static async generateSumsSubSignature(
    method: string,
    path: string,
    body: string,
    timestamp: string,
    secretKey: string
  ): Promise<string> {
    try {
      // Validate that we have a non-empty secret key
      if (!secretKey || secretKey.trim() === '') {
        throw new Error('HMAC key cannot be empty. Check your environment variables.');
      }
      
      // For demonstration - in real implementation, use crypto library
      const message = timestamp + method + path + body;
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const keyData = encoder.encode(secretKey);
      
      // Use the Web Crypto API for HMAC-SHA256
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: { name: 'SHA-256' } },
        false,
        ['sign']
      );
      
      const signature = await window.crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        data
      );
      
      // Convert to base64
      return btoa(String.fromCharCode(...new Uint8Array(signature)));
    } catch (error) {
      console.error('Error generating Sumsub signature:', error);
      throw error;
    }
  }

  /**
   * Verify a business's tax information using the appropriate provider
   * 
   * @param userId User ID
   * @param taxId Tax ID or VAT number
   * @returns Result of the tax verification
   */
  static async verifyTaxId(userId: string, taxId: string): Promise<VerificationResult> {
    try {
      // Check eligibility
      const isEligible = await this.isEligibleForVerification(userId);
      if (!isEligible) {
        return {
          status: 'error',
          message: 'Only business accounts are eligible for tax verification.'
        };
      }
      
      // Get the appropriate provider and config based on location
      const { config, provider } = await this.getVerificationConfig(userId);
      
      // Endpoint paths are different for each provider
      const endpoint = provider === VerificationProvider.STRIPE
        ? `${config.urls.primary}/tax_id_verification`
        : `${config.urls.primary}/tax`;
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.secretKey}`
          },
          body: JSON.stringify({
            tax_id: taxId,
            metadata: { userId }
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Save the tax verification results
          await supabase
            .from('profiles')
            .update({
              tax_id: taxId,
              tax_id_verified: data.valid === true,
              tax_id_verification_date: new Date().toISOString()
            })
            .eq('id', userId);
            
          return {
            status: data.valid === true ? 'success' : 'error',
            message: data.valid === true
              ? 'Tax ID verified successfully.'
              : 'Tax ID could not be verified. Please ensure you entered the correct ID.',
            provider
          };
        } else {
          throw new Error(data.error?.message || 'Tax verification failed');
        }
      } catch (error) {
        console.error('Tax verification error:', error);
        return {
          status: 'error',
          message: `Tax verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    } catch (err) {
      console.error('Error in tax verification:', err);
      return {
        status: 'error',
        message: `Error in tax verification: ${err instanceof Error ? err.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Verify a business bank account using the appropriate provider
   * 
   * @param userId User ID
   * @param accountData Bank account data (format varies by provider)
   * @returns Result of the bank account verification
   */
  static async verifyBankAccount(userId: string, accountData: any): Promise<VerificationResult> {
    try {
      // Check eligibility
      const isEligible = await this.isEligibleForVerification(userId);
      if (!isEligible) {
        return {
          status: 'error',
          message: 'Only business accounts are eligible for bank account verification.'
        };
      }
      
      // Get the appropriate provider and config based on location
      const { config, provider } = await this.getVerificationConfig(userId);
      
      // Different endpoints and data formats for different providers
      let endpoint: string;
      let requestData: any;
      
      if (provider === VerificationProvider.STRIPE) {
        endpoint = `${config.urls.primary}/bank_accounts/verify`;
        requestData = {
          account_holder_name: accountData.accountHolderName,
          account_number: accountData.accountNumber,
          routing_number: accountData.routingNumber,
          country: accountData.country || 'US',
          currency: accountData.currency || 'usd',
          metadata: { userId }
        };
      } else {
        // Paystack
        endpoint = `${config.urls.primary}/bank_accounts/resolve`;
        requestData = {
          account_number: accountData.accountNumber,
          bank_code: accountData.bankCode,
          metadata: { userId }
        };
      }
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.secretKey}`
          },
          body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.status) {
          // Format varies by provider, but both have status field
          const isVerified = provider === VerificationProvider.STRIPE 
            ? data.status === 'verified'
            : data.status === true;
          
          // Save the bank verification results, with provider-specific details
          const updateData = {
            bank_account_verified: isVerified,
            bank_account_verification_date: new Date().toISOString(),
            bank_account_provider: provider
          };
          
          // Add provider-specific fields
          if (provider === VerificationProvider.STRIPE) {
            Object.assign(updateData, {
              bank_account_last4: data.last4,
              bank_account_bank_name: data.bank_name
            });
          } else {
            Object.assign(updateData, {
              bank_account_last4: accountData.accountNumber.slice(-4),
              bank_account_bank_name: data.account_name
            });
          }
          
          await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId);
            
          return {
            status: isVerified ? 'success' : 'error',
            message: isVerified
              ? 'Bank account verified successfully.'
              : 'Bank account could not be verified. Please check your details and try again.',
            provider
          };
        } else {
          throw new Error(data.error?.message || data.message || 'Bank verification failed');
        }
      } catch (error) {
        console.error('Bank verification error:', error);
        return {
          status: 'error',
          message: `Bank verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    } catch (err) {
      console.error('Error in bank verification:', err);
      return {
        status: 'error',
        message: `Error in bank verification: ${err instanceof Error ? err.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check the current status of a user's verification
   * 
   * @param userId The ID of the user to check
   * @returns The current verification status
   */
  static async checkVerificationStatus(userId: string): Promise<string> {
    try {
      // Only check for business accounts
      const isEligible = await this.isEligibleForVerification(userId);
      if (!isEligible) {
        return 'not_applicable';
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('kyc_status, kyc_verified, kyc_provider')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error checking verification status:', error);
        return 'error';
      }
      
      if (data.kyc_verified) {
        return 'verified';
      }
      
      return data.kyc_status || 'not_started';
    } catch (err) {
      console.error('Exception checking verification status:', err);
      return 'error';
    }
  }

  /**
   * Retry a failed verification
   * 
   * @param userId The ID of the user to retry verification for
   * @returns An object containing the new verification URL
   */
  static async retryVerification(userId: string): Promise<VerificationResult> {
    try {
      // Reset the KYC status to allow retry
      const { error } = await supabase
        .from('profiles')
        .update({ 
          kyc_status: 'not_started', 
          kyc_rejection_reason: null,
          kyc_updated_at: new Date().toISOString() 
        })
        .eq('id', userId);
        
      if (error) {
        console.error('Error resetting verification status:', error);
        return {
          status: 'error',
          message: 'Unable to reset your verification status. Please try again later.'
        };
      }
      
      // Start verification again
      return this.startVerification(userId);
    } catch (err) {
      console.error('Error retrying verification:', err);
      return {
        status: 'error',
        message: `Error retrying verification: ${err instanceof Error ? err.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Webhook handler for receiving verification updates
   * This would typically be called from an API endpoint that receives callbacks from the verification service
   */
  static async handleVerificationCallback(event: any): Promise<void> {
    try {
      const { data } = event;
      const userId = data.metadata?.userId;
      
      if (!userId) {
        console.error('Missing userId in webhook data');
        return;
      }
      
      // Determine the status field name based on provider
      const provider = data.metadata?.provider || VerificationProvider.STRIPE;
      const statusField = provider === VerificationProvider.STRIPE ? 'status' : 'verification_status';
      
      if (data[statusField] === 'verified') {
        await supabase
          .from('profiles')
          .update({ 
            kyc_verified: true,
            kyc_status: 'verified',
            kyc_updated_at: new Date().toISOString() 
          })
          .eq('id', userId);
          
        // Notify user via toast or other notification mechanism
        toast.success('Your business has been successfully verified!');
      } else if (data[statusField] === 'rejected') {
        await supabase
          .from('profiles')
          .update({ 
            kyc_verified: false,
            kyc_status: 'rejected',
            kyc_rejection_reason: data.reason || data.rejection_reason || 'Verification requirements not met',
            kyc_updated_at: new Date().toISOString() 
          })
          .eq('id', userId);
          
        toast.error('Your verification was unsuccessful. Please check the verification tab for details.');
      }
    } catch (err) {
      console.error('Error handling verification callback:', err);
    }
  }
}

/**
 * Backend Implementation Guide for Stripe Identity Integration
 * 
 * This service calls our backend API, which should implement the following:
 * 
 * 1. /api/kyc/start-verification endpoint:
 *    - Authenticates with Stripe using API credentials
 *    - Creates a new verification workflow with user data
 *    - Returns the Stripe redirect URL to the frontend
 * 
 * 2. /api/kyc/webhook endpoint:
 *    - Receives callbacks from Stripe when verification status changes
 *    - Validates the authenticity of the webhook using shared secrets
 *    - Updates the user's verification status in the database
 *    - Sends notifications to the user about their verification status
 * 
 * Stripe API Documentation: https://stripe.com/docs/api
 */

// Example webhook handler (to be implemented on backend)
/*
app.post('/api/kyc/webhook', async (req, res) => {
  // Validate signature
  const signature = req.headers['x-jumio-signature'];
  if (!validateJumioSignature(signature, req.body)) {
    return res.status(401).send('Invalid signature');
  }

  const { userId, status, transactionId, identityVerification } = req.body;

  // Update user verification status in database
  if (status === 'APPROVED') {
    await db.collection('profiles').updateOne(
      { id: userId },
      { $set: { 
          kyc_status: 'verified',
          kyc_verified: true,
          kyc_verified_at: new Date(),
        } 
      }
    );

    // Send notification to user
    await notificationService.sendToUser(userId, {
      title: 'Identity Verification Approved',
      message: 'Your identity has been successfully verified!',
    });
  } else if (status === 'DENIED') {
    await db.collection('profiles').updateOne(
      { id: userId },
      { $set: { 
          kyc_status: 'rejected',
          kyc_verified: false,
          kyc_rejection_reason: identityVerification.reason,
        } 
      }
    );

    // Send notification to user
    await notificationService.sendToUser(userId, {
      title: 'Identity Verification Denied',
      message: 'Your identity verification was not successful. Please try again.',
    });
  }

  res.status(200).send('Webhook processed');
});
*/ 