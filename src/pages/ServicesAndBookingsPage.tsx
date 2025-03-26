import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/StarRating";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Star,
  Search,
  MessageSquare,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Info,
  User,
  Shield,
  Loader2,
  Plus,
  Filter,
  LayoutGrid,
  Sliders,
  AlertTriangle
} from "lucide-react";
import { EscrowService } from "@/utils/escrow-service";
import { LocationService } from "@/utils/location-service";
import { MainLayout } from "@/layouts/MainLayout";
import { ServiceDashboard } from "@/components/services/ServiceDashboard";
import { AddServiceModal } from "@/components/services/AddServiceModal";

export default function ServicesAndBookingsPage() {
  const location = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Determine the active page based on URL
  const [pageType, setPageType] = useState<"services" | "bookings">("services");
  
  // Common state variables
  const [activeTab, setActiveTab] = useState("");
  const [userRole, setUserRole] = useState<"business" | "customer" | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Services page state
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Bookings page state
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [statusTab, setStatusTab] = useState("pending");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingDispute, setSubmittingDispute] = useState(false);

  // Add a loading state for authentication
  const [authLoading, setAuthLoading] = useState(true);

  // Add state for confirmation dialog
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
  const [cancellationLoading, setCancellationLoading] = useState(false);

  // Initialize based on path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('bookings')) {
      setPageType("bookings");
      setActiveTab("Bookings");
      fetchBookings();
    } else {
      setPageType("services");
      setActiveTab("Services");
      fetchServices();
    }
  }, [location.pathname]);

  useEffect(() => {
    checkAuthAndFetchUserRole();
  }, []);

  useEffect(() => {
    if (user && isAuthenticated) {
      if (pageType === "services") {
        fetchServices();
      } else {
        fetchBookings();
      }
    }
  }, [user, isAuthenticated, pageType]);

  useEffect(() => {
    if (bookings.length > 0) {
      setFilteredBookings(applyBookingsFilters());
    }
  }, [bookings, statusTab, searchQuery]);

  const checkAuthAndFetchUserRole = async () => {
    try {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsAuthenticated(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (!error && data) {
          if ('user_role' in data) {
            setUserRole(data.user_role as "business" | "customer");
          } else {
            setUserRole("customer");
          }
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  // Services-related functions
  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      
      if (!user) {
        setLoadingServices(false);
        return;
      }
      
      const { data, error } = await supabase
        .from("services")
        .select("*, profiles!owner_id(username, avatar_url)")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setServices(data || []);
      setLoadingServices(false);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast({
        title: "Error",
        description: "Failed to load your services. Please try again.",
        variant: "destructive",
      });
      setLoadingServices(false);
    }
  };

  const handleServiceAdded = (newService: any) => {
    setServices([newService, ...services]);
    setShowAddModal(false);
    toast({
      title: "Service Added",
      description: "Your service has been successfully added to your dashboard",
    });
  };

  // Bookings-related functions
  const fetchBookings = async () => {
    if (!user) return;
    
    try {
      setLoadingBookings(true);
      
      // First, fetch bookings with basic related data (no reviews yet)
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          services(*),
          provider:profiles!provider_id(username, avatar_url),
          escrow_payments(*)
        `)
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        setBookings([]);
        setFilteredBookings([]);
        setLoadingBookings(false);
        return;
      }
      
      // Get all service IDs
      const serviceIds = data.map(booking => booking.service_id);
      
      // Fetch reviews separately
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("*")
        .in("service_id", serviceIds);
        
      if (reviewsError) {
        console.error("Error fetching reviews:", reviewsError);
        // If we can't fetch reviews, just set the bookings without reviews
        setBookings(data);
        setFilteredBookings(data);
        setLoadingBookings(false);
        return;
      }
      
      // Map reviews to bookings based on service_id
      const enrichedBookings = data.map(booking => ({
        ...booking,
        reviews: reviewsData?.filter(review => review.service_id === booking.service_id) || []
      }));
      
      setBookings(enrichedBookings);
      setFilteredBookings(enrichedBookings);
      setLoadingBookings(false);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load your bookings",
        variant: "destructive",
      });
      setLoadingBookings(false);
    }
  };

  const applyBookingsFilters = () => {
    if (!bookings) return [];
    
    let filtered = [...bookings];
    
    // Always filter by status (we removed the "all" tab)
    filtered = filtered.filter(booking => booking.status === statusTab);
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.services?.title?.toLowerCase().includes(query) ||
        booking.services?.description?.toLowerCase().includes(query) ||
        booking.provider?.username?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const handleOpenBooking = (booking: any) => {
    // Navigate to the service details page and show the bookings tab
    navigate(`/services/${booking.service_id}?tab=bookings`);
  };

  const handleContactProvider = (providerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/messages?user=${providerId}`);
  };

  const handleCancelBookingRequest = (bookingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookingToCancel(bookingId);
  };

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    
    setCancellationLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingToCancel);

      if (error) throw error;

      // Refund the payment if applicable
      const booking = bookings.find(b => b.id === bookingToCancel);
      if (booking?.escrow_payments?.[0]?.id) {
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

      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === bookingToCancel 
          ? { ...booking, status: "cancelled" } 
          : booking
      ));
      
      setFilteredBookings(prev => 
        prev.map(booking => 
          booking.id === bookingToCancel 
            ? { ...booking, status: "cancelled" } 
            : booking
        )
      );
      
    } catch (error) {
      console.error("Error canceling booking:", error);
      toast({
        title: "Error",
        description: "Failed to cancel booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancellationLoading(false);
      setBookingToCancel(null);
    }
  };

  const handleOpenReviewModal = (booking: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBooking(booking);
    setShowReviewModal(true);
  };

  const handleOpenDisputeModal = (booking: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBooking(booking);
    setShowDisputeModal(true);
  };

  const hasUserLeftReview = (booking: any) => {
    if (!user || !booking.reviews) return false;
    return booking.reviews.some((review: any) => 
      review.reviewer_id === user.id && 
      review.service_id === booking.service_id
    );
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSubmitReview = async () => {
    if (!selectedBooking || !user) return;
    
    setSubmittingReview(true);
    
    try {
      // Ensure we have a valid user ID
      if (!user.id) {
        throw new Error("User ID is missing. Please log in again.");
      }
      
      // Check if user is trying to review their own service
      if (selectedBooking.services?.owner_id === user.id || selectedBooking.provider_id === user.id) {
        throw new Error("You cannot review your own service");
      }
      
      // Check if a review already exists
      const existingReview = selectedBooking.reviews?.find(
        (r: any) => r.reviewer_id === user.id
      );
      
      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from("reviews")
          .update({
            content: reviewContent,
            rating: reviewRating,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingReview.id);
          
        if (error) throw error;
      } else {
        // Create new review
        const { error } = await supabase
          .from("reviews")
          .insert({
            service_id: selectedBooking.service_id,
            reviewer_id: user.id,
            user_id: user.id,
            content: reviewContent,
            rating: reviewRating
          });
          
        if (error) throw error;
        
        // Update service ratings
        const { data: serviceData } = await supabase
          .from("services")
          .select("ratings_count, ratings_sum")
          .eq("id", selectedBooking.service_id)
          .single();
          
        if (serviceData) {
          const newCount = (serviceData.ratings_count || 0) + 1;
          const newSum = (serviceData.ratings_sum || 0) + reviewRating;
          
          await supabase
            .from("services")
            .update({
              ratings_count: newCount,
              ratings_sum: newSum
            })
            .eq("id", selectedBooking.service_id);
        }
      }
      
      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!"
      });
      
      setShowReviewModal(false);
      setReviewContent("");
      setReviewRating(5);
      fetchBookings(); // Refresh bookings to include the new review
    } catch (error) {
      console.error("Error submitting review:", error);
      
      // Check for specific error types
      let errorMessage = "Failed to submit review";
      
      if (error instanceof Error) {
        if (error.message === "You cannot review your own service") {
          errorMessage = "You cannot review your own service";
        }
      } else if (typeof error === 'object' && error !== null) {
        // Check for Supabase constraint error
        const supabaseError = error as any;
        if (supabaseError.code === '23514' && 
            supabaseError.message?.includes('prevent_self_review')) {
          errorMessage = "You cannot review your own service";
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitDispute = async () => {
    if (!selectedBooking || !user || !disputeReason) return;
    
    setSubmittingDispute(true);
    
    try {
      const escrowPayment = selectedBooking.escrow_payments?.[0];
      if (!escrowPayment) throw new Error("No payment found for this booking");
      
      const { error } = await EscrowService.createDispute(
        escrowPayment.id,
        disputeReason,
        user.id,
        selectedBooking.provider_id
      );
      
      if (error) throw error;
      
      toast({
        title: "Dispute Submitted",
        description: "Your dispute has been submitted and will be reviewed by our team."
      });
      
      setShowDisputeModal(false);
      setDisputeReason("");
      
      // Update escrow payment status in local state
      const updatedBookings = bookings.map(booking => {
        if (booking.id === selectedBooking.id && booking.escrow_payments) {
          const updatedPayments = booking.escrow_payments.map((payment: any) => 
            payment.id === escrowPayment.id 
              ? { ...payment, status: 'disputed' } 
              : payment
          );
          return { ...booking, escrow_payments: updatedPayments };
        }
        return booking;
      });
      
      setBookings(updatedBookings);
    } catch (error) {
      console.error("Error submitting dispute:", error);
      toast({
        title: "Error",
        description: "Failed to submit dispute. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingDispute(false);
    }
  };

  // UI rendering
  const renderServicesContent = () => (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Services Dashboard</h1>
          <p className="text-muted-foreground">
            {userRole === "business" 
              ? "Manage your services and view booking requests" 
              : "View and manage your bookings"}
          </p>
        </div>
        {userRole === "business" && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        )}
      </div>

      {authLoading ? (
        <Card className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Loading your services...</p>
          </div>
        </Card>
      ) : !isAuthenticated ? (
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Sign in to access your Services Dashboard</h2>
          <p className="mb-6 text-muted-foreground">
            You need to be signed in to view your services and manage bookings.
          </p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </Card>
      ) : (
        <ServiceDashboard 
          services={services} 
          loading={loadingServices} 
          userRole={userRole || "customer"} 
          onRefresh={fetchServices} 
        />
      )}

      <AddServiceModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onServiceAdded={handleServiceAdded} 
      />
    </>
  );

  const renderBookingsContent = () => (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">My Bookings</h1>
          <p className="text-muted-foreground">
            Manage and track all your service bookings
          </p>
        </div>
      </div>

      {authLoading ? (
        <Card className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Loading your bookings...</p>
          </div>
        </Card>
      ) : !isAuthenticated ? (
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Sign in to view your bookings</h2>
          <p className="mb-6 text-muted-foreground">
            You need to be signed in to view and manage your bookings.
          </p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </Card>
      ) : (
        <>
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search bookings..."
                className="pl-10"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          <Tabs value={statusTab} onValueChange={setStatusTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="canceled">Canceled</TabsTrigger>
            </TabsList>
          </Tabs>

          {loadingBookings ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(3).fill(0).map((_, index) => (
                <Card key={index} className="overflow-hidden animate-pulse">
                  <div className="h-48 bg-black/20"></div>
                  <CardContent className="p-4">
                    <div className="h-6 bg-black/20 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-black/20 rounded w-1/2 mb-4"></div>
                    <div className="h-4 bg-black/20 rounded w-full mb-2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-16 border rounded-lg border-dashed">
              <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search query"
                  : `You don't have any ${statusTab} bookings`}
              </p>
              <Button onClick={() => navigate("/discover?tab=services")}>
                Discover Services
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBookings.map((booking) => (
                <Card 
                  key={booking.id}
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleOpenBooking(booking)}
                >
                  <div className="relative h-48 overflow-hidden">
                    {booking.services?.image ? (
                      <img 
                        src={booking.services.image}
                        alt={booking.services.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-2xl font-bold text-muted-foreground">
                          {booking.services?.title?.charAt(0).toUpperCase() || "?"}
                        </span>
                      </div>
                    )}
                    <Badge 
                      className="absolute top-2 right-2"
                      variant={
                        booking.status === "completed" ? "default" :
                        booking.status === "confirmed" ? "outline" :
                        booking.status === "pending" ? "secondary" : "destructive"
                      }
                    >
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{booking.services?.title}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>{new Date(booking.scheduled_time).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{new Date(booking.scheduled_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span>{booking.location || booking.services?.location}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span>${booking.services?.price}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={booking.provider?.avatar_url} />
                          <AvatarFallback>
                            {booking.provider?.username?.charAt(0).toUpperCase() || "P"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{booking.provider?.username}</span>
                      </div>
                      
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                  
                  <CardFooter className="p-4 pt-0 flex gap-2">
                    {booking.status === "pending" && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1"
                        onClick={(e) => handleOpenBooking(booking)}
                      >
                        View Booking
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={(e) => handleContactProvider(booking.provider_id, e)}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Contact
                    </Button>
                    
                    {booking.status === "completed" && 
                     !hasUserLeftReview(booking) && 
                     booking.provider_id !== user?.id && 
                     booking.services?.owner_id !== user?.id && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1"
                        onClick={(e) => handleOpenReviewModal(booking, e)}
                        title={`Review ${booking.provider?.username}`}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Review Provider
                      </Button>
                    )}
                    
                    {booking.status === "completed" && 
                     booking.escrow_payments?.length > 0 && 
                     booking.escrow_payments[0].status !== "disputed" && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={(e) => handleOpenDisputeModal(booking, e)}
                      >
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        Dispute
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {/* Review Modal */}
          <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Leave a Review</DialogTitle>
                {selectedBooking && (
                  <DialogDescription>
                    You're reviewing "{selectedBooking.services?.title}" provided by {selectedBooking.provider?.username}
                  </DialogDescription>
                )}
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {selectedBooking && (
                  <div className="flex items-center space-x-3 mb-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedBooking.provider?.avatar_url} />
                      <AvatarFallback>
                        {selectedBooking.provider?.username?.charAt(0).toUpperCase() || "P"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{selectedBooking.provider?.username}</p>
                      <p className="text-sm text-muted-foreground">Service Provider</p>
                    </div>
                  </div>
                )}
              
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Rating</label>
                  <StarRating 
                    value={reviewRating} 
                    onChange={setReviewRating} 
                    size="large"
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Your Review</label>
                  <Textarea 
                    placeholder="Share your experience with this service..." 
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    rows={5}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReviewModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitReview}
                  disabled={submittingReview || !reviewContent.trim()}
                >
                  {submittingReview && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Review
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dispute Modal */}
          <Dialog open={showDisputeModal} onOpenChange={setShowDisputeModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report an Issue</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-500 rounded-md">
                  <Info className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm">
                    Disputes are reviewed by our team and may take 3-5 business days to process.
                  </p>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Reason for Dispute</label>
                  <Textarea 
                    placeholder="Please describe the issue in detail..." 
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    rows={5}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDisputeModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleSubmitDispute}
                  disabled={submittingDispute || !disputeReason.trim()}
                >
                  {submittingDispute && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Dispute
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Confirmation modal for cancellation */}
          <Dialog open={!!bookingToCancel} onOpenChange={(open) => !open && setBookingToCancel(null)}>
            <DialogContent className="sm:max-w-[425px]">
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
                <Button variant="outline" onClick={() => setBookingToCancel(null)}>
                  No, Keep Booking
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleCancelBooking}
                  disabled={cancellationLoading}
                >
                  {cancellationLoading ? (
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
        </>
      )}
    </>
  );

  return (
    <MainLayout activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} isAuthenticated={isAuthenticated}>
      <div>
        {pageType === "services" ? renderServicesContent() : renderBookingsContent()}
      </div>
    </MainLayout>
  );
} 