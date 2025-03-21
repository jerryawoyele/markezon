import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, User, CheckCircle, XCircle, Clock, Star, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ServiceVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
}

export function ServiceVerificationModal({ 
  isOpen, 
  onClose, 
  customerId
}: ServiceVerificationModalProps) {
  const [customer, setCustomer] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [kycData, setKycData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && customerId) {
      fetchCustomerData();
    }
  }, [isOpen, customerId]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      
      // Fetch customer profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', customerId)
        .single();

      if (profileError) throw profileError;
      
      setCustomer(profileData);

      // Fetch customer's booking history
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          services(*),
          escrow_payments(*)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;
      
      setBookings(bookingsData || []);

      // Fetch KYC verification data if available
      const { data: kycData, error: kycError } = await supabase
        .from('kyc_verifications')
        .select('*')
        .eq('user_id', customerId)
        .single();

      if (!kycError) {
        setKycData(kycData);
      }
    } catch (error) {
      console.error("Error fetching customer data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch customer data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      canceled: "bg-red-100 text-red-800",
    };
    
    return (
      <Badge 
        className={colors[status] || "bg-gray-100 text-gray-800"}
        variant="outline"
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const calculateBookingStats = () => {
    const total = bookings.length;
    const completed = bookings.filter(b => b.status === "completed").length;
    const canceled = bookings.filter(b => b.status === "canceled").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Calculate total spent
    const totalSpent = bookings.reduce((sum, booking) => {
      const amount = booking.escrow_payments?.[0]?.amount || 0;
      return sum + amount;
    }, 0);
    
    return {
      total,
      completed,
      canceled,
      completionRate,
      totalSpent
    };
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex justify-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const stats = calculateBookingStats();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Customer Verification
          </DialogTitle>
        </DialogHeader>

        {!customer ? (
          <div className="text-center p-8 border rounded-lg border-dashed">
            <p className="text-muted-foreground">Customer information not found</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-full overflow-hidden bg-muted">
                {customer.avatar_url ? (
                  <img 
                    src={customer.avatar_url} 
                    alt={customer.username} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-bold text-2xl">
                    {customer.username?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {customer.username || "Anonymous User"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {customer.email || "No email provided"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Member since {formatDate(customer.created_at)}</span>
                </div>
              </div>
              {kycData && (
                <div className="ml-auto">
                  <Badge 
                    className="bg-green-100 text-green-800 flex items-center gap-1"
                    variant="outline"
                  >
                    <Shield className="h-3 w-3" />
                    KYC Verified
                  </Badge>
                </div>
              )}
            </div>

            <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="bookings">Booking History</TabsTrigger>
                <TabsTrigger value="verification">Verification</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-0 space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2">Customer Statistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Bookings:</span>
                          <span className="font-medium">{stats.total}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Completed:</span>
                          <span className="font-medium">{stats.completed}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Canceled:</span>
                          <span className="font-medium">{stats.canceled}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Completion Rate:</span>
                          <span className="font-medium">{stats.completionRate}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Spent:</span>
                          <span className="font-medium">${stats.totalSpent.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2">Contact Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Email:</span>
                        <span>{customer.email || "Not provided"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Phone:</span>
                        <span>{customer.phone || "Not provided"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Location:</span>
                        <span>{customer.location || "Not provided"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="bookings" className="mt-0">
                {bookings.length === 0 ? (
                  <div className="text-center p-8 border rounded-lg border-dashed">
                    <p className="text-muted-foreground">No booking history found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium">{booking.services?.title || "Unknown Service"}</h3>
                            {getStatusBadge(booking.status)}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>Booked: {formatDate(booking.created_at)}</span>
                            </div>
                            {booking.scheduled_time && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>Scheduled: {formatDate(booking.scheduled_time)}</span>
                              </div>
                            )}
                            {booking.escrow_payments?.[0] && (
                              <div className="flex items-center gap-1 col-span-2">
                                <span className="text-muted-foreground">Amount:</span>
                                <span>${booking.escrow_payments[0].amount}</span>
                              </div>
                            )}
                            {booking.rating && (
                              <div className="flex items-center gap-1 col-span-2">
                                <Star className="h-4 w-4 text-amber-500" />
                                <span>{booking.rating}/5</span>
                                {booking.review && (
                                  <span className="text-muted-foreground ml-2">
                                    "{booking.review.substring(0, 50)}
                                    {booking.review.length > 50 ? "..." : ""}"
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="verification" className="mt-0">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-3">KYC Verification Status</h3>
                    {kycData ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium">Verified Account</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Verification Date:</span>
                            <span>{formatDate(kycData.verified_at)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">ID Type:</span>
                            <span>{kycData.id_type}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Verification Level:</span>
                            <Badge variant="outline">{kycData.level}</Badge>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="font-medium">Not Verified</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          This customer has not completed KYC verification.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        <DialogFooter className="mt-4">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 