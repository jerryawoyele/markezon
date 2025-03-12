import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ServiceType } from "@/types";
import { FileUpload } from "@/components/FileUpload";

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceAdded?: (service: ServiceType) => void;
  onAddService?: (serviceData: any) => Promise<void>;
  
  // For direct control mode (Services page)
  title?: string;
  description?: string;
  price?: string;
  image?: File | null;
  imageUrl?: string;
  onTitleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onPriceChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading?: boolean;
}

export function AddServiceModal({ 
  isOpen, 
  onClose, 
  onServiceAdded, 
  onAddService,
  title: externalTitle, 
  description: externalDescription, 
  price: externalPrice,
  image: externalImage,
  imageUrl: externalImageUrl,
  onTitleChange,
  onDescriptionChange,
  onPriceChange,
  onImageChange,
  loading: externalLoading
}: AddServiceModalProps) {
  // Use internal state management if external props are not provided
  const isDirectControlMode = onAddService !== undefined;
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    image: '',
    business: '',
    price: '',
    features: ['']
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (isDirectControlMode) {
      // Direct mode - use the passed change handlers
      if (name === 'title' && onTitleChange) {
        onTitleChange(e as React.ChangeEvent<HTMLInputElement>);
      } else if (name === 'description' && onDescriptionChange) {
        onDescriptionChange(e as React.ChangeEvent<HTMLTextAreaElement>);
      } else if (name === 'price' && onPriceChange) {
        onPriceChange(e as React.ChangeEvent<HTMLInputElement>);
      }
    } else {
      // Local state mode
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, category: value }));
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData(prev => ({ ...prev, features: newFeatures }));
  };

  const addFeature = () => {
    setFormData(prev => ({ 
      ...prev, 
      features: [...prev.features, ''] 
    }));
  };

  const removeFeature = (index: number) => {
    const newFeatures = [...formData.features];
    newFeatures.splice(index, 1);
    setFormData(prev => ({ ...prev, features: newFeatures }));
  };

  const handleImageUpload = (url: string) => {
    if (isDirectControlMode) {
      // In direct control mode, we don't use this method
      // as the parent component handles image upload
    } else {
      setFormData(prev => ({ ...prev, image: url }));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDirectControlMode && onImageChange) {
      onImageChange(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDirectControlMode && onAddService) {
      await onAddService({
        title: externalTitle,
        description: externalDescription,
        price: externalPrice,
        image: externalImageUrl,
      });
      return;
    }
    
    setIsLoading(true);

    try {
      // Filter out empty features
      const filteredFeatures = formData.features.filter(f => f.trim() !== '');
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      const newService = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        image: formData.image,
        price: formData.price || "0",
        owner_id: userData.user.id
      };

      // If onServiceAdded is provided, let the parent component handle the database insertion
      if (onServiceAdded) {
        onServiceAdded(newService as ServiceType);
        onClose();
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          category: '',
          image: '',
          business: '',
          price: '',
          features: ['']
        });
        return;
      }

      // Otherwise, handle the insertion here
      const { data, error } = await supabase
        .from('services')
        .insert(newService)
        .select()
        .single();

      if (error) throw error;
      
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        image: '',
        business: '',
        price: '',
        features: ['']
      });
    } catch (error) {
      console.error('Error adding service:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine loading state based on mode
  const loading = isDirectControlMode ? externalLoading : isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add New Service</DialogTitle>
          <DialogDescription>
            Create a new service to showcase your skills and offerings.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              {isDirectControlMode ? (
                <Input 
                  id="title"
                  name="title"
                  value={externalTitle}
                  onChange={handleInputChange}
                  placeholder="Service title"
                  required
                />
              ) : (
                <Input 
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Service title"
                  required
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              {isDirectControlMode ? (
                <Textarea 
                  id="description"
                  name="description"
                  value={externalDescription}
                  onChange={handleInputChange}
                  placeholder="Describe your service"
                  required
                  rows={4}
                />
              ) : (
                <Textarea 
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your service"
                  required
                  rows={4}
                />
              )}
            </div>

            {!isDirectControlMode && (
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={handleSelectChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Development">Development</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Writing">Writing</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Consulting">Consulting</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              {isDirectControlMode ? (
                <Input 
                  id="price"
                  name="price"
                  value={externalPrice}
                  onChange={handleInputChange}
                  placeholder="e.g. $100/hour or Starting from $500"
                  required
                />
              ) : (
                <Input 
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="e.g. $100/hour or Starting from $500"
                  required
                />
              )}
            </div>

            <div className="space-y-2">
              {isDirectControlMode ? (
                <>
                  <Label htmlFor="image">Service Image</Label>
                  <Input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                  />
                  {externalImageUrl && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-1">Preview:</p>
                      <img 
                        src={externalImageUrl} 
                        alt="Service preview" 
                        className="max-h-32 rounded-md border"
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <FileUpload 
                    endpoint="serviceImage" 
                    onChange={handleImageUpload}
                    className="w-full"
                  />
                  {formData.image && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-1">Preview:</p>
                      <img 
                        src={formData.image} 
                        alt="Service preview" 
                        className="max-h-32 rounded-md border"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {!isDirectControlMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="business">Business Name</Label>
                  <Input 
                    id="business"
                    name="business"
                    value={formData.business}
                    onChange={handleInputChange}
                    placeholder="Your business name (optional)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Features</Label>
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input 
                        value={feature}
                        onChange={(e) => handleFeatureChange(index, e.target.value)}
                        placeholder={`Feature ${index + 1}`}
                      />
                      {formData.features.length > 1 && (
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon"
                          onClick={() => removeFeature(index)}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addFeature}
                  >
                    Add Feature
                  </Button>
                </div>
              </>
            )}

            <DialogFooter className="mt-6">
              <Button 
                variant="outline" 
                onClick={() => onClose()}
                type="button"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                onClick={handleSubmit}
                disabled={loading || (isDirectControlMode ? 
                  !externalTitle?.trim() || !externalDescription?.trim() || !String(externalPrice).trim() :
                  !formData.title.trim() || !formData.description.trim() || !formData.price.trim()
                )}
              >
                {loading ? "Adding..." : "Add Service"}
              </Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
