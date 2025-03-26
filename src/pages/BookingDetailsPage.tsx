import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MainLayout } from "@/layouts/MainLayout";
import { EscrowService } from "@/utils/escrow-service";
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  User,
  MessageSquare,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  CreditCard
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { CustomerConfirmationModal } from "@/components/services/CustomerConfirmationModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function BookingDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [makingPayment, setMakingPayment] = useState(false);

  useEffect(() => {
    fetchBookingDetails();
  }, [id]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          services(*),
          provider:profiles!provider_id(
            id,
            username,
            avatar_url,
            kyc_verified
          ),
          customer:profiles!customer_id(
            id,
            username,
            avatar_url,
            kyc_verified
          ),
          escrow_payments(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      
      if (!data) {
        toast({
          title: "Error",
          description: "Booking not found",
          variant: "destructive",
        });
        navigate("/bookings");
        return;
      }

      setBooking(data);
    } catch (error) {
      console.error("Error fetching booking details:", error);
      toast({
        title: "Error",
        description: "Failed to load booking details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id);

      if (error) throw error;

      // Refund the payment if applicable
      if (booking.escrow_payments?.[0]?.id) {
        try {
          await EscrowService.refundPayment(booking.escrow_payments[0].id);
        } catch (paymentError) {
          console.error("Error refunding payment:", paymentError);
          // Continue with cancellation even if refund fails
        }
      }

      toast({
        title: "Booking Cancelled",
        description: "Your booking has been cancelled successfully",
      });

      navigate("/bookings");
    } catch (error) {
      console.error("Error canceling booking:", error);
      toast({
        title: "Error",
        description: "Failed to cancel booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const handleConfirmCompletion = async () => {
    // This will be handled by the CustomerConfirmationModal
    fetchBookingDetails(); // Refresh the booking after confirmation
  };

  const handleDisputeCompletion = async () => {
    // This will be handled by the CustomerConfirmationModal
    fetchBookingDetails(); // Refresh the booking after dispute
  };

  const handleMakePayment = async () => {
    if (!booking) return;

    setMakingPayment(true);
    try {
      // If there's an existing payment record, update it
      if (booking.escrow_payments && booking.escrow_payments.length > 0) {
        const { error } = await supabase
          .from('escrow_payments')
          .update({ 
            status: 'completed',
            amount: booking.services?.price || 0
          })
          .eq('id', booking.escrow_payments[0].id);
          
        if (error) throw error;
      } else {
        // Create a new payment record
        const { error } = await supabase
          .from('escrow_payments')
          .insert({
            booking_id: booking.id,
            amount: booking.services?.price || 0,
            status: 'completed',
            customer_id: booking.customer_id,
            provider_id: booking.provider_id
          });
          
        if (error) throw error;
      }

      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully and held in escrow until service completion.",
      });

      fetchBookingDetails(); // Refresh booking data
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Payment Failed",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setMakingPayment(false);
      setShowPaymentModal(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return "default";
      case 'confirmed': return "outline";
      case 'pending': return "secondary";
      case 'pending_completion': return "secondary";
      case 'disputed': return "destructive";
      case 'cancelled': return "destructive";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_completion': return "Awaiting Confirmation";
      case 'cancelled': return "Cancelled";
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getPaymentStatusBadge = () => {
    if (!booking?.escrow_payments || booking.escrow_payments.length === 0) {
      return <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">Payment Required</Badge>;
    }
    
    const payment = booking.escrow_payments[0];
    switch (payment.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50">Payment Pending</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">Payment in Escrow</Badge>;
      case 'released':
        return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Payment Released</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50">Payment Refunded</Badge>;
      case 'disputed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">Payment Disputed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const isPaymentNeeded = () => {
    // If booking is confirmed and no payment has been made or payment is in pending status
    if (booking.status === 'confirmed') {
      if (!booking.escrow_payments || booking.escrow_payments.length === 0) {
        return true;
      }
      const payment = booking.escrow_payments[0];
      return payment.status === 'pending';
    }
    return false;
  };

  const isCustomer = () => {
    return user?.id === booking?.customer_id;
  };

  const isProvider = () => {
    return user?.id === booking?.provider_id;
  };

  if (loading) {
    return (
      <MainLayout activeTab="Bookings" setActiveTab={() => {}} userRole="customer" isAuthenticated={true}>
        <div>
          <Card className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p>Loading booking details...</p>
            </div>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!booking) {
    return null;
  }

  const canCancel = booking.status === "pending" && !booking.service_started;
  const needsConfirmation = booking.status === "pending_completion" && booking.customer_id === user?.id;

  return (
    <MainLayout activeTab="Bookings" setActiveTab={() => {}} userRole="customer" isAuthenticated={true}>
      <div className="container py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/bookings")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Bookings
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Booking Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Booking Details</CardTitle>
                  <div className="flex items-center gap-2">
                    {getPaymentStatusBadge()}
                    <Badge
                      variant={getStatusBadgeVariant(booking.status)}
                    >
                      {getStatusLabel(booking.status)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Service</h4>
                    <p className="font-medium">{booking.services?.title}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Price</h4>
                    <p className="font-medium">${booking.services?.price}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Date</h4>
                    <p className="font-medium">
                      {new Date(booking.scheduled_time).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Time</h4>
                    <p className="font-medium">
                      {new Date(booking.scheduled_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
                  <p className="font-medium">{booking.location || booking.services?.location}</p>
                </div>

                {booking.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>
                    <p className="font-medium">{booking.notes}</p>
                  </div>
                )}

                {isCustomer() && isPaymentNeeded() && (
                  <Alert className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Payment Required</AlertTitle>
                    <AlertDescription>
                      Payment is required to proceed with this booking. Please make a payment to secure your booking.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Service Provider Details */}
            <Card>
              <CardHeader>
                <CardTitle>Service Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={booking.provider?.avatar_url} />
                    <AvatarFallback>
                      {booking.provider?.username?.charAt(0).toUpperCase() || "P"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium">{booking.provider?.username}</h4>
                    <p className="text-sm text-muted-foreground">Service Provider</p>
                    <div className="flex items-center mt-1">
                      <Badge variant="outline" className={booking.provider?.kyc_verified ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                        {booking.provider?.kyc_verified ? "KYC Verified" : "Not Verified"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/messages?user=${booking.provider_id}`)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Provider
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isCustomer() && isPaymentNeeded() && (
                  <Button
                    variant="default"
                    className="w-full flex items-center gap-2"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    <CreditCard className="h-4 w-4" />
                    Make Payment
                  </Button>
                )}

                {needsConfirmation && (
                  <div className="p-4 border rounded-lg border-yellow-200 bg-yellow-50 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="text-yellow-500 mt-0.5">
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <h4 className="font-medium text-yellow-800">Service Completion Pending</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          The service provider has marked this service as completed. Please confirm if you are satisfied with the service.
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => setShowConfirmationModal(true)}
                          >
                            Review & Confirm
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              
                {canCancel && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    Cancel Booking
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Booking Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${booking.status === 'pending' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  <span className={booking.status === 'pending' ? 'font-medium' : 'text-muted-foreground'}>Pending Approval</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${booking.status === 'confirmed' ? 'bg-blue-500' : (booking.status === 'pending_completion' || booking.status === 'completed') ? 'bg-gray-300' : 'bg-gray-200'}`} />
                  <span className={booking.status === 'confirmed' ? 'font-medium' : 'text-muted-foreground'}>Confirmed</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${booking.status === 'pending_completion' ? 'bg-blue-500' : booking.status === 'completed' ? 'bg-gray-300' : 'bg-gray-200'}`} />
                  <span className={booking.status === 'pending_completion' ? 'font-medium' : 'text-muted-foreground'}>Awaiting Confirmation</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${booking.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'}`} />
                  <span className={booking.status === 'completed' ? 'font-medium' : 'text-muted-foreground'}>Completed</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Cancel Confirmation Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Booking</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this booking? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <p className="text-sm text-muted-foreground">
                  Cancellation may be subject to the service provider's cancellation policy.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                No, Keep Booking
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelBooking}
                disabled={cancelling}
              >
                {cancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Yes, Cancel Booking"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Service Completion Confirmation Modal */}
        <CustomerConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
          booking={booking}
          onConfirm={handleConfirmCompletion}
          onDispute={handleDisputeCompletion}
        />

        {/* Payment Modal */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Make Payment</DialogTitle>
              <DialogDescription>
                Your payment will be securely held in escrow until the service is completed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Payment Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Service:</span>
                    <span>{booking.services?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price:</span>
                    <span className="font-medium">${booking.services?.price}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <p className="text-sm text-muted-foreground">
                  Payment will be held securely until you confirm service completion.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleMakePayment}
                disabled={makingPayment}
              >
                {makingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Make Payment"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
} 