import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EscrowService } from "@/utils/escrow-service";
import { Loader2, ThumbsUp, ThumbsDown, AlertCircle, MessageSquare } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

interface CustomerConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onConfirm: () => void;
  onDispute: () => void;
  user: any;
}

export function CustomerConfirmationModal({
  isOpen,
  onClose,
  booking,
  onConfirm,
  onDispute,
  user
}: CustomerConfirmationModalProps) {
  const [feedbackText, setFeedbackText] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const navigate = useNavigate();

  // Check if payment is required but not completed
  const isPaymentRequired = () => {
    // If payment feature is disabled, never require payment
    if (booking?.is_external_payment) {
      return false;
    }
    
    if (!booking || !booking.escrow_payments || booking.escrow_payments.length === 0) {
      return true; // Payment is required but not initiated
    }
    
    const payment = booking.escrow_payments[0];
    return payment.status !== 'completed' && payment.status !== 'released';
  };

  const handleMakePayment = async () => {
    if (!booking) return;
    setPaymentLoading(true);
    
    try {
      // Simulate payment processing
      const { error } = await supabase
        .from('escrow_payments')
        .upsert({
          booking_id: booking.id,
          amount: booking.services?.price || 0,
          status: 'completed',
          customer_id: booking.customer_id,
          provider_id: booking.provider_id
        });
        
      if (error) throw error;
      
      setPaymentRequired(false);
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully.",
      });
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Payment Failed",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!booking) return;
    setLoading(true);
    
    try {
      // First check if payment is required
      if (isPaymentRequired()) {
        setPaymentRequired(true);
        setLoading(false);
        return;
      }
      
      // Update booking status to completed
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: "completed",
          customer_feedback: feedbackText
        })
        .eq('id', booking.id);
        
      if (error) throw error;
      
      // Release payment if there is one
      if (booking.escrow_payments?.[0]?.id) {
        try {
          await EscrowService.releasePayment(booking.escrow_payments[0].id);
        } catch (paymentError) {
          console.error("Error releasing payment:", paymentError);
          // Continue with completion even if payment release fails
        }
      }
      
      toast({
        title: "Service Confirmed",
        description: "Thank you for confirming this service was completed.",
      });
      
      onConfirm();
      onClose();
    } catch (error) {
      console.error("Error confirming service completion:", error);
      toast({
        title: "Error",
        description: "Failed to confirm service completion. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!booking || !user) return;
    setLoading(true);
    
    try {
      // If there's a payment, mark it as disputed
      if (booking.escrow_payments?.[0]?.id) {
        const reason = feedbackText || "Customer disputed service completion";
        const description = "Dispute filed by customer";
        
        const success = await EscrowService.createDispute(
          booking.escrow_payments[0].id,
          reason,
          description,
          user.id
        );
        
        if (!success) {
          throw new Error("Failed to create dispute");
        }
      } else {
        // If no payment record, just update the booking status
        const { error } = await supabase
          .from('bookings')
          .update({ 
            status: "disputed",
            customer_feedback: feedbackText 
          })
          .eq('id', booking.id);
          
        if (error) throw error;
      }
      
      toast({
        title: "Dispute Filed",
        description: "Your dispute has been filed. Our team will review it shortly.",
      });
      
      onDispute();
      onClose();
    } catch (error) {
      console.error("Error filing dispute:", error);
      toast({
        title: "Error",
        description: "Failed to file dispute. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Confirm Service Completion</DialogTitle>
          <DialogDescription>
            The service provider has marked this service as completed. Please confirm if the service was completed to your satisfaction.
          </DialogDescription>
        </DialogHeader>
        
        {paymentRequired ? (
          <div className="space-y-4 py-4">
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Payment Discussion</AlertTitle>
              <AlertDescription>
                Please ensure you've discussed and arranged payment with the service provider before confirming.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <h4 className="font-medium">Service: {booking?.services?.title}</h4>
              <p className="text-sm text-muted-foreground">Provider: {booking?.provider?.username}</p>
              <p className="text-sm font-medium mt-2">Amount: ${booking?.services?.price}</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Payments are currently handled directly between you and the service provider.
                If you haven't arranged payment yet, please contact the provider before confirming.
              </p>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onClose();
                    navigate(`/messages?user=${booking?.provider_id}`);
                  }}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Contact Provider
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h4 className="font-medium">Service: {booking?.services?.title}</h4>
                <p className="text-sm text-muted-foreground">Provider: {booking?.provider?.username}</p>
              </div>
              
              <Textarea
                placeholder="Provide any feedback about the service (optional)"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            
            <DialogFooter className="flex space-x-2 sm:space-x-0">
              <Button
                variant="outline"
                onClick={handleDispute}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
                Dispute
              </Button>
              
              <Button
                onClick={handleConfirm}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                Confirm Completion
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
} 