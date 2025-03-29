import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CreditCard, Loader2 } from "lucide-react";
import { createPromotedPost } from "@/services/promotedPosts";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface PromotePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  userId: string;
}

const formSchema = z.object({
  promotionLevel: z.enum(["basic", "premium", "featured"], {
    required_error: "Please select a promotion level",
  }),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  budget: z.number().min(5, {
    message: "Budget must be at least $5",
  }).optional(),
  targetAudience: z.string().optional(),
});

export function PromotePostModal({ isOpen, onClose, postId, userId }: PromotePostModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'form' | 'payment' | 'processing'>('form');
  const [formValues, setFormValues] = useState<z.infer<typeof formSchema> | null>(null);
  const { toast } = useToast();
  
  const defaultValues = {
    promotionLevel: "basic" as const,
    startDate: new Date(),
    endDate: addDays(new Date(), 7),
    budget: 5,
    targetAudience: "",
  };
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const proceedToPayment = async (values: z.infer<typeof formSchema>) => {
    setFormValues(values);
    setPaymentStep('payment');
  };
  
  const handlePaymentComplete = async () => {
    if (!formValues) return;
    
    setPaymentStep('processing');
    setIsSubmitting(true);
    
    try {
      // Create Stripe session
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-promotion-payment', {
        body: {
          promotionLevel: formValues.promotionLevel,
          startDate: formValues.startDate.toISOString(),
          endDate: formValues.endDate.toISOString(),
          postId,
          userId,
          budget: formValues.budget || getPriceFromLevel(formValues.promotionLevel),
        },
      });
      
      if (sessionError) {
        throw new Error(`Error creating payment session: ${sessionError.message}`);
      }
      
      // Redirect to Stripe Checkout
      if (sessionData?.url) {
        window.location.href = sessionData.url;
        return; // User will be redirected, so we'll return here
      } else {
        throw new Error('No payment URL returned');
      }
    } catch (error) {
      console.error("Error initiating payment:", error);
      setPaymentStep('form');
      toast({
        title: "Payment failed",
        description: "Could not initiate payment process. Please try again. CORS issues may occur in development.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const createPromotion = async () => {
    if (!formValues) return;
    
    setIsSubmitting(true);
    
    try {
      const result = await createPromotedPost(
        postId,
        userId,
        formValues.promotionLevel,
        formValues.startDate,
        formValues.endDate,
        formValues.targetAudience || undefined,
        formValues.budget
      );
      
      if (result) {
        toast({
          title: "Post promotion created",
          description: `Your post will be promoted from ${format(formValues.startDate, "MMM dd")} to ${format(formValues.endDate, "MMM dd")}`,
        });
        onClose();
      } else {
        toast({
          title: "Failed to promote post",
          description: "An error occurred while creating the promotion",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error promoting post:", error);
      toast({
        title: "Failed to promote post",
        description: "An error occurred while creating the promotion",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = form.handleSubmit(proceedToPayment);
  
  const getPriceFromLevel = (level: string): number => {
    switch (level) {
      case 'basic': return 5;
      case 'premium': return 15;
      case 'featured': return 30;
      default: return 5;
    }
  };

  const PRICING = {
    basic: {
      price: "$5/week",
      features: ["Basic visibility boost", "Small badge on post"],
    },
    premium: {
      price: "$15/week",
      features: ["Higher visibility", "Premium badge", "Targeted audience"],
    },
    featured: {
      price: "$30/week",
      features: ["Highest visibility", "Featured badge", "Priority placement", "Detailed analytics"],
    },
  };

  const handleModalClose = () => {
    setPaymentStep('form');
    setFormValues(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Promote Your Post</DialogTitle>
          <DialogDescription>
            {paymentStep === 'form' && "Increase visibility and reach more potential customers"}
            {paymentStep === 'payment' && "Complete payment to activate your promotion"}
            {paymentStep === 'processing' && "Processing your payment..."}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 overflow-auto px-1">
          {paymentStep === 'form' && (
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-6">
                <FormField
                  control={form.control}
                  name="promotionLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Promotion Level</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a promotion level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="basic">
                            <div className="flex justify-between w-full">
                              <span>Basic</span>
                              <span className="text-muted-foreground">{PRICING.basic.price}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="premium">
                            <div className="flex justify-between w-full">
                              <span>Premium</span>
                              <span className="text-muted-foreground">{PRICING.premium.price}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="featured">
                            <div className="flex justify-between w-full">
                              <span>Featured</span>
                              <span className="text-muted-foreground">{PRICING.featured.price}</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="mt-1.5">
                        <span className="text-sm text-muted-foreground">Features:</span>
                        {form.watch("promotionLevel") && (
                          <ul className="list-disc pl-5 text-sm mt-1">
                            {PRICING[form.watch("promotionLevel")].features.map((feature, i) => (
                              <li key={i}>{feature}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => 
                                date < new Date() || 
                                date < form.getValues("startDate")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={5}
                          step={1}
                          placeholder="Enter your budget"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum $5 for promotion. Higher budgets may increase visibility.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Homeowners, Students, Businesses"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Describe your target audience to help us optimize your promotion
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={handleModalClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    Continue to Payment
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
          
          {paymentStep === 'payment' && formValues && (
            <div className="space-y-6 py-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">Promotion Summary</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Level:</dt>
                    <dd className="font-medium">{formValues.promotionLevel}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Duration:</dt>
                    <dd className="font-medium">
                      {format(formValues.startDate, "MMM dd")} - {format(formValues.endDate, "MMM dd")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Amount:</dt>
                    <dd className="font-medium">${formValues.budget || getPriceFromLevel(formValues.promotionLevel)}.00</dd>
                  </div>
                </dl>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Payment Information
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You'll be redirected to our secure payment provider to complete your transaction.
                </p>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6">
                      <path d="M2 7C2 5.89543 2.89543 5 4 5H20C21.1046 5 22 5.89543 22 7V17C22 18.1046 21.1046 19 20 19H4C2.89543 19 2 18.1046 2 17V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 10H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5 15H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-sm text-muted-foreground">Secure payments by Stripe</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-blue-600 text-white rounded px-1 py-0.5 h-6 flex items-center">
                      <span className="text-xs font-bold">VISA</span>
                    </div>
                    <div className="flex h-6">
                      <div className="w-3 h-6 bg-red-500 rounded-l-sm"></div>
                      <div className="w-3 h-6 bg-yellow-400 rounded-r-sm"></div>
                    </div>
                    <div className="bg-blue-400 text-white rounded px-1 py-0.5 h-6 flex items-center">
                      <span className="text-xs font-bold">AMEX</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setPaymentStep('form')}>
                  Back
                </Button>
                <Button
                  onClick={handlePaymentComplete}
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Pay & Promote Post"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
          
          {paymentStep === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium mb-2">Processing your payment</p>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Please wait while we process your payment. You'll be redirected to the payment page shortly.
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 