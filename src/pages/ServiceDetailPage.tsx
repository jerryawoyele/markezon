import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  Users,
  Star,
  ChevronLeft,
  MessageSquare,
  User,
  Calendar as CalendarIcon,
  Shield
} from "lucide-react";
import { ServiceBookingForm } from "@/components/services/ServiceBookingForm";
import { LocationService } from "@/utils/location-service";
import { MainLayout } from "@/layouts/MainLayout";
import { EscrowService } from "@/utils/escrow-service";

export default function ServiceDetailPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const { user } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [service, setService] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCanBook, setUserCanBook] = useState(false);
  const [showLocationData, setShowLocationData] = useState(false);
  const [locationData, setLocationData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("about");
  const [navbarTab, setNavbarTab] = useState("Services");
  const [userRole, setUserRole] = useState<"business" | "customer" | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  
  useEffect(() => {
    checkAuthAndFetchUserRole();
    fetchServiceData();
  }, [serviceId]);

  // Ensure we set the default tab after the service data is loaded
  useEffect(() => {
    if (!loading && service && user) {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      
      if (tabParam === 'bookings') {
        // If bookings tab is explicitly requested in URL, set it
        setActiveTab('bookings');
      } else if (user.id === service.owner_id) {
        // If user is the service owner and no tab is specified, default to bookings
        setActiveTab('bookings');
      } else {
        // Otherwise, default to about tab
        setActiveTab('about');
      }
    }
  }, [loading, service, user]);

  // Fetch bookings when tab changes to bookings
  useEffect(() => {
    if (activeTab === 'bookings' && service?.id && isAuthenticated) {
      fetchServiceBookings();
    }
  }, [activeTab, service, isAuthenticated]);

  const checkAuthAndFetchUserRole = async () => {
    try {
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
    }
  };

  useEffect(() => {
    if (service && user) {
      // Check if the user is allowed to book (not the owner of the service)
      setUserCanBook(service.owner_id !== user.id);
    }
  }, [service, user]);

  const fetchServiceData = async () => {
    try {
      setLoading(true);
      
      // Fetch service data
      const { data: serviceData, error: serviceError } = await supabase
        .from("services")
        .select("*")
        .eq("id", serviceId)
        .single();

      if (serviceError) throw serviceError;
      
      setService(serviceData);

      // Fetch provider data
      if (serviceData?.owner_id) {
        const { data: providerData, error: providerError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", serviceData.owner_id)
          .single();

        if (!providerError) {
          setProvider(providerData);
        }
      }

      // Fetch reviews
      try {
        // First just get the basic reviews
        const { data: reviewsData, error: reviewsError } = await supabase
          .from("reviews")
          .select("*")
          .eq("service_id", serviceId)
          .order("created_at", { ascending: false });

        if (reviewsError) throw reviewsError;
        
        if (reviewsData && reviewsData.length > 0) {
          // Then get the reviewer data separately
          const reviewerIds = reviewsData
            .map(review => review.reviewer_id)
            .filter(Boolean); // Filter out any nulls
            
          if (reviewerIds.length > 0) {
            const { data: reviewersData, error: reviewersError } = await supabase
              .from("profiles")
              .select("id, username, avatar_url")
              .in("id", reviewerIds);
              
            if (!reviewersError && reviewersData) {
              // Combine the data
              const enrichedReviews = reviewsData.map(review => ({
                ...review,
                reviewer: reviewersData.find(r => r.id === review.reviewer_id) || null
              }));
              
              setReviews(enrichedReviews);
            } else {
              // If we can't get reviewer data, still show the reviews
              setReviews(reviewsData.map(review => ({
                ...review,
                reviewer: null
              })));
            }
          } else {
            setReviews(reviewsData.map(review => ({
              ...review,
              reviewer: null
            })));
          }
        } else {
          setReviews([]);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
        // Don't let review errors prevent the page from loading
        setReviews([]);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching service data:", error);
      toast({
        title: "Error",
        description: "Failed to load service details",
        variant: "destructive",
      });
      navigate("/services");
    }
  };

  const fetchLocationData = async (bookingId: string) => {
    try {
      const data = await LocationService.getLocationData(bookingId);
      setLocationData(data);
      setShowLocationData(true);
    } catch (error) {
      console.error("Error fetching location data:", error);
      toast({
        title: "Error",
        description: "Failed to load location tracking data",
        variant: "destructive",
      });
    }
  };

  const handleContactProvider = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to contact the service provider",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    navigate(`/messages?user=${service.owner_id}`);
  };

  const handleBookingSuccess = () => {
    setActiveTab("about");
    fetchServiceData(); // Refresh data
  };

  // Add function to fetch service bookings
  const fetchServiceBookings = async () => {
    if (!service?.id || !user) return;

    try {
      setLoadingBookings(true);
      
      // Only fetch bookings if user is the service owner
      if (service.owner_id !== user.id) {
        setBookings([]);
        setLoadingBookings(false);
        return;
      }
      
      // Fetch bookings for this service
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:profiles!customer_id(
            username,
            avatar_url
          ),
          escrow_payments(*)
        `)
        .eq('service_id', service.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching service bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive'
      });
    } finally {
      setLoadingBookings(false);
    }
  };

  // Add function to handle booking status changes
  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      // Special handling for completed status - change to pending_completion
      if (newStatus === "completed") {
        const { error } = await supabase
          .from('bookings')
          .update({ status: "pending_completion" })
          .eq('id', bookingId);
          
        if (error) throw error;
        
        // Update local state
        setBookings(bookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: "pending_completion" } 
            : booking
        ));
        
        toast({
          title: "Status Updated",
          description: "Booking status has been changed to pending customer confirmation",
        });
      } else {
        // Handle other status changes normally
        const { error } = await supabase
          .from('bookings')
          .update({ status: newStatus })
          .eq('id', bookingId);
        
        if (error) throw error;
        
        // Handle escrow status changes based on booking status change
        if (newStatus === "canceled") {
          // Refund the payment
          const booking = bookings.find(b => b.id === bookingId);
          if (booking?.escrow_payments?.[0]?.id) {
            try {
              await EscrowService.refundPayment(booking.escrow_payments[0].id);
            } catch (paymentError) {
              console.error("Error refunding payment:", paymentError);
            }
          }
        }
  
        // Update local state
        setBookings(bookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus } 
            : booking
        ));
        
        toast({
          title: "Status Updated",
          description: `Booking status has been changed to ${newStatus}`,
        });
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    }
  };

  // Add function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Add function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending_completion': return 'bg-yellow-100 text-yellow-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusActions = (booking) => {
    switch (booking.status) {
      case "pending":
        return (
          <>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => handleUpdateBookingStatus(booking.id, "confirmed")}
            >
              Accept
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleUpdateBookingStatus(booking.id, "canceled")}
            >
              Decline
            </Button>
          </>
        );
      case "confirmed":
        return (
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => handleUpdateBookingStatus(booking.id, "completed")}
          >
            Mark as Completed
          </Button>
        );
      case "pending_completion":
        return (
          <Button 
            variant="outline" 
            size="sm" 
            disabled
          >
            Awaiting Customer Confirmation
          </Button>
        );
      case "completed":
        return null;
      default:
        return null;
    }
  };

  // Check if current user is the service owner
  const isServiceOwner = () => {
    return user?.id === service?.owner_id;
  };

  // Function to extract booking details from notes
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

  if (loading) {
    return (
      <div className="container py-12 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="container py-12 text-center">
        <h2 className="text-2xl font-bold mb-2">Service Not Found</h2>
        <p className="mb-6 text-muted-foreground">The service you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate("/services")}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Services
        </Button>
      </div>
    );
  }

  return (
    <MainLayout activeTab={navbarTab} setActiveTab={setNavbarTab} userRole={userRole} isAuthenticated={isAuthenticated}>
      <div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="mb-6 flex items-center text-muted-foreground hover:text-foreground" 
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Service Info Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="relative rounded-lg overflow-hidden">
              {service.image ? (
                <img 
                  src={service.image} 
                  alt={service.title} 
                  className="w-full h-64 object-cover"
                />
              ) : (
                <div className="w-full h-64 bg-muted flex items-center justify-center">
                  <span className="text-4xl font-bold text-muted-foreground">
                    {service.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <Badge className="absolute top-4 right-4 text-sm py-1">
                {service.category}
              </Badge>
            </div>

            <div>
              <div className="flex items-start justify-between mb-3">
                <h1 className="text-3xl font-bold">{service.title}</h1>
                <div className="flex items-center text-lg font-semibold">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span>{service.price}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{service.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{service.duration_minutes} minutes</span>
                </div>
                {service.ratings_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span>
                      {(service.ratings_sum / service.ratings_count).toFixed(1)}
                      <span className="text-muted-foreground ml-1">({service.ratings_count})</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 overflow-x-auto whitespace-nowrap w-full flex pl-12">
                {isServiceOwner() && (
                  <TabsTrigger value="bookings">Bookings</TabsTrigger>
                )}
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="provider">Provider</TabsTrigger>
                {showLocationData && <TabsTrigger value="location">Location</TabsTrigger>}
              </TabsList>

              <TabsContent value="about" className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-3">Description</h2>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {service.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-medium">{service.duration_minutes} minutes</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium">{service.location}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Provider</p>
                        <p className="font-medium">{provider?.username || "Unknown"}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Availability</p>
                        <p className="font-medium">Flexible</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="reviews">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Customer Reviews</h2>
                    {service.ratings_count > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star}
                              className={`h-5 w-5 ${
                                star <= (service.ratings_sum / service.ratings_count)
                                  ? "text-amber-500 fill-amber-500"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-medium">
                          {(service.ratings_sum / service.ratings_count).toFixed(1)}
                        </span>
                        <span className="text-muted-foreground">
                          ({service.ratings_count} {service.ratings_count === 1 ? "review" : "reviews"})
                        </span>
                      </div>
                    )}
                  </div>

                  {reviews.length === 0 ? (
                    <div className="text-center py-8 border rounded-lg border-dashed">
                      <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
                      <p className="text-muted-foreground">
                        Be the first to review this service after booking!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <Card key={review.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={review.reviewer?.avatar_url} />
                                  <AvatarFallback>
                                    {review.reviewer?.username?.charAt(0).toUpperCase() || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{review.reviewer?.username || "Anonymous"}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(review.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star 
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= review.rating
                                        ? "text-amber-500 fill-amber-500"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-muted-foreground">{review.content}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="provider">
                {provider ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={provider.avatar_url} />
                        <AvatarFallback className="text-xl">
                          {provider.username?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-xl font-semibold">{provider.username}</h2>
                        <p className="text-muted-foreground">Service Provider</p>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Member since {new Date(provider.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">About the Provider</h3>
                      <p className="text-muted-foreground">
                        {provider.bio || "This provider has not added a bio yet."}
                      </p>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleContactProvider}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Contact Provider
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Provider information not available</p>
                  </div>
                )}
              </TabsContent>

              {showLocationData && (
                <TabsContent value="location">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">Location Tracking</h2>
                      <Badge variant={locationData?.status === 'active' ? 'default' : 'secondary'}>
                        {locationData?.status}
                      </Badge>
                    </div>

                    {locationData ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardContent className="p-4">
                              <h3 className="font-medium mb-2">Service Provider</h3>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Latitude:</span>
                                  <span>{locationData.provider_lat}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Longitude:</span>
                                  <span>{locationData.provider_lng}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-4">
                              <h3 className="font-medium mb-2">Customer</h3>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Latitude:</span>
                                  <span>{locationData.customer_lat}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Longitude:</span>
                                  <span>{locationData.customer_lng}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <Card>
                          <CardContent className="p-4">
                            <h3 className="font-medium mb-2">Estimated Information</h3>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Distance:</span>
                                <span>
                                  {LocationService.calculateDistance(
                                    locationData.provider_lat,
                                    locationData.provider_lng,
                                    locationData.customer_lat,
                                    locationData.customer_lng
                                  ).toFixed(2)} km
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Estimated Arrival:</span>
                                <span>
                                  {LocationService.estimateArrivalTime(
                                    locationData.provider_lat,
                                    locationData.provider_lng,
                                    locationData.customer_lat,
                                    locationData.customer_lng
                                  )} minutes
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Last Updated:</span>
                                <span>
                                  {new Date(locationData.updated_at).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <div className="border rounded-lg p-4 bg-muted/10">
                          <p className="text-sm text-muted-foreground">
                            Note: This is a simplified view of location data. In a production app, you would integrate with a mapping service like Google Maps to visualize the locations and provide real-time updates.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-lg border-dashed">
                        <p className="text-muted-foreground">
                          Location tracking data not available. This will be updated when the service provider is en route.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              <TabsContent value="bookings">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Service Bookings</h2>
                  </div>

                  {loadingBookings ? (
                    <div className="flex justify-center p-8">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="text-center py-8 border rounded-lg border-dashed">
                      <h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3>
                      <p className="text-muted-foreground">
                        Your service hasn't received any bookings yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking) => (
                        <Card key={booking.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={booking.customer?.avatar_url} />
                                  <AvatarFallback>
                                    {booking.customer?.username?.charAt(0).toUpperCase() || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                <div>
                                  <p className="font-medium truncate max-w-[150px]">{booking.customer?.username || "Anonymous"}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Booked on {formatDate(booking.created_at)}
                                  </p>
                                </div>
                                <div className="flex items-center">
                                <Badge className={`${getStatusColor(booking.status)} max-w-[110px] mt-2 truncate`}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </Badge>
                              </div>
                              </div>
                              </div>

                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 my-2 text-sm">
                              {(() => {
                                // Extract booking details from notes
                                const bookingDetails = extractBookingDetails(booking.notes);
                                
                                return (
                                  <>
                                    {bookingDetails.date && (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span>Date: {bookingDetails.date}</span>
                                      </div>
                                    )}
                                    {bookingDetails.time && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span>Time: {bookingDetails.time}</span>
                                      </div>
                                    )}
                                    {bookingDetails.location && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span>Location: {bookingDetails.location}</span>
                                      </div>
                                    )}
                                    {booking.escrow_payments?.[0] && (
                                      <div className="flex items-center gap-1">
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                        <span>Amount: ${booking.escrow_payments[0].amount}</span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          
                            
                            <div className="flex justify-end items-center gap-2 mt-4 border-t pt-3">
                              {getStatusActions(booking)}
                              {booking.status !== "canceled" && booking.status !== "completed" && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleUpdateBookingStatus(booking.id, "canceled")}
                                >
                                  Cancel Booking
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/messages?user=${booking.customer_id}`)}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Message
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Booking Column */}
          <div>
            {userCanBook ? (
              <div className="sticky top-6">
                <ServiceBookingForm 
                  service={service} 
                  onBookingSuccess={handleBookingSuccess}
                />
              </div>
            ) : (
              user ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">This is your service</h3>
                    <p className="text-muted-foreground mb-4">
                      You can't book your own service. You can manage your bookings from your dashboard.
                    </p>
                    <Button 
                      className="w-full" 
                      onClick={() => navigate("/services?tab=dashboard")}
                    >
                      Go to Dashboard
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <h3 className="text-lg font-semibold mb-2">Ready to book this service?</h3>
                    <p className="text-muted-foreground mb-4">
                      Please log in or sign up to book this service and access all features.
                    </p>
                    <Button 
                      className="w-full mb-2" 
                      onClick={() => navigate("/login")}
                    >
                      Log In
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => navigate("/signup")}
                    >
                      Sign Up
                    </Button>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 