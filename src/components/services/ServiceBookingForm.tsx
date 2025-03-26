import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Clock, MapPin, DollarSign, CheckCircle, Loader2, AlertTriangle, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/integrations/supabase/client";
import { EscrowService } from "@/utils/escrow-service";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ServiceBookingFormProps {
  service: any;
  onBookingSuccess?: () => void;
}

const formSchema = z.object({
  date: z.date({
    required_error: "Please select a date",
  }).refine(date => date >= new Date(new Date().setHours(0, 0, 0, 0)), {
    message: "Booking date cannot be in the past",
  }),
  time: z.string().min(1, "Please select a time"),
  location: z.string().min(3, "Please provide a location"),
  notes: z.string().optional(),
});

export function ServiceBookingForm({ service, onBookingSuccess }: ServiceBookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [existingBooking, setExistingBooking] = useState<any>(null);
  const [checkingBookings, setCheckingBookings] = useState(true);
  const [kycVerified, setKycVerified] = useState(false);
  const [providerKycVerified, setProviderKycVerified] = useState(false);
  const [checkingKyc, setCheckingKyc] = useState(true);
  const { user } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get tomorrow as the default date to avoid any timezone issues with today
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: tomorrow,
      time: "10:00",
      location: "",
      notes: "",
    },
  });

  // Check for existing bookings when component loads
  useEffect(() => {
    async function checkExistingBookings() {
      if (!user || !service) {
        setCheckingBookings(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("service_id", service.id)
          .eq("customer_id", user.id)
          .or("status.eq.pending,status.eq.confirmed,status.eq.pending_completion")
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          setExistingBooking(data[0]);
        }
      } catch (error) {
        console.error("Error checking existing bookings:", error);
      } finally {
        setCheckingBookings(false);
      }
    }

    checkExistingBookings();
  }, [user, service]);

  // Check KYC verification status
  useEffect(() => {
    async function checkKycStatus() {
      if (!user || !service) {
        setCheckingKyc(false);
        return;
      }

      try {
        // For customers, we don't need to check their KYC status as regular users don't need verification
        setKycVerified(true); // Regular users are always considered verified
        
        // We only check provider KYC status since they're a business offering services
        const { data: providerData, error: providerError } = await supabase
          .from("profiles")
          .select("kyc_verified, user_role")
          .eq("id", service.owner_id)
          .single();

        if (providerError) throw providerError;

        // Only enforce KYC for business accounts
        const isProviderBusiness = providerData?.user_role === "business";
        setProviderKycVerified(!isProviderBusiness || providerData?.kyc_verified === true);
      } catch (error) {
        console.error("Error checking KYC status:", error);
      } finally {
        setCheckingKyc(false);
      }
    }

    checkKycStatus();
  }, [user, service]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to book this service",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!service) {
      toast({
        title: "Error",
        description: "Service information is missing",
        variant: "destructive",
      });
      return;
    }

    // Check KYC verification before proceeding
    if (!providerKycVerified) {
      toast({
        title: "Service Provider Verification Required",
        description: "The service provider has not completed verification yet. Please check back later or choose another service.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if the user already has an active booking for this service
      const { data: existingBookings, error: checkError } = await supabase
        .from("bookings")
        .select("*")
        .eq("service_id", service.id)
        .eq("customer_id", user.id)
        .or("status.eq.pending,status.eq.confirmed")
        .limit(1);

      if (checkError) throw checkError;

      if (existingBookings && existingBookings.length > 0) {
        toast({
          title: "Booking exists",
          description: "You already have an active booking for this service. Please check your bookings page.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Combine date and time
      const scheduledDateTime = new Date(values.date);
      const [hours, minutes] = values.time.split(":").map(Number);
      scheduledDateTime.setHours(hours, minutes);

      // Create a booking entry
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          service_id: service.id,
          customer_id: user.id,
          provider_id: service.owner_id,
          status: "pending",
          notes: `Date: ${format(scheduledDateTime, "PPP")}\nTime: ${format(scheduledDateTime, "p")}\nLocation: ${values.location}${values.notes ? `\n\nAdditional Notes: ${values.notes}` : ""}`,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create an escrow payment for this booking
      const escrowPayment = await EscrowService.createPayment(
        bookingData.id,
        service.price,
        user.id,
        service.owner_id,
        service.id
      );

      // Create a notification for the service provider
      await supabase.from("notifications").insert({
        user_id: service.owner_id, // Send to service provider
        type: "booking",
        title: "New Booking Request",
        message: `You have a new booking request for ${service.title}`,
        is_read: false,
        data: JSON.stringify({
          booking_id: bookingData.id,
          service_id: service.id,
          service_title: service.title,
        }),
      });

      setBookingComplete(true);
      toast({
        title: "Booking successful",
        description: "Your booking request has been sent to the service provider",
      });

      if (onBookingSuccess) {
        onBookingSuccess();
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      toast({
        title: "Booking failed",
        description: "There was an error processing your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to extract booking details from notes
  const getBookingDetails = (notes: string) => {
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

  // Function to get a human-readable status
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Approval';
      case 'confirmed': return 'Confirmed';
      case 'pending_completion': return 'Pending Completion';
      case 'completed': return 'Completed';
      case 'canceled': return 'Canceled';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (checkingBookings || checkingKyc) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center items-center min-h-[200px]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Checking booking status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (existingBooking) {
    const bookingDetails = getBookingDetails(existingBooking.notes);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ongoing Booking</CardTitle>
          <CardDescription>
            You already have an active booking for this service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/20">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <h3 className="font-medium">{service.title}</h3>
                <Badge className="max-w-[110px] truncate">{getStatusDisplay(existingBooking.status)}</Badge>
              </div>
              
              {bookingDetails.date && (
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{bookingDetails.date}</span>
                </div>
              )}
              
              {bookingDetails.time && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{bookingDetails.time}</span>
                </div>
              )}
              
              {bookingDetails.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{bookingDetails.location}</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            You cannot book this service again until your current booking is completed or canceled.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => navigate("/bookings")}>View My Bookings</Button>
          <Button onClick={() => navigate(`/services/${service.id}`)}>Service Details</Button>
        </CardFooter>
      </Card>
    );
  }

  if (!providerKycVerified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Provider Verification Required</CardTitle>
          <CardDescription>
            The service provider has not completed verification yet. Please check back later or choose another service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Verification Required</AlertTitle>
            <AlertDescription>
              The service provider has not completed their identity verification yet.
              Please check back later or choose another service.
            </AlertDescription>
          </Alert>
          
          <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/20">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm">
              KYC verification protects both customers and service providers by 
              ensuring everyone on the platform has been properly identified.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => navigate(`/discover?tab=services`)}>
            Browse Other Services
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (bookingComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Booking Successful</CardTitle>
          <CardDescription>
            Your booking request has been sent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center p-8">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <p className="text-center">
            We've sent your booking request to the service provider. You'll receive a notification when they confirm your booking.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => navigate("/bookings")}>View My Bookings</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book this Service</CardTitle>
        <CardDescription>
          Fill out the form below to request a booking
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service">Service</Label>
            <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/20">
              <div className="h-10 w-10 rounded-md overflow-hidden bg-muted">
                {service.image ? (
                  <img
                    src={service.image}
                    alt={service.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-bold">
                    {service.title.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-medium">{service.title}</h3>
                <div className="flex items-center text-sm text-muted-foreground">
                  <DollarSign className="h-3 w-3 mr-1" />
                  ${service.price}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.watch("date") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("date") ? (
                      format(form.watch("date"), "PPP")
                    ) : (
                      <span>Select date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.watch("date")}
                    onSelect={(date) => {
                      if (date) {
                        form.setValue("date", date, { shouldValidate: true });
                      }
                    }}
                    disabled={(date) => 
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.date && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.date.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  {...form.register("time")}
                />
              </div>
              {form.formState.errors.time && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.time.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
              <Input
                id="location"
                placeholder="Enter the service location"
                {...form.register("location")}
              />
            </div>
            {form.formState.errors.location && (
              <p className="text-sm text-red-500">
                {form.formState.errors.location.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special requirements or information for the service provider"
              rows={3}
              {...form.register("notes")}
            />
          </div>

          <div className="py-2 px-3 bg-muted/30 rounded-md text-sm">
            <p className="font-medium mb-1">Payment Information</p>
            <p className="text-muted-foreground">
              Your payment of ${service.price} will be held securely in escrow until the service is completed.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Book Now"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 