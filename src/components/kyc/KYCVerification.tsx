import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle2, Clock, ShieldCheck, Upload } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { KYCVerificationService } from '@/utils/kyc-verification-service';
import { PaymentProvider, PaymentProviderService } from '@/utils/payment-provider-service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-react';

interface KYCVerificationProps {
  userId: string;
  userRole: "business" | "customer" | null;
  onVerificationStatusChange?: (status: string) => void;
}

export function KYCVerification({ userId, userRole, onVerificationStatusChange }: KYCVerificationProps) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [documentType, setDocumentType] = useState<string>("id_card");
  const [documentFrontUrl, setDocumentFrontUrl] = useState<string | null>(null);
  const [documentBackUrl, setDocumentBackUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState("");
  const [businessDocumentUrl, setBusinessDocumentUrl] = useState<string | null>(null);
  const [taxIdNumber, setTaxIdNumber] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<string>("not_started");
  const [kycData, setKycData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [provider, setProvider] = useState<PaymentProvider | null>(null);
  const [providerName, setProviderName] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [isTaxIdVerified, setIsTaxIdVerified] = useState<boolean>(false);
  const [bankAccount, setBankAccount] = useState({
    accountHolderName: '',
    accountNumber: '',
    routingNumber: '',
    bankCode: '',
    country: '',
    currency: ''
  });
  const [isBankVerified, setIsBankVerified] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("business");

  useEffect(() => {
    if (user) {
      fetchKYCData();
      determineProvider();
    }
  }, [user]);

  useEffect(() => {
    if (onVerificationStatusChange) {
      onVerificationStatusChange(verificationStatus);
    }
  }, [verificationStatus, onVerificationStatusChange]);

  const determineProvider = async () => {
    if (!user?.id) return;
    
    try {
      const provider = await PaymentProviderService.determineAndSaveUserProvider(user.id);
      setProvider(provider);
      setProviderName(provider === PaymentProvider.STRIPE ? 'Stripe' : 'Paystack');
    } catch (error) {
      console.error('Failed to determine provider:', error);
      setProvider(PaymentProvider.STRIPE);
      setProviderName('Stripe');
    }
  };

  const fetchKYCData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      const status = await KYCVerificationService.checkVerificationStatus(user.id);
      setVerificationStatus(status);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          kyc_status, 
          kyc_verified, 
          kyc_rejection_reason, 
          kyc_provider, 
          tax_id, 
          tax_id_verified,
          bank_account_verified, 
          bank_account_provider
        `)
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      if (data.kyc_provider) {
        setProvider(data.kyc_provider as PaymentProvider);
        setProviderName(data.kyc_provider === PaymentProvider.STRIPE ? 'Stripe' : 'Paystack');
      }
      
      if (data.kyc_rejection_reason) {
        setRejectionReason(data.kyc_rejection_reason);
      }
      
      if (data.tax_id) {
        setTaxIdNumber(data.tax_id);
        setIsTaxIdVerified(data.tax_id_verified || false);
      }
      
      setIsBankVerified(data.bank_account_verified || false);
      
    } catch (error) {
      console.error('Error fetching KYC data:', error);
      toast.error('Failed to load verification data');
    } finally {
      setLoading(false);
    }
  };

  const handleRedirect = (url: string) => {
    if (!url) {
      toast({
        title: "Verification Error",
        description: "No verification URL provided. Please try again later.",
        variant: "destructive"
      });
      return;
    }
    
    if (url.includes('dashboard.stripe.com') || url.includes('dashboard.paystack.co')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    
    window.location.href = url;
  };

  const startVerification = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const result = await KYCVerificationService.startVerification(user.id);
      
      if (result.status === 'success' && result.url) {
        toast({
          title: "Verification Started",
          description: "You'll be redirected to complete your verification."
        });
        
        setTimeout(() => {
          handleRedirect(result.url!);
        }, 1500);
      } else {
        toast({
          title: "Verification Error",
          description: result.message || "Failed to start verification process.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error starting verification:", error);
      toast({
        title: "Verification Error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const retryVerification = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const result = await KYCVerificationService.retryVerification(user.id);
      
      if (result.status === 'success' && result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error retrying verification:', error);
      toast.error('Failed to restart verification process');
    } finally {
      setLoading(false);
    }
  };

  const verifyTaxId = async () => {
    if (!user?.id || !taxIdNumber) {
      toast.error('Please enter a valid Tax ID');
      return;
    }
    
    try {
      setLoading(true);
      const result = await KYCVerificationService.verifyTaxId(user.id, taxIdNumber);
      
      if (result.status === 'success') {
        toast.success(result.message);
        setIsTaxIdVerified(true);
        fetchKYCData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error verifying tax ID:', error);
      toast.error('Failed to verify tax ID');
    } finally {
      setLoading(false);
    }
  };

  const verifyBankAccount = async () => {
    if (!user?.id) return;
    
    if (provider === PaymentProvider.STRIPE) {
      if (!bankAccount.accountHolderName || !bankAccount.accountNumber || !bankAccount.routingNumber) {
        toast.error('Please fill in all required bank account fields');
        return;
      }
    } else {
      if (!bankAccount.accountNumber || !bankAccount.bankCode) {
        toast.error('Please fill in all required bank account fields');
        return;
      }
    }
    
    try {
      setLoading(true);
      const result = await KYCVerificationService.verifyBankAccount(user.id, bankAccount);
      
      if (result.status === 'success') {
        toast.success(result.message);
        setIsBankVerified(true);
        fetchKYCData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error verifying bank account:', error);
      toast.error('Failed to verify bank account');
    } finally {
      setLoading(false);
    }
  };

  const handleBankAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBankAccount(prev => ({ ...prev, [name]: value }));
  };

  const renderVerificationStatus = () => {
    switch (verificationStatus) {
      case "verified":
        return (
          <Alert className="bg-green-500/10 border-green-500/50 text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Verification Complete</AlertTitle>
            <AlertDescription>
              Your identity has been verified. You now have full access to all platform features.
            </AlertDescription>
          </Alert>
        );
      case "pending":
        return (
          <Alert className="bg-yellow-500/10 border-yellow-500/50 text-yellow-500">
            <Clock className="h-4 w-4" />
            <AlertTitle>Verification in Progress</AlertTitle>
            <AlertDescription>
              Your documents are being reviewed. This typically takes 1-3 business days.
            </AlertDescription>
          </Alert>
        );
      case "rejected":
        return (
          <Alert className="bg-red-500/10 border-red-500/50 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Verification Failed</AlertTitle>
            <AlertDescription>
              {rejectionReason || "There was an issue with your submitted documents. Please review and resubmit."}
            </AlertDescription>
          </Alert>
        );
      default:
        return (
          <Alert className="bg-blue-500/10 border-blue-500/50 text-blue-500">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Verification Required</AlertTitle>
            <AlertDescription>
              Complete the verification process to unlock all platform features including payments.
            </AlertDescription>
          </Alert>
        );
    }
  };

  const isFormDisabled = verificationStatus === "verified" || verificationStatus === "pending";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Business Verification</h2>
        {renderVerificationStatus()}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Verification Status</CardTitle>
          <CardDescription>
            Verify your business to enable payment processing and build trust with your customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {verificationStatus === 'verified' ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span className="font-medium">Your business is verified!</span>
                </div>
                <p className="text-green-700 mt-2">
                  Your business has been successfully verified. You now have full access to all platform features.
                </p>
              </div>
            ) : verificationStatus === 'rejected' ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircleIcon className="h-5 w-5" />
                  <span className="font-medium">Verification failed</span>
                </div>
                <p className="text-red-700 mt-2">
                  Your verification was unsuccessful. Reason: {rejectionReason || 'Verification requirements not met'}
                </p>
                <Button 
                  onClick={retryVerification} 
                  disabled={loading} 
                  className="mt-3"
                >
                  Retry Verification
                </Button>
              </div>
            ) : verificationStatus === 'started' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <div className="flex items-center gap-2 text-amber-700">
                  <ClockIcon className="h-5 w-5" />
                  <span className="font-medium">Verification in progress</span>
                </div>
                <p className="text-amber-700 mt-2">
                  Your verification is being processed. This may take 1-3 business days.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p>
                  To protect our marketplace and ensure trust, we require all business accounts to complete verification.
                  This process helps confirm your business identity and enables payment processing.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-blue-700">
                    <span className="font-medium">Verification provider: </span> 
                    {providerName || 'Loading...'}
                  </p>
                  
                  {provider && (
                    <p className="text-blue-700 mt-1 text-sm">
                      Based on your location, we'll use {providerName} for verification services
                    </p>
                  )}
                </div>
                
                <Button
                  onClick={startVerification}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Please wait...' : 'Start Business Verification'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {verificationStatus === 'verified' && (
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="business">Business Details</TabsTrigger>
            <TabsTrigger value="bank">Banking & Tax</TabsTrigger>
          </TabsList>
          
          <TabsContent value="business" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Your verified business details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Verification Status:</span>
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircleIcon className="h-4 w-4" /> Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Verification Provider:</span>
                    <span>{providerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Verification Date:</span>
                    <span>
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="bank" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tax Information</CardTitle>
                <CardDescription>Verify your business tax ID</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Tax ID Verification:</span>
                    {isTaxIdVerified ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircleIcon className="h-4 w-4" /> Verified
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" /> Not Verified
                      </span>
                    )}
                  </div>
                  
                  {!isTaxIdVerified && (
                    <div className="space-y-3">
                      <div className="grid gap-2">
                        <Label htmlFor="taxId">
                          {provider === PaymentProvider.STRIPE ? 'Tax ID / EIN' : 'VAT / TIN Number'}
                        </Label>
                        <Input
                          id="taxId"
                          placeholder={provider === PaymentProvider.STRIPE ? "Enter 9-digit Tax ID or EIN" : "Enter VAT/TIN Number"}
                          value={taxIdNumber}
                          onChange={(e) => setTaxIdNumber(e.target.value)}
                        />
                      </div>
                      <Button onClick={verifyTaxId} disabled={loading}>
                        Verify Tax ID
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Bank Account Verification</CardTitle>
                <CardDescription>Verify your business bank account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Bank Account Verification:</span>
                    {isBankVerified ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircleIcon className="h-4 w-4" /> Verified
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" /> Not Verified
                      </span>
                    )}
                  </div>
                  
                  {!isBankVerified && (
                    <div className="space-y-3">
                      {provider === PaymentProvider.STRIPE ? (
                        <>
                          <div className="grid gap-2">
                            <Label htmlFor="accountHolderName">Account Holder Name</Label>
                            <Input
                              id="accountHolderName"
                              name="accountHolderName"
                              placeholder="Business or account holder name"
                              value={bankAccount.accountHolderName}
                              onChange={handleBankAccountChange}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="accountNumber">Account Number</Label>
                            <Input
                              id="accountNumber"
                              name="accountNumber"
                              placeholder="Enter account number"
                              value={bankAccount.accountNumber}
                              onChange={handleBankAccountChange}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="routingNumber">Routing Number</Label>
                            <Input
                              id="routingNumber"
                              name="routingNumber"
                              placeholder="Enter routing number"
                              value={bankAccount.routingNumber}
                              onChange={handleBankAccountChange}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                              <Label htmlFor="country">Country</Label>
                              <Input
                                id="country"
                                name="country"
                                placeholder="US"
                                value={bankAccount.country}
                                onChange={handleBankAccountChange}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="currency">Currency</Label>
                              <Input
                                id="currency"
                                name="currency"
                                placeholder="USD"
                                value={bankAccount.currency}
                                onChange={handleBankAccountChange}
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid gap-2">
                            <Label htmlFor="accountNumber">Account Number</Label>
                            <Input
                              id="accountNumber"
                              name="accountNumber"
                              placeholder="Enter 10-digit account number"
                              value={bankAccount.accountNumber}
                              onChange={handleBankAccountChange}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="bankCode">Bank Code</Label>
                            <Input
                              id="bankCode"
                              name="bankCode"
                              placeholder="Enter bank code (e.g., 058)"
                              value={bankAccount.bankCode}
                              onChange={handleBankAccountChange}
                            />
                          </div>
                        </>
                      )}
                      <Button onClick={verifyBankAccount} disabled={loading}>
                        Verify Bank Account
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 