import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Loader2, 
  Shield, 
  CheckCircle, 
  CreditCard, 
  Calendar, 
  Clock,
  Lock, 
  Info, 
  ArrowLeft,
  DollarSign
} from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/components/ui/use-toast";
import { EscrowService } from "@/utils/escrow-service";
import { Separator } from "@/components/ui/separator";

// Stripe checkout URL - replace with your actual endpoint in production
const STRIPE_CHECKOUT_URL = "/api/create-checkout-session";

export default function PaymentPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [escrowPayment, setEscrowPayment] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Payments");

  // Add a useEffect to track when the user data is loaded
  useEffect(() => {
    if (user) {
      setAuthLoading(false);
    }
  }, [user]);

  // Check for payment success from Stripe redirect
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const paymentStatus = query.get('payment_status');
    
    if (paymentStatus === 'success' && booking) {
      handlePaymentSuccess();
    }
  }, [location.search, booking]);

  // Handle successful Stripe payment
  const handlePaymentSuccess = async () => {
    if (!user || !booking || !service) {
      return;
    }
    
    setProcessingPayment(true);
    
    try {
      let paymentId;
      
      // Check if payment record already exists
      if (escrowPayment) {
        paymentId = escrowPayment.id;
        
        // Process the existing payment record
        const success = await EscrowService.processPayment(paymentId);
        if (!success) {
          throw new Error("Failed to process payment");
        }
      } else {
        // Create a new escrow payment
        const payment = await EscrowService.createPayment(
          booking.id,
          service.price,
          user.id,
          booking.provider_id,
          service.id
        );
        
        if (!payment) {
          throw new Error("Failed to create payment");
        }
        
        paymentId = payment.id;
        setEscrowPayment(payment);
      }
      
      // Update booking status to pending (awaiting provider confirmation)
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          status: "pending",
          payment_status: "completed",
        })
        .eq("id", booking.id);
      
      if (updateError) {
        console.error("Error updating booking status:", updateError);
        toast({
          title: "Warning",
          description: "Payment processed but booking status update failed. Please contact support.",
          variant: "destructive",
        });
      }
      
      // Create a notification for the service provider
      try {
        await supabase.from("notifications").insert({
          user_id: booking.provider_id, // Send to service provider
          type: "booking",
          title: "New Booking Payment",
          message: `A customer has paid for their booking for ${service.title}`,
          is_read: false,
          data: JSON.stringify({
            booking_id: booking.id,
            service_id: service.id,
            service_title: service.title,
          }),
        });
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
        // Continue even if notification fails
      }
      
      // Show success state
      setPaymentComplete(true);
      
      toast({
        title: "Payment successful",
        description: "Your payment has been processed and is in escrow",
      });
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Payment failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  // Redirect to Stripe checkout
  const redirectToStripeCheckout = () => {
    if (!user || !booking || !service) {
      toast({
        title: "Missing information",
        description: "Required information is missing. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setProcessingPayment(true);

    // In a real implementation, this would make a request to your backend to create a Stripe checkout session
    // For now we'll just simulate the process
    setTimeout(() => {
      // This should be replaced with an actual API call in production
      const checkoutParams = new URLSearchParams({
        booking_id: booking.id,
        service_id: service.id,
        customer_id: user.id,
        provider_id: booking.provider_id,
        amount: calculateAmounts().total.toString(),
        success_url: `${window.location.origin}/payment/${booking.id}?payment_status=success`,
        cancel_url: `${window.location.origin}/payment/${booking.id}?payment_status=canceled`
      });

      // Redirect to the sample Stripe checkout page
      // In production, replace with actual redirection to Stripe
      window.location.href = `${STRIPE_CHECKOUT_URL}?${checkoutParams.toString()}`;
    }, 500);
  };

  // Load booking details
  useEffect(() => {
    // Don't do anything until we know if the user is authenticated
    if (authLoading) {
      return;
    }
    
    if (!bookingId || !user) {
      toast({
        title: "Authentication required",
        description: "Please log in to complete your payment",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    async function fetchBookingData() {
      try {
        setLoading(true);
        
        // Check if user is a business account
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('user_role')
          .eq('id', user.id)
          .single();
          
        if (!userError && userData?.user_role === "business") {
          toast({
            title: "Access Denied",
            description: "Business accounts cannot make bookings or payments for services. Please use a customer account.",
            variant: "destructive",
          });
          navigate("/profile");
          return;
        }
        
        // First check if the booking exists and belongs to the user
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select(`
            *,
            provider:profiles!provider_id(
              id,
              username,
              avatar_url,
              business_name
            ),
            escrow_payments(*)
          `)
          .eq("id", bookingId);
        
        if (bookingError) {
          console.error("Error fetching booking:", bookingError);
          toast({
            title: "Error",
            description: "Could not load booking details. Please try again.",
            variant: "destructive",
          });
          navigate("/bookings");
          return;
        }
        
        if (!bookingData || bookingData.length === 0) {
          toast({
            title: "Booking not found",
            description: "The booking you're trying to pay for could not be found",
            variant: "destructive",
          });
          navigate("/bookings");
          return;
        }
        
        const bookingEntry = bookingData[0];
        
        // Check if the booking belongs to the current user
        if (bookingEntry.customer_id !== user.id) {
          toast({
            title: "Access Denied",
            description: "You do not have permission to access this booking",
            variant: "destructive",
          });
          navigate("/bookings");
          return;
        }
        
        setBooking(bookingEntry);
        
        // Check if payment already exists
        if (bookingEntry.escrow_payments && bookingEntry.escrow_payments.length > 0) {
          setEscrowPayment(bookingEntry.escrow_payments[0]);
          
          // If payment is already completed or processed, show completed state
          if (
            bookingEntry.escrow_payments[0].status === "completed" ||
            bookingEntry.escrow_payments[0].status === "released" ||
            bookingEntry.payment_status === "completed"
          ) {
            setPaymentComplete(true);
          }
        }
        
        // Fetch service details
        const { data: serviceData, error: serviceError } = await supabase
          .from("services")
          .select("*")
          .eq("id", bookingEntry.service_id)
          .single();
        
        if (serviceError) {
          console.error("Error fetching service:", serviceError);
          toast({
            title: "Error",
            description: "Could not load service details. Please try again.",
            variant: "destructive",
          });
          // Don't redirect - still show payment page with the booking details we have
        } else {
          setService(serviceData);
        }
        
        setProvider(bookingEntry.provider);
      } catch (error) {
        console.error("Error fetching booking data:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
        // Don't immediately redirect - let the user decide
      } finally {
        setLoading(false);
      }
    }
    
    fetchBookingData();
  }, [bookingId, user, navigate, toast, authLoading]);

  // Extract booking details from notes
  const extractBookingDetails = (notes: string) => {
    if (!notes) return { date: null, time: null, location: null };

    const dateMatch = notes.match(/Date: (.+?)\n/);
    const timeMatch = notes.match(/Time: (.+?)\n/);
    const locationMatch = notes.match(/Location: (.+?)(?:\n|$)/);

    return {
      date: dateMatch ? dateMatch[1] : null,
      time: timeMatch ? timeMatch[1] : null,
      location: locationMatch ? locationMatch[1] : null
    };
  };

  // Calculate amounts
  const calculateAmounts = () => {
    if (!service) return { subtotal: 0, fee: 0, total: 0 };
    
    const subtotal = service.price;
    const fee = EscrowService.calculatePlatformFee(subtotal);
    const total = EscrowService.calculateTotalAmount(subtotal);
    
    return { subtotal, fee, total };
  };

  // Replace the payment form with a simpler card that has a "Pay with Stripe" button
  const renderPaymentForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Complete Payment</CardTitle>
        <CardDescription>
          Secure payment processing with escrow protection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-blue-900 border-blue-200">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertTitle>Protected by Escrow</AlertTitle>
          <AlertDescription>
            Your payment will be held securely until the service is completed. If the service provider cancels or there are disputes, 
            your money will be refunded immediately.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <div className="pt-4">
            <Button 
              className="w-full" 
              disabled={processingPayment}
              onClick={redirectToStripeCheckout}
            >
              {processingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting to Stripe...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay ${calculateAmounts().total.toFixed(2)} with Stripe
                </>
              )}
            </Button>
          </div>
          
          <div className="flex items-center justify-center text-xs text-muted-foreground gap-1">
            <Lock className="h-3 w-3" />
            Secure Payment Processing with Stripe
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (authLoading || loading) {
    return (
      <MainLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        <div className="container py-10">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin" />
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-1">Loading Payment Details</h2>
              <p className="text-muted-foreground">Please wait while we prepare your payment...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // If payment is complete, show success screen
  if (paymentComplete) {
    return (
      <MainLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        <div className="container max-w-4xl py-10">
          <div className="flex flex-col items-center text-center px-4 py-10">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground mb-6 max-w-md">
              Your payment of ${calculateAmounts().total} has been processed and is securely held in escrow until the service is completed.
            </p>
            
            <Card className="w-full max-w-md mb-6">
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Service Fee</span>
                  <span>${calculateAmounts().subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee (8%)</span>
                  <span>${calculateAmounts().fee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${calculateAmounts().total.toFixed(2)}</span>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/20 flex flex-col items-start p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Protected by Escrow</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your payment is held securely until the service is completed. If there are any issues, 
                  our team will help resolve them.
                </p>
              </CardFooter>
            </Card>
            
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" onClick={() => navigate("/bookings")}>
                View My Bookings
              </Button>
              <Button onClick={() => navigate(`/messages?user=${booking.provider_id}`)}>
                Message Service Provider
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="container max-w-4xl py-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        
        <h1 className="text-2xl font-bold mb-2">Complete Your Booking</h1>
        <p className="text-muted-foreground mb-8">
          Your payment will be securely held in escrow until the service is completed
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Payment Form Column */}
          <div className="md:col-span-2 space-y-6">
            {renderPaymentForm()}
            
            <Card>
              <CardHeader>
                <CardTitle>Important Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">About Escrow Payments</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    When you pay for a service, your money is held in escrow until the service is completed. 
                    This ensures that service providers only get paid for completed work, and you're protected if anything goes wrong.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">What Happens Next?</span>
                  </div>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-4">
                    <li>Service provider reviews and confirms your booking</li>
                    <li>You'll receive confirmation and can coordinate details via messaging</li>
                    <li>Once the service is completed, confirm completion to release payment</li>
                    <li>If there are any issues, our team can help resolve disputes</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Order Summary Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/20">
                  <h3 className="font-medium mb-2">{service?.title}</h3>
                  
                  {booking?.notes && (
                    <div className="space-y-2 mb-4">
                      {extractBookingDetails(booking.notes).date && (
                        <div className="text-sm flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>{extractBookingDetails(booking.notes).date}</span>
                        </div>
                      )}
                      
                      {extractBookingDetails(booking.notes).time && (
                        <div className="text-sm flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{extractBookingDetails(booking.notes).time}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2 border-t pt-2 mt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Service provider:</span>
                      <span>{provider?.business_name || provider?.username}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Service Fee</span>
                    <span>${calculateAmounts().subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Fee (8%)</span>
                    <span>${calculateAmounts().fee.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>${calculateAmounts().total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Escrow Protection</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your payment is held securely until you confirm the service has been completed successfully.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 