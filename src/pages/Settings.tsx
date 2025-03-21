import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KYCVerification } from "@/components/kyc/KYCVerification";
import { MainLayout } from "@/layouts/MainLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bell, CreditCard, Globe, Lock, LogOut, Save, Shield, User, Wallet, AlertCircle, ExternalLink, CheckCircle, AlertTriangle, Briefcase, Info, Loader2 } from "lucide-react";
import { KYCVerificationService } from "@/utils/kyc-verification-service";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { uploadFileWithFallback } from "@/utils/upload-helper";
import { Badge } from "@/components/ui/badge";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  loadStripe
} from "@/utils/stripe-components";
import { StyledCardElement } from "@/utils/stripe-elements";

// Define interfaces
interface PaymentMethod {
  id: string;
  user_id: string;
  provider: string;
  card_last4: string;
  card_brand: string;
  card_exp_month: number;
  card_exp_year: number;
  is_default: boolean;
  created_at: string;
}

// Initialize Stripe with the public key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");

// Add fallback if Stripe key is not available
const StripeWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [stripeError, setStripeError] = useState<string | null>(null);

  if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
    console.warn("Stripe public key not found in environment variables");
    return (
      <div className="p-4 border border-yellow-500 bg-yellow-50 rounded-md text-yellow-800">
        <h3 className="text-sm font-medium flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2" /> Stripe configuration missing
        </h3>
        <p className="text-xs mt-1">
          Stripe payment processing is unavailable. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      {stripeError ? (
        <div className="p-4 border border-red-300 bg-red-50 rounded-md text-red-800">
          <h3 className="text-sm font-medium flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" /> Stripe connection error
          </h3>
          <p className="text-xs mt-1">{stripeError}</p>
        </div>
      ) : (
        children
      )}
    </Elements>
  );
};

interface PaymentFormProps {
  onSuccess: () => void;
  userId: string;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onSuccess, userId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentProvider, setPaymentProvider] = useState<'stripe' | 'paystack'>('stripe');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProvider, setIsLoadingProvider] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Get preferred payment provider based on user's location
  useEffect(() => {
    const getPaymentProvider = async () => {
      setIsLoadingProvider(true);
      try {
        // Try to get from API first
        try {
          const response = await fetch(`/api/payment-provider`);
          if (response.ok) {
            const data = await response.json();
            if (data.provider) {
              setPaymentProvider(data.provider as 'stripe' | 'paystack');
              setIsLoadingProvider(false);
              return;
            }
          }
        } catch (error) {
          console.warn("Failed to get payment provider from API:", error);
        }
        
        // Fallback to local storage or default
        const savedProvider = localStorage.getItem('preferred_payment_provider');
        if (savedProvider === 'stripe' || savedProvider === 'paystack') {
          setPaymentProvider(savedProvider);
        } else {
          // Default based on common browser locale detection
          const userLanguage = navigator.language;
          // Use Paystack for African countries by default (simplified example)
          if (userLanguage.includes('NG') || userLanguage.includes('GH') || 
              userLanguage.includes('KE') || userLanguage.includes('ZA')) {
            setPaymentProvider('paystack');
          } else {
            setPaymentProvider('stripe');
          }
        }
      } catch (e) {
        console.error("Error determining payment provider:", e);
        // Default to Stripe as fallback
        setPaymentProvider('stripe');
      } finally {
        setIsLoadingProvider(false);
      }
    };
    
    getPaymentProvider();
  }, []);

  // Handle form submission - combined handler for both payment providers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (paymentProvider === 'stripe') {
        await handleStripeSubmit();
      } else if (paymentProvider === 'paystack') {
        await handlePaystackSubmit(e.currentTarget as HTMLFormElement);
      }
    } catch (error) {
      console.error('Payment form error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to process payment method",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Stripe payment submission without event parameter
  const handleStripeSubmit = async () => {
    if (!stripe || !elements) {
      setError("Stripe has not been properly initialized");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card information is incomplete");
      return;
    }

    // Create the payment method - properly typed for Stripe API v3
    const { paymentMethod, error: stripeError } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (stripeError) {
      console.error('Error creating payment method:', stripeError);
      setError(stripeError.message || 'Failed to process your card. Please try again.');
      return;
    }

    // Handle successful result
    if (!paymentMethod) {
      setError('Failed to create payment method. Please try again.');
      return;
    }

    console.log('Successfully created payment method:', paymentMethod);
    
    // Save to database
    const { error: saveError } = await supabase
      .from('payment_methods')
      .insert({
        id: paymentMethod.id,
        user_id: userId,
        provider: 'stripe',
        card_last4: paymentMethod.card.last4,
        card_brand: paymentMethod.card.brand,
        card_exp_month: paymentMethod.card.exp_month,
        card_exp_year: paymentMethod.card.exp_year,
        is_default: true,
        created_at: new Date().toISOString()
      });

    if (saveError) {
      console.error('Error saving payment method:', saveError);
      setError('Payment method was created but could not be saved. Please try again.');
      return;
    }

    // Clear form and notify success
    cardElement.clear();
    toast({
      title: "Payment method added",
      description: `Card ending in ${paymentMethod.card.last4} has been added to your account.`,
    });
    
    onSuccess();
  };

  // Handle Paystack payment submission with form parameter
  const handlePaystackSubmit = async (formElement: HTMLFormElement) => {
    const cardNumber = (formElement.querySelector('#cardNumber') as HTMLInputElement).value.replace(/\s/g, '');
    const expiryDate = (formElement.querySelector('#expiryDate') as HTMLInputElement).value;
    const cvv = (formElement.querySelector('#cvv') as HTMLInputElement).value;
    
    // Basic validation
    if (!cardNumber || cardNumber.length < 13) {
      setError("Please enter a valid card number");
      return;
    }
    
    if (!expiryDate || !expiryDate.includes('/')) {
      setError("Please enter a valid expiry date (MM/YY)");
      return;
    }
    
    if (!cvv || cvv.length < 3) {
      setError("Please enter a valid CVV code");
      return;
    }
    
    // Parse expiry date
    const [expMonth, expYear] = expiryDate.split('/');
    const expMonthNum = parseInt(expMonth, 10);
    const expYearNum = parseInt(expYear, 10) + 2000; // Convert 2-digit year to 4-digit
    
    // Additional validation
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    if (expYearNum < currentYear || (expYearNum === currentYear && expMonthNum < currentMonth)) {
      setError("Card has expired");
      return;
    }
    
    try {
      // Try to use API if available
      const response = await fetch('/api/payment-methods/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          card_number: cardNumber,
          cvv: cvv,
          expiry_month: expMonthNum,
          expiry_year: expYearNum,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Clear form
        formElement.reset();
        toast({
          title: "Payment method added",
          description: `Your card has been added to your account.`,
        });
        onSuccess();
        return;
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to process payment method");
      }
    } catch (apiError) {
      console.warn("API method failed, using direct database method", apiError);
      // Fallback: Store with a generated token (in production, you'd get this from Paystack)
      const last4 = cardNumber.slice(-4);
      const cardBrand = getCardBrand(cardNumber);
      
      const { error: saveError } = await supabase.from('payment_methods').insert([
        {
          user_id: userId,
          id: `pstk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: 'paystack',
          card_brand: cardBrand,
          card_last4: last4,
          card_exp_month: expMonthNum,
          card_exp_year: expYearNum,
          is_default: true,
          created_at: new Date().toISOString()
        }
      ]);
      
      if (saveError) {
        throw saveError;
      }
      
      // Clear form
      formElement.reset();
      
      toast({
        title: "Payment method added",
        description: `Card ending in ${last4} has been added to your account.`,
      });
      
      onSuccess();
    }
  };
  
  // Helper function to determine card brand from card number
  const getCardBrand = (cardNumber: string): string => {
    // Simplified card detection
    if (cardNumber.startsWith('4')) {
      return 'visa';
    } else if (/^5[1-5]/.test(cardNumber)) {
      return 'mastercard';
    } else if (/^3[47]/.test(cardNumber)) {
      return 'amex';
    } else if (/^6(?:011|5)/.test(cardNumber)) {
      return 'discover';
    } else {
      return 'unknown';
    }
  };
  
  // Helper for Paystack card number formatting
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };
  
  // Helper for Paystack expiry date formatting
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return value;
  };

  if (isLoadingProvider) {
    return <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2 mb-4">
        <Label htmlFor="paymentProvider" className="font-medium">Payment Provider</Label>
        <Select
          value={paymentProvider}
          onValueChange={(val) => setPaymentProvider(val as 'stripe' | 'paystack')}
        >
          <SelectTrigger id="paymentProvider">
            <SelectValue placeholder="Select payment provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stripe">
              <div className="flex items-center">
                <img src="/stripe-logo.svg" alt="Stripe" className="h-4 mr-2" />
                Stripe
              </div>
            </SelectItem>
            <SelectItem value="paystack">
              <div className="flex items-center">
                <img src="/paystack-logo.svg" alt="Paystack" className="h-4 mr-2" />
                Paystack
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {paymentProvider === 'stripe' ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="card-element" className="font-medium">Card Information</Label>
            <div className="mt-1 p-3 border rounded-md">
              <StyledCardElement 
                id="card-element"
                className="w-full"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <img src="/visa-logo.svg" alt="Visa" className="h-6" />
              <img src="/mastercard-logo.svg" alt="Mastercard" className="h-6" />
              <img src="/discover-logo.svg" alt="Discover" className="h-6" />
              <img src="/amex-logo.svg" alt="American Express" className="h-6" />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Your card details are secured with Stripe's encryption.
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3">
            <div>
              <Label htmlFor="cardNumber" className="font-medium">Card Number</Label>
              <Input
                id="cardNumber"
                type="text"
                placeholder="4444 4444 4444 4444"
                onChange={(e) => {
                  e.target.value = formatCardNumber(e.target.value);
                }}
                maxLength={19}
                className="mt-1"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiryDate" className="font-medium">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="text"
                  placeholder="MM/YY"
                  onChange={(e) => {
                    e.target.value = formatExpiryDate(e.target.value);
                  }}
                  maxLength={5}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="cvv" className="font-medium">CVV</Label>
                <Input
                  id="cvv"
                  type="text"
                  placeholder="123"
                  maxLength={4}
                  className="mt-1"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <img src="/visa-logo.svg" alt="Visa" className="h-6" />
              <img src="/mastercard-logo.svg" alt="Mastercard" className="h-6" />
              <img src="/discover-logo.svg" alt="Discover" className="h-6" />
              <img src="/verve-logo.svg" alt="Verve" className="h-6" />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Your card details are secured with Paystack's encryption.
            </div>
          </div>
        </>
      )}
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          {error}
        </div>
      )}
      
      <Button
        type="submit"
        className="w-full"
        disabled={submitting || (!stripe && paymentProvider === 'stripe')}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>Add Payment Method</>
        )}
      </Button>
    </form>
  );
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>("not_started");
  const [paymentBlocked, setPaymentBlocked] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{ status: string; message: string } | null>(null);

  // Profile settings
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [aboutBusiness, setAboutBusiness] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Privacy settings
  const [profileVisibility, setProfileVisibility] = useState("public");
  const [activityVisibility, setActivityVisibility] = useState("followers");

  // Payment settings
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Check for tab parameter in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const statusParam = params.get('status');

    // Only set active tab if it's a valid tab value
    if (tabParam && ["profile", "notifications", "privacy", "payments", "verification"].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    // Handle verification status from URL
    if (tabParam === 'verification' && statusParam) {
      if (statusParam === 'success') {
        setVerificationResult({
          status: 'success',
          message: 'Your verification information has been submitted successfully. We will process it shortly.'
        });

        // Show a toast notification
        toast({
          title: "Verification Submitted",
          description: "Your verification information has been submitted successfully.",
          variant: "default",
        });
      } else if (statusParam === 'error') {
        setVerificationResult({
          status: 'error',
          message: 'There was an issue with your verification. Please try again or contact support.'
        });

        // Show a toast notification
        toast({
          title: "Verification Error",
          description: "There was an issue with your verification process.",
          variant: "destructive",
        });
      }

      // Clean up the URL to remove the status parameter
      const newParams = new URLSearchParams(location.search);
      newParams.delete('status');
      navigate({
        pathname: location.pathname,
        search: newParams.toString()
      }, { replace: true });
    }
  }, [location.search, navigate, toast]);

  useEffect(() => {
    const initializeUserData = async () => {
      try {
        setLoading(true);
        
        // Get the authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error("Error getting authenticated user:", userError);
          navigate('/login');
          return;
        }
        
        // Set user ID
        setUserId(user.id);
        setEmail(user.email || "");
        
        // Fetch user profile data
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
          
        if (profileError) {
          console.error("Error fetching profile:", profileError);
          // Continue anyway to create profile if it doesn't exist
        }
        
        if (profileData) {
          // Set profile data to state
          setUserProfile(profileData);
          setUsername(profileData.username || "");
          setBio(profileData.bio || "");
          setAboutBusiness(profileData.about_business || "");
          setBusinessName(profileData.business_name || "");
          setKycStatus(profileData.kyc_status || "not_started");
          setEmailNotifications(profileData.email_notifications !== false);
          setPushNotifications(profileData.push_notifications !== false);
          setMarketingEmails(profileData.marketing_emails === true);
          setProfileVisibility(profileData.profile_visibility || "public");
          setActivityVisibility(profileData.activity_visibility || "followers");
          
          // Check if payment is blocked based on KYC status for business accounts only
          setPaymentBlocked(profileData.user_role === "business" && profileData.kyc_status !== "verified");
          
          // Check KYC status for business accounts
          if (profileData.user_role === 'business') {
            try {
              // Fetch KYC verification data
              const { data: kycData, error: kycError } = await supabase
                .from('kyc_verifications')
                .select('*')
                .eq('user_id', profileData.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
                
                if (kycError && kycError.code !== 'PGRST116') {
                  console.error("Error fetching KYC data:", kycError);
                } else if (kycData) {
                  setKycStatus(kycData.status);
                  // Store KYC data in profile state instead of separate variables
                  setUserProfile(prev => ({
                    ...prev,
                    kyc_provider: kycData.provider || 'sumsub',
                    kyc_reference_id: kycData.reference_id || ''
                  }));
                  setPaymentBlocked(kycData.status !== 'verified');
                }
            } catch (kycCheckError) {
              console.error("Error checking KYC status:", kycCheckError);
            }
          }
        } else {
          // Create a new profile if one doesn't exist
          const { data: newProfileData, error: createError } = await supabase
            .from("profiles")
            .insert([{
              id: user.id,
              user_role: "customer",
              email: user.email,
              username: user.email?.split('@')[0] || `user_${Math.floor(Math.random() * 10000)}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select();
            
          if (createError) {
            console.error("Error creating profile:", createError);
          } else if (newProfileData && newProfileData.length > 0) {
            setUserProfile(newProfileData[0]);
            setUsername(newProfileData[0].username || "");
          }
        }
        
        // Try to detect user's location
        await detectUserLocation(user.id);
        
        // Fetch payment methods
        fetchPaymentMethods();
      } catch (error) {
        console.error("Error initializing user data:", error);
        toast({
          title: "Error",
          description: "Failed to load your profile. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    initializeUserData();
  }, [navigate]);
  
  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.trim() === "" || username === userProfile?.username) {
      setUsernameAvailable(true);
      return;
    }

    setIsCheckingUsername(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username.toLowerCase())
        .not("id", "eq", userId)
        .maybeSingle();

      setUsernameAvailable(!data);
    } catch (error) {
      console.error("Error checking username:", error);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
    setUsername(value);
    checkUsernameAvailability(value);
  };

  const saveProfileSettings = async () => {
    if (!userId) return;

    // Username validation
    if (!username) {
      toast({
        title: "Username required",
        description: "Please enter a username for your profile.",
        variant: "destructive",
      });
      return;
    }

    if (!usernameAvailable) {
      toast({
        title: "Username not available",
        description: "Please choose a different username.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const updateData: any = {
        username,
        bio,
        about_business: aboutBusiness,
        updated_at: new Date().toISOString(),
      };

      // Only add business_name for business accounts
      if (userProfile?.user_role === "business") {
        updateData.business_name = businessName;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile settings have been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving profile settings:", error);
      toast({
        title: "Update failed",
        description: "There was an error saving your profile settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    if (!userId) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          email_notifications: emailNotifications,
          push_notifications: pushNotifications,
          marketing_emails: marketingEmails,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Notification settings updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast({
        title: "Update failed",
        description: "There was an error saving your notification settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const savePrivacySettings = async () => {
    if (!userId) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          profile_visibility: profileVisibility,
          activity_visibility: activityVisibility,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Privacy settings updated",
        description: "Your privacy preferences have been saved.",
      });
    } catch (error) {
      console.error("Error saving privacy settings:", error);
      toast({
        title: "Update failed",
        description: "There was an error saving your privacy settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleKYCStatusChange = (status: string) => {
    setKycStatus(status);
    // Update payment blocking based on KYC status
    setPaymentBlocked(status !== "verified");
  };

  const handleStartKYCVerification = async () => {
    setSaving(true);
    try {
      // Check if user is eligible for verification
      const isEligible = await KYCVerificationService.isEligibleForVerification(userId);
      if (!isEligible) {
        toast({
          title: "Not Eligible",
          description: "Business verification is only available for business accounts",
          variant: "destructive",
        });
        return;
      }

      // Test mode for local development
      if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_VERIFICATION === 'true') {
        setVerificationResult({
          status: 'success',
          message: 'TEST MODE: Setting your account to verified status (this only works in development)'
        });
        
        // Directly update the user's status
        if (userId) {
          await supabase
            .from('profiles')
            .update({
              kyc_status: 'verified',
              kyc_verified: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
            
          setKycStatus('verified');
          setPaymentBlocked(false);
          
          toast({
            title: "TEST MODE",
            description: "Your business has been verified in test mode.",
          });
        }
        
        setSaving(false);
        return;
      }
      
      const result = await KYCVerificationService.startVerification(userId);

      if (result.status === 'success' && result.url) {
        // Success case - open verification URL in a new tab
        setVerificationResult({
          status: 'success',
          message: result.message || 'Verification process started. You will be redirected to complete verification.'
        });

        // Open verification link in a new tab
        window.open(result.url, '_blank');

        // Poll for status updates
        setKycStatus('started');

        // Start polling for updates
        const statusInterval = setInterval(async () => {
          const status = await KYCVerificationService.checkVerificationStatus(userId);
          if (status !== 'started' && status !== 'not_started') {
            setKycStatus(status);
            clearInterval(statusInterval);
          }
        }, 10000); // Check every 10 seconds

        // Clear interval after 10 minutes to avoid indefinite polling
        setTimeout(() => {
          clearInterval(statusInterval);
        }, 10 * 60 * 1000);
      } else {
        // Error case
        setVerificationResult({
          status: 'error',
          message: result.message || 'An error occurred starting verification'
        });

        toast({
          title: "Verification Failed",
          description: result.message || 'Failed to start verification',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error starting KYC verification:', error);
      setVerificationResult({
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection error. Please try again later.'
      });

      // Show appropriate toast based on error type
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        toast({
          title: "Connection Error",
          description: 'Unable to connect to verification service. Please check your internet connection and try again.',
          variant: "destructive",
        });
      } else {
        toast({
          title: "Verification Error",
          description: 'Error starting verification: ' + (error instanceof Error ? error.message : 'Unknown error'),
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check if the file is an image
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image file is too large. Please select an image less than 5MB",
          variant: "destructive",
        });
        return;
      }

      setAvatarFile(file);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !userId) return;

    setSaving(true);

    try {
      // Upload to Supabase Storage
      const filePath = `profiles/${userId}/avatar/${Date.now()}-${avatarFile.name}`;
      const result = await uploadFileWithFallback(avatarFile, filePath);

      if (!result || typeof result.url !== 'string') {
        throw new Error("Failed to upload image");
      }

      // Update profile with new avatar URL
      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: result.url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      // Update local state
      setUserProfile({
        ...userProfile,
        avatar_url: result.url
      });

      setAvatarFile(null);

      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Upload Error",
        description: "Failed to update profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const fetchPaymentMethods = async () => {
    if (!userId) return;

    try {
      setPaymentMethodsLoading(true);

      // Try API endpoint first
      try {
        const response = await fetch(`/api/payment-methods?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setPaymentMethods(data);

          // Set default payment method
          const defaultMethod = data.find((method: PaymentMethod) => method.is_default);
          if (defaultMethod) {
            setDefaultPaymentMethod(defaultMethod.id);
          }
          return;
        }
      } catch (error) {
        console.warn("API call for payment methods failed, checking database:", error);
      }

      // Fallback: check database directly
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching payment methods:", error);
        toast({
          title: "Error",
          description: "Failed to load payment methods. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setPaymentMethods(data || []);

      // Set default payment method
      const defaultMethod = data?.find(method => method.is_default);
      if (defaultMethod) {
        setDefaultPaymentMethod(defaultMethod.id);
      }
    } catch (error) {
      console.error("Error in fetchPaymentMethods:", error);
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive",
      });
    } finally {
      setPaymentMethodsLoading(false);
    }
  };

  // Try to detect user's location
  const detectUserLocation = async (userId: string) => {
    try {
      // First try the API endpoint
      try {
        const locationResponse = await fetch(`/api/location-detect?userId=${userId}`);
        if (locationResponse.ok) {
          const locationData = await locationResponse.json();
          if (locationData.country_code) {
            console.log("Location detected:", locationData.country_code);
            return locationData.country_code;
          }
        }
      } catch (error) {
        console.warn("API location detection failed, using IP-based fallback:", error);
      }

      // Fallback to IP-based geolocation if available
      try {
        const geoResponse = await fetch('https://ipapi.co/json/');
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData.country_code) {
            console.log("IP-based location detected:", geoData.country_code);
            
            // Update the user's profile with the detected country code
            await supabase
              .from('profiles')
              .update({ country_code: geoData.country_code })
              .eq('id', userId);
              
            return geoData.country_code;
          }
        }
      } catch (geoError) {
        console.warn("IP-based location detection failed:", geoError);
      }
    } catch (locationError) {
      console.warn("All location detection methods failed:", locationError);
    }
    return null;
  };

  // Main layout loading placeholder
  if (loading) {
    return (
      <MainLayout activeTab="settings" setActiveTab={setActiveTab} userRole={userProfile?.user_role}>
        <div className="animate-pulse space-y-4 my-8">
          <div className="h-8 bg-gray-700/30 rounded w-1/3"></div>
          <div className="h-64 bg-gray-700/30 rounded"></div>
          <div className="h-32 bg-gray-700/30 rounded"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeTab="settings" setActiveTab={setActiveTab} userRole={userProfile?.user_role}>
      <div className="py-6">
        <h1 className="text-3xl font-bold mb-6">Account Settings</h1>

        <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-background border-b w-full justify-start rounded-none gap-4 h-auto p-0">
            <TabsTrigger value="profile" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">
              <Lock className="h-4 w-4 mr-2" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">
              <Wallet className="h-4 w-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="verification" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">
              <Shield className="h-4 w-4 mr-2" />
              Verification
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-medium">Profile Settings</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Avatar Upload */}
                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle>Profile Picture</CardTitle>
                      <CardDescription>Upload a profile picture to personalize your account.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                      <div className="my-4 relative">
                        <ProfileAvatar userProfile={userProfile} size={100} />
                      </div>
                      <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="avatar-upload">New Picture</Label>
                        <Input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarSelect}
                          disabled={saving}
                        />
                        {avatarFile && (
                          <Button
                            onClick={uploadAvatar}
                            className="w-full mt-2"
                            disabled={saving}
                          >
                            {saving ? "Uploading..." : "Upload Picture"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Account Type */}
                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle>Account Type</CardTitle>
                      <CardDescription>Choose the account type that best fits your needs on the platform.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <RadioGroup
                          value={userProfile?.user_role || "customer"}
                          onValueChange={(value) => {
                            setUserProfile(prev => ({ ...prev, user_role: value }));
                            setIsDirty(true);
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="customer" id="customer" />
                            <Label htmlFor="customer" className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <div>
                                <span className="font-medium">Customer Account</span>
                                <p className="text-sm text-muted-foreground">For individuals looking to use the platform's services</p>
                              </div>
                            </Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="business" id="business" />
                            <Label htmlFor="business" className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              <div>
                                <span className="font-medium">Business Account</span>
                                <p className="text-sm text-muted-foreground">For businesses offering services on the platform</p>
                              </div>
                            </Label>
                          </div>
                        </RadioGroup>

                        {userProfile?.user_role === "business" && !userProfile?.kyc_verified && (
                          <Alert className="mt-4">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Verification Required</AlertTitle>
                            <AlertDescription>
                              Business accounts require verification before you can offer services.
                              Please complete verification in the Verification tab.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your personal information and profile details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {userProfile?.user_role === "business" && (
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input
                          id="businessName"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Your business name"
                        />
                        <p className="text-xs text-muted-foreground">
                          This name will be displayed on your business profile
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <div className="relative">
                          <Input
                            id="username"
                            value={username}
                            onChange={handleUsernameChange}
                            className={`${!usernameAvailable ? "border-red-500 focus:ring-red-500" : ""}`}
                            placeholder="Your unique username"
                          />
                          {isCheckingUsername && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="animate-spin h-4 w-4 border-2 border-primary border-opacity-50 border-t-primary rounded-full"></div>
                            </div>
                          )}
                        </div>
                        {!usernameAvailable && (
                          <p className="text-sm text-red-500">This username is already taken</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={email}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Contact support to change your email address
                        </p>
                      </div>
                    </div>


                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself"
                        className="min-h-[100px]"
                      />
                    </div>

                    {userProfile?.user_role === "business" && (
                      <div className="space-y-2">
                        <Label htmlFor="aboutBusiness">About Business</Label>
                        <Textarea
                          id="aboutBusiness"
                          value={aboutBusiness}
                          onChange={(e) => setAboutBusiness(e.target.value)}
                          placeholder="Tell us about your business"
                          className="min-h-[100px]"
                        />
                      </div>
                    )}


                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2">
                    <Button
                      type="submit"
                      onClick={saveProfileSettings}
                      disabled={saving || !usernameAvailable}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Account Actions</CardTitle>
                    <CardDescription>
                      Manage your account settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      variant="destructive"
                      className="w-full sm:w-auto"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Manage how you receive notifications and updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications about messages and bookings via email
                      </p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="pushNotifications">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications on your device
                      </p>
                    </div>
                    <Switch
                      id="pushNotifications"
                      checked={pushNotifications}
                      onCheckedChange={setPushNotifications}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="marketingEmails">Marketing Emails</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive promotional content and special offers
                      </p>
                    </div>
                    <Switch
                      id="marketingEmails"
                      checked={marketingEmails}
                      onCheckedChange={setMarketingEmails}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={saveNotificationSettings}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Preferences"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Control who can see your profile and activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profileVisibility">Profile Visibility</Label>
                    <Select
                      value={profileVisibility}
                      onValueChange={setProfileVisibility}
                    >
                      <SelectTrigger id="profileVisibility">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public (Everyone can see)</SelectItem>
                        <SelectItem value="private">Private (Only you)</SelectItem>
                        <SelectItem value="followers">Followers Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Choose who can see your full profile information
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="activityVisibility">Activity Visibility</Label>
                    <Select
                      value={activityVisibility}
                      onValueChange={setActivityVisibility}
                    >
                      <SelectTrigger id="activityVisibility">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public (Everyone can see)</SelectItem>
                        <SelectItem value="private">Private (Only you)</SelectItem>
                        <SelectItem value="followers">Followers Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Choose who can see your activity on the platform
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={savePrivacySettings}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Privacy Settings"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Settings</CardTitle>
                <CardDescription>
                  Manage your payment methods and transactions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {paymentBlocked && userProfile?.user_role === "business" ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Business Verification Required</AlertTitle>
                    <AlertDescription>
                      Business accounts need to complete verification before offering paid services.
                      Please go to the Verification tab to submit your documents.
                    </AlertDescription>
                    <Button
                      className="mt-2"
                      variant="outline"
                      onClick={() => setActiveTab("verification")}
                    >
                      Go to Verification
                    </Button>
                  </Alert>
                ) : (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Payment Methods</h3>

                      {paymentMethodsLoading ? (
                        <div className="text-center p-6 border rounded-lg flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <p>Loading payment methods...</p>
                        </div>
                      ) : paymentMethods.length > 0 ? (
                        <div className="space-y-2">
                          {paymentMethods.map((method) => (
                            <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center">
                                <CreditCard className="h-5 w-5 mr-2" />
                                <div>
                                  <p className="font-medium">{method.card_brand} •••• {method.card_last4}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Expires {method.card_exp_month}/{method.card_exp_year}
                                    {method.provider && (
                                      <span className="ml-2 inline-flex">
                                        via <Badge variant="outline" className="ml-1 capitalize">{method.provider}</Badge>
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                {method.is_default && (
                                  <Badge variant="outline">Default</Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabase
                                        .from("payment_methods")
                                        .delete()
                                        .eq("id", method.id);

                                      if (error) throw error;

                                      setPaymentMethods(prev => prev.filter(m => m.id !== method.id));

                                      toast({
                                        title: "Payment method removed",
                                        description: "Your payment method has been removed successfully.",
                                      });
                                    } catch (error) {
                                      console.error("Error removing payment method:", error);
                                      toast({
                                        title: "Error",
                                        description: "Failed to remove payment method",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  Remove
                                </Button>
                                {!method.is_default && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        // Set all payment methods to non-default
                                        const { error: resetError } = await supabase
                                          .from("payment_methods")
                                          .update({ is_default: false })
                                          .eq("user_id", userId);

                                        if (resetError) throw resetError;

                                        // Set this one as default
                                        const { error: updateError } = await supabase
                                          .from("payment_methods")
                                          .update({ is_default: true })
                                          .eq("id", method.id);

                                        if (updateError) throw updateError;

                                        // Update local state
                                        setPaymentMethods(prev => prev.map(m => ({
                                          ...m,
                                          is_default: m.id === method.id
                                        })));

                                        // Update default payment method
                                        setDefaultPaymentMethod(method.id);

                                        toast({
                                          title: "Default payment method updated",
                                          description: "Your default payment method has been updated.",
                                        });
                                      } catch (error) {
                                        console.error("Error setting default payment method:", error);
                                        toast({
                                          title: "Error",
                                          description: "Failed to update default payment method",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                  >
                                    Set as Default
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-6 border rounded-lg">
                          <p className="text-muted-foreground mb-4">No payment methods added yet</p>
                        </div>
                      )}

                      <div className="mt-6 p-6 border rounded-lg">
                        <h4 className="text-base font-medium mb-4">Add a New Payment Method</h4>
                        <StripeWrapper>
                          <PaymentForm
                            onSuccess={() => {
                              // Reload payment methods
                              fetchPaymentMethods();
                              toast({
                                title: "Payment method added",
                                description: "Your payment method has been added successfully.",
                              });
                            }}
                            userId={userId || ''}
                          />
                        </StripeWrapper>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Transaction History</h3>
                      <div className="text-center p-6 border rounded-lg">
                        <p className="text-muted-foreground">No transactions found</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verification" className="space-y-6">
            <div className="flex-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Business Verification
                  </CardTitle>
                  <CardDescription>
                    {userProfile?.user_role === "business"
                      ? "Complete business verification to unlock full marketplace features and provide services to customers. This helps maintain a safe and trusted marketplace."
                      : "Business verification is only required for business accounts offering services on the platform."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Account Type Alert */}
                  {userProfile?.user_role !== "business" && (
                    <Alert>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Standard Account</AlertTitle>
                      </div>
                      <AlertDescription>
                        You have a standard account. Verification is only required for business accounts.
                        If you wish to offer services on the platform, you can upgrade to a business account in the Profile tab.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Verification Result Messages */}
                  {verificationResult && (
                    <Alert variant={verificationResult.status === 'success' ? "default" : "destructive"}
                      className={verificationResult.status === 'success' ? "bg-green-900 border-green-200" : ""}
                    >
                      <div className="flex items-center gap-2">
                        {verificationResult.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        <AlertTitle>
                          {verificationResult.status === 'success' ? "Verification Submitted" : "Verification Error"}
                        </AlertTitle>
                      </div>
                      <AlertDescription>
                        {verificationResult.message}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* KYC Status Section */}
                  <div className="rounded-md border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">Verification Status</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {userProfile?.kyc_verified
                            ? "Your business has been successfully verified."
                            : userProfile?.user_role === "business"
                              ? "Your business verification is pending or incomplete."
                              : "Not applicable for standard accounts."}
                        </p>
                      </div>

                      <div>
                        {userProfile?.kyc_verified ? (
                          <div className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                            <CheckCircle className="h-4 w-4" />
                            <span>Verified</span>
                          </div>
                        ) : userProfile?.user_role !== "business" ? (
                          <div className="flex items-center gap-1 bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>Not Required</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Not Verified</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status details if available */}
                  {userProfile?.user_role === "business" && (
                    <>
                      {kycStatus === 'started' || kycStatus === 'pending' ? (
                        <Alert className="bg-blue-900 border-blue-200">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-blue-600" />
                            <AlertTitle>Verification In Progress</AlertTitle>
                          </div>
                          <AlertDescription>
                            Your business verification is being processed. This usually takes 1-3 business days.
                            You'll receive a notification when it's complete.
                          </AlertDescription>
                        </Alert>
                      ) : kycStatus === 'rejected' ? (
                        <Alert variant="destructive">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Verification Rejected</AlertTitle>
                          </div>
                          <AlertDescription>
                            {userProfile?.kyc_rejection_reason ||
                              "Your verification was rejected. Please ensure your business documents are clear and valid, then try again. Contact support if you need assistance."}
                          </AlertDescription>
                        </Alert>
                      ) : null}
                    </>
                  )}

                  {/* Verification Benefits */}
                  <div>
                    <h3 className="font-medium mb-2">Benefits of Business Verification</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Offer services in the marketplace</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Receive payments from customers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Build trust with verified status badge</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Access to advanced business tools and analytics</span>
                      </li>
                    </ul>
                  </div>

                  {/* Verification Provider Info */}
                  <div className="rounded-md border p-4 bg-muted/50">
                    <h3 className="font-medium mb-2">Verification Information</h3>
                    <p className="text-sm text-muted-foreground">
                      We use Sumsub for secure, compliant business verification. Verification typically takes 1-2 business days 
                      after document submission. Your information is encrypted and securely stored.
                    </p>
                    <div className="flex items-center mt-2">
                      <ExternalLink className="h-4 w-4 mr-1 text-muted-foreground" />
                      <a 
                        href="https://sumsub.com/document-verification/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Learn more about Sumsub verification
                      </a>
                    </div>
                  </div>

                  {/* Start Verification Button */}
                  {userProfile?.user_role === "business" && !userProfile?.kyc_verified && kycStatus !== 'pending' && (
                    <Button
                      onClick={handleStartKYCVerification}
                      disabled={saving}
                      className="w-full"
                    >
                      {saving ? (
                        <>Loading...</>
                      ) : (
                        <>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Start Business Verification
                        </>
                      )}
                    </Button>
                  )}

                  {/* For regular users - account upgrade button */}
                  {userProfile?.user_role !== "business" && (
                    <Button
                      onClick={() => setActiveTab("profile")} // Direct to profile tab where they can upgrade
                      variant="outline"
                      className="w-full"
                    >
                      Upgrade to Business Account
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
} 