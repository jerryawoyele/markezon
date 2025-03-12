import { useState, useEffect } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ServiceCard } from "@/components/services/ServiceCard";
import { Plus, Edit2, Trash2, Users, ShoppingCart } from "lucide-react";
import { Sidebar } from "@/components/home/Sidebar";
import { MobileHeader } from "@/components/home/MobileHeader";
import { useNavigate } from "react-router-dom";
import { uploadFileWithFallback, generateFilePath } from "@/utils/upload-helper";
import { AddServiceModal } from "@/components/services/AddServiceModal";
import { ServiceBookingsModal } from "@/components/services/ServiceBookingsModal";
import { Badge } from "@/components/ui/badge";

// Define Service interface here since we're not importing it from @/types
interface Service {
  id: string;
  title: string;
  description: string;
  price: string;
  image: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  category: string;
  bookingsCount?: number;
}

export default function Services() {
  const [activeTab, setActiveTab] = useState("Services");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"business" | "customer" | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const navigate = useNavigate();
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  
  // Bookings state
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [selectedServiceForBookings, setSelectedServiceForBookings] = useState<Service | null>(null);
  
  const { toast } = useToast();
  
  // Always set active tab to Services when this page loads for business owners
  useEffect(() => {
    if (userRole === "business") {
      setActiveTab("Services");
    }
  }, [userRole]);
  
  const fetchServices = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      if (!user) {
        navigate('/auth');
        return;
      }
      
      const { data: servicesData, error } = await supabase
        .from('services')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // If we have services, fetch booking counts for each service
      if (servicesData && servicesData.length > 0) {
        const servicesWithBookingCounts = await Promise.all(servicesData.map(async (service) => {
          try {
            // Count the bookings for this service
            const { count, error: countError } = await supabase
              .from('bookings')
              .select('*', { count: 'exact', head: true })
              .eq('service_id', service.id);
              
            if (countError) {
              console.error("Error counting bookings for service", service.id, countError);
              return {
                ...service,
                bookingsCount: 0
              };
            }
            
            return {
              ...service,
              bookingsCount: count || 0
            };
          } catch (e) {
            console.error("Error processing bookings count", e);
            return {
              ...service,
              bookingsCount: 0
            };
          }
        }));
        
        setServices(servicesWithBookingCounts);
      } else {
        setServices(servicesData || []);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      toast({
        variant: "destructive",
        title: "Failed to load services",
        description: "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const fetchUserAndServices = async () => {
      try {
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/auth");
          return;
        }
        
        // Fetch the user's profile to get their role
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_role')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error("Error fetching user profile:", profileError);
        }
        
        // Check for user_role (new schema) or role (old schema)
        if (profileData) {
          if ('user_role' in profileData && profileData.user_role) {
            setUserRole(profileData.user_role as "business" | "customer");
          } else if ('role' in profileData && profileData.role) {
            setUserRole(profileData.role as "business" | "customer");
          }
          
          console.log("User role set to:", profileData.user_role || profileData.role || "No role detected");
        }
        
        // Fetch services
        await fetchServices();
        
      } catch (error) {
        console.error("Error fetching services:", error);
        toast({
          variant: "destructive",
          title: "Failed to load services",
          description: "Please try again later.",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndServices();
  }, [navigate, toast]);
  
  const handleAddService = async (serviceData?: any) => {
    setFormLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) throw new Error("User not authenticated");

      let finalImageUrl = '';
      
      // If serviceData is provided, use it (coming from AddServiceModal directly)
      if (serviceData) {
        const newService = {
          title: serviceData.title,
          description: serviceData.description,
          price: serviceData.price,
          image: serviceData.image || '',
          owner_id: user.id,
          category: serviceData.category || 'general'
        };

        // Insert service
        const { data, error } = await supabase
          .from('services')
          .insert(newService)
          .select();
          
        if (error) throw error;
        
        // Refresh services list
        await fetchServices();
        
        toast({
          title: "Success",
          description: "Your service has been added successfully",
        });
        
        // Reset form and close modal
        resetForm();
        setShowAddModal(false);
        return;
      }
      
      // Otherwise use the form data directly
      // Upload image if present
      if (image) {
        // Check if it's a BMP file
        if (image.name.toLowerCase().endsWith('.bmp')) {
          toast({
            title: "Converting image format",
            description: "BMP files may cause upload issues. Converting to PNG format...",
            duration: 3000
          });
          
          // Log for debugging
          console.log("Handling BMP file:", image.name);
          console.log("File size:", Math.round(image.size / 1024), "KB");
          console.log("Content type:", image.type);
        }
        
        const filePath = generateFilePath(image, user.id, 'service');
        const uploadResult = await uploadFileWithFallback(image, filePath, {
          uiCallback: (status, message) => status === 'error' && console.warn(message)
        });
        finalImageUrl = uploadResult.url;
      }

      const newService = {
        title,
        description,
        price,
        image: finalImageUrl,
        owner_id: user.id,
        category: 'general'
      };

      // Insert service
      const { data, error } = await supabase
        .from('services')
        .insert(newService)
        .select();
        
      if (error) throw error;
      
      // Refresh services list
      await fetchServices();
      
      toast({
        title: "Success",
        description: "Your service has been added successfully",
      });
      
      // Reset form and close modal
      resetForm();
      setShowAddModal(false);
    } catch (error) {
      console.error("Error adding service:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add service",
      });
    } finally {
      setFormLoading(false);
    }
  };
  
  const handleEditService = async () => {
    setFormLoading(true);

    try {
      if (!selectedService) throw new Error("No service selected");

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) throw new Error("User not authenticated");

      let imageUrl = selectedService?.image || '';

      if (image) {
        // Check if it's a BMP file
        if (image.name.toLowerCase().endsWith('.bmp')) {
          toast({
            title: "Converting image format",
            description: "BMP files may cause upload issues. Converting to PNG format...",
            duration: 3000
          });
          
          // Log for debugging
          console.log("Handling BMP file:", image.name);
          console.log("File size:", Math.round(image.size / 1024), "KB");
          console.log("Content type:", image.type);
        }
        
        const filePath = generateFilePath(image, user.id, 'service');
        const uploadResult = await uploadFileWithFallback(image, filePath, {
          uiCallback: (status, message) => {
            if (status === 'error')
              toast({ variant: "destructive", title: "Image Upload Issue", description: message || "Using local image as fallback." });
          }
        });
        imageUrl = uploadResult.url;
      }

      interface ServiceUpdate {
        title: string;
        description: string;
        price: string;
        image?: string;
        category?: string;
      }

      const newService: ServiceUpdate = {
        title,
        description,
        price,
        category: selectedService?.category || 'general'
      };

      if (imageUrl) {
        newService.image = imageUrl;
      }

      // Additional check to prevent errors with paths that might contain special characters
      if (newService.image && newService.image.includes('service-images')) {
        try {
          // Verify URL is properly formed
          new URL(newService.image);
        } catch (urlError) {
          console.error("Invalid image URL:", urlError);
          
          // Attempt to fix malformed URL by encoding components
          const parts = newService.image.split('/');
          const filename = parts.pop();
          
          if (filename) {
            const encodedFilename = encodeURIComponent(filename);
            newService.image = [...parts, encodedFilename].join('/');
            console.log("Fixed image URL:", newService.image);
          }
        }
      }

      // Update service
      const { error } = await supabase
        .from('services')
        .update(newService)
        .eq('id', selectedService.id);
        
      if (error) throw error;
      
      // Refresh services list
      await fetchServices();
      
      toast({
        title: "Success",
        description: "Your service has been updated successfully",
      });
      
      // Reset form and close modal
      resetForm();
      setShowEditModal(false);
    } catch (error) {
      console.error("Error updating service:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update service",
      });
    } finally {
      setFormLoading(false);
    }
  };
  
  const handleDeleteService = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setServices(services.filter(service => service.id !== id));
      
      toast({
        title: "Service deleted",
        description: "Your service has been deleted successfully",
      });
      
      // Refresh services list
      await fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete service",
      });
    }
  };
  
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setImage(null);
    setImageUrl("");
    setSelectedService(null);
  };
  
  const handleEditClick = (service: Service) => {
    setSelectedService(service);
    setTitle(service.title);
    setDescription(service.description);
    setPrice(service.price);
    setImageUrl(service.image);
    setShowEditModal(true);
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };
  
  const handleViewBookings = (service: Service) => {
    setSelectedServiceForBookings(service);
    setShowBookingsModal(true);
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar activeTab="Services" setActiveTab={setActiveTab} userRole={userRole} />
        <div className="flex-1 lg:ml-64">
          <MobileHeader />
          <div className="container mx-auto py-8 px-4 flex justify-center items-center h-[calc(100vh-80px)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary border-r-2 mx-auto mb-4"></div>
              <p className="text-white/70">Loading services...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <MainLayout activeTab="Services" setActiveTab={setActiveTab} userRole={userRole}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Services</h1>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-0">
                  <div className="h-48 bg-white/5" />
                </CardContent>
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-4 bg-white/10 rounded w-2/4" />
                </div>
              </Card>
            ))}
          </div>
        ) : services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(service => (
              <Card key={service.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {service.image ? (
                    <img 
                      src={service.image} 
                      alt={service.title} 
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.querySelector('.no-image-placeholder')?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-full h-48 bg-white/5 flex items-center justify-center no-image-placeholder ${service.image ? 'hidden' : ''}`}
                  >
                    <span className="text-white/40">No image</span>
                  </div>
                </CardContent>
                <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium">{service.title}</h3>
                    <Badge variant="outline">{service.category}</Badge>
                  </div>
                  <p className="text-white/60 text-sm line-clamp-2 mb-2">{service.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="font-bold">${service.price}</span>
                      <div className="flex items-center mt-1 text-xs text-white/60">
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        <span>{service.bookingsCount || 0} bookings</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleViewBookings(service)}
                        title="View Bookings"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditClick(service)}
                        title="Edit Service"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteService(service.id)}
                        title="Delete Service"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <CardTitle className="mb-2">No services yet</CardTitle>
            <CardDescription className="mb-4">
              Start by adding your first service to showcase to potential customers.
            </CardDescription>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Service
            </Button>
          </Card>
        )}
      </div>
      
      {/* Add Service Modal */}
      <AddServiceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddService={handleAddService}
        title={title}
        description={description}
        price={price}
        image={image}
        imageUrl={imageUrl}
        onTitleChange={(e) => setTitle(e.target.value)}
        onDescriptionChange={(e) => setDescription(e.target.value)}
        onPriceChange={(e) => setPrice(e.target.value)}
        onImageChange={handleImageChange}
        loading={formLoading}
      />
      
      {/* Edit Service Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>
              Update your service details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[calc(90vh-180px)] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Service Title</Label>
              <Input
                id="edit-title"
                placeholder="e.g., Logo Design"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe what you offer..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-price">Price</Label>
              <Input
                id="edit-price"
                placeholder="e.g., 50.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-image">Service Image</Label>
              {imageUrl && (
                <div className="mb-2">
                  <img src={imageUrl} alt="Current" className="w-full max-h-32 object-cover rounded-md" />
                </div>
              )}
              <Input
                id="edit-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              <p className="text-xs text-muted-foreground">Leave empty to keep current image</p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              resetForm();
              setShowEditModal(false);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditService}
              disabled={formLoading || !title.trim() || !description.trim() || !String(price).trim()}
            >
              {formLoading ? "Updating..." : "Update Service"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Service Bookings Modal */}
      {selectedServiceForBookings && (
        <ServiceBookingsModal
          serviceId={selectedServiceForBookings.id}
          serviceName={selectedServiceForBookings.title}
          isOpen={showBookingsModal}
          onClose={() => setShowBookingsModal(false)}
        />
      )}
    </MainLayout>
  );
} 