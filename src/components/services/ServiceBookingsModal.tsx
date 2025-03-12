import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, CalendarClock } from "lucide-react";
import { createNotification } from '@/utils/notification-helper';
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ServiceBookingsModalProps {
  serviceId: string | null;
  serviceName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ServiceBookingsModal({ serviceId, serviceName, isOpen, onClose }: ServiceBookingsModalProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [localTab, setLocalTab] = useState("pending");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && serviceId) {
      fetchBookings();
    }
  }, [isOpen, serviceId]);

  const fetchBookings = async () => {
    if (!serviceId) return;
    
    setLoading(true);
    try {
      // Fetch bookings for this specific service
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (bookingsData && bookingsData.length > 0) {
        // Extract customer IDs
        const customerIds = bookingsData.map(booking => booking.customer_id).filter(Boolean);
        
        // Fetch customers data
        const { data: customersData, error: customersError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', customerIds);
          
        if (customersError) console.error("Error fetching customers:", customersError);
        
        // Create lookup table for customers
        const customersMap = (customersData || []).reduce((acc, customer) => {
          acc[customer.id] = customer;
          return acc;
        }, {});
        
        // Join the data
        const bookingsWithRelations = bookingsData.map(booking => ({
          ...booking,
          customer: customersMap[booking.customer_id] || { username: 'Unknown Customer', avatar_url: null }
        }));
        
        setBookings(bookingsWithRelations);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({
        variant: "destructive",
        title: "Failed to load bookings",
        description: "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);
      
      if (error) throw error;
      
      // Update local state
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId ? { ...booking, status: newStatus } : booking
        )
      );
      
      // Get booking details for notification
      const booking = bookings.find(b => b.id === bookingId);
      
      if (booking) {
        // Get current user's profile info for notification
        const { data: { session } } = await supabase.auth.getSession();
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session?.user?.id || '')
          .single();
        
        // Notify the customer about the status change
        if (profileData && session) {
          await createNotification({
            userId: booking.customer_id,
            actorId: session.user.id,
            actorName: profileData.username || 'Service Provider',
            type: 'booking',
            entityId: bookingId,
            message: `Your booking for "${serviceName}" has been ${newStatus}`
          });
        }
      }
      
      toast({
        title: "Booking updated",
        description: `Booking status has been updated to ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating booking:", error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "There was an error updating the booking status.",
      });
    }
  };

  const renderBookingsList = (tabValue: string) => {
    // Filter bookings based on tab
    const filtered = bookings.filter(booking => booking.status === tabValue);

    if (loading) {
      return (
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg animate-pulse">
              <div className="flex justify-between">
                <div className="h-5 bg-gray-300 rounded w-1/3"></div>
                <div className="h-5 bg-gray-300 rounded w-1/4"></div>
              </div>
              <div className="h-4 bg-gray-300 rounded w-1/2 mt-2"></div>
              <div className="h-10 bg-gray-300 rounded w-full mt-4"></div>
            </div>
          ))}
        </div>
      );
    }
    
    if (filtered.length > 0) {
      return (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {filtered.map((booking) => (
            <Card key={booking.id} className="overflow-hidden">
              <CardHeader className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={booking.customer?.avatar_url} />
                      <AvatarFallback>{booking.customer?.username?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{booking.customer?.username}</CardTitle>
                      <div className="flex items-center text-sm text-muted-foreground gap-1">
                        <CalendarClock className="h-3 w-3" />
                        <span>{new Date(booking.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={
                    booking.status === 'completed' ? 'default' :
                    booking.status === 'pending' ? 'secondary' :
                    booking.status === 'cancelled' ? 'destructive' :
                    booking.status === 'confirmed' ? 'outline' : 'default'
                  }>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardFooter className="p-4 bg-muted/20 flex items-center justify-between">
                <div>
                  <Select 
                    defaultValue={booking.status}
                    onValueChange={(value) => handleUpdateBookingStatus(booking.id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Update status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/messages?user=${booking.customer_id}`)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      );
    } 
    
    return (
      <Card className="p-8 text-center">
        <CardTitle className="mb-2">No bookings found</CardTitle>
        <CardDescription className="mb-4">
          You don't have any {tabValue} bookings for this service.
        </CardDescription>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Bookings for {serviceName}</DialogTitle>
          <DialogDescription>
            Manage customer bookings for this service
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={localTab} onValueChange={setLocalTab} className="mt-4">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending">
            {renderBookingsList("pending")}
          </TabsContent>
          
          <TabsContent value="confirmed">
            {renderBookingsList("confirmed")}
          </TabsContent>
          
          <TabsContent value="completed">
            {renderBookingsList("completed")}
          </TabsContent>
          
          <TabsContent value="cancelled">
            {renderBookingsList("cancelled")}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 