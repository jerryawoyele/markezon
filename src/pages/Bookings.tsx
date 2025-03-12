import { useState, useEffect } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { MessageSquare, ShoppingCart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Bookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Bookings");
  const [localTab, setLocalTab] = useState("active");
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<"business" | "customer" | null>(null);

  useEffect(() => {
    fetchUserRole();
    fetchBookings();
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single();
          
      if (data) {
        setUserRole(data.user_role as "business" | "customer" | null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      // Get current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }
      
      const currentUserId = session.user.id;
      
      // Fetch bookings where the current user is the customer
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', currentUserId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (bookingsData && bookingsData.length > 0) {
        // Extract service IDs and provider IDs
        const serviceIds = bookingsData.map(booking => booking.service_id).filter(Boolean);
        const providerIds = bookingsData.map(booking => booking.provider_id).filter(Boolean);
        
        // Fetch services data
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('id, title, price, category, image')
          .in('id', serviceIds);
          
        if (servicesError) console.error("Error fetching services:", servicesError);
        
        // Fetch providers data
        const { data: providersData, error: providersError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', providerIds);
          
        if (providersError) console.error("Error fetching providers:", providersError);
        
        // Create lookup tables
        const servicesMap = (servicesData || []).reduce((acc, service) => {
          acc[service.id] = service;
          return acc;
        }, {});
        
        const providersMap = (providersData || []).reduce((acc, provider) => {
          acc[provider.id] = provider;
          return acc;
        }, {});
        
        // Join the data
        const bookingsWithRelations = bookingsData.map(booking => ({
          ...booking,
          services: servicesMap[booking.service_id] || { title: 'Unknown Service', price: 'N/A', category: 'Unknown' },
          providers: providersMap[booking.provider_id] || { username: 'Unknown Provider', avatar_url: null }
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

  const handleCancelBooking = async (bookingId: string) => {
    try {
      // Update the booking status in the database
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
      
      if (error) throw error;
      
      // Update local state
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking
        )
      );
      
      toast({
        title: "Booking cancelled",
        description: "Your booking has been cancelled.",
      });
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast({
        variant: "destructive",
        title: "Cancellation failed",
        description: "There was an error cancelling your booking.",
      });
    }
  };

  const renderBookingsList = (tabValue: string) => {
    // Filter bookings based on tab
    const filtered = bookings.filter(booking => {
      if (tabValue === "active") {
        return ["pending", "confirmed"].includes(booking.status);
      } else if (tabValue === "completed") {
        return booking.status === "completed";
      } else if (tabValue === "cancelled") {
        return booking.status === "cancelled";
      }
      return true;
    });

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
        <div className="space-y-4">
          {filtered.map((booking) => (
            <Card key={booking.id} className="overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-1/4 h-40">
                  <img 
                    src={booking.services.image || '/placeholder.svg'} 
                    alt={booking.services.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4" />
                          <CardTitle className="text-xl">{booking.services.title}</CardTitle>
                        </div>
                        <CardDescription className="mt-2">
                          <p>Provider: {booking.providers.username}</p>
                          <p>Price: ${booking.services.price}</p>
                          <p>Booked on: {new Date(booking.created_at).toLocaleDateString()}</p>
                          <p>Category: {booking.services.category}</p>
                        </CardDescription>
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
                  <CardFooter className="p-4 bg-muted/20 flex justify-end gap-2">
                    {["pending", "confirmed"].includes(booking.status) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        Cancel Booking
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => navigate(`/messages?user=${booking.provider_id}`)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message Provider
                    </Button>
                  </CardFooter>
                </div>
              </div>
            </Card>
          ))}
        </div>
      );
    } 
    
    return (
      <Card className="p-8 text-center">
        <CardTitle className="mb-2">No bookings found</CardTitle>
        <CardDescription className="mb-4">
          {tabValue === "active" ? "You don't have any active bookings." :
           tabValue === "completed" ? "You don't have any completed bookings." :
           "You don't have any cancelled bookings."}
        </CardDescription>
        <Button onClick={() => navigate('/')}>
          Browse Services
        </Button>
      </Card>
    );
  };

  return (
    <MainLayout activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole}>
      <div className="container max-w-4xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">My Bookings</h1>
        
        <Tabs value={localTab} onValueChange={setLocalTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            {renderBookingsList("active")}
          </TabsContent>
          
          <TabsContent value="completed">
            {renderBookingsList("completed")}
          </TabsContent>
          
          <TabsContent value="cancelled">
            {renderBookingsList("cancelled")}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
} 