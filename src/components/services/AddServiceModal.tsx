
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

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceAdded: (service: ServiceType) => void;
}

export function AddServiceModal({ isOpen, onClose, onServiceAdded }: AddServiceModalProps) {
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
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        business: formData.business || null,
        price: formData.price || null,
        features: filteredFeatures.length > 0 ? filteredFeatures : null,
        user_id: userData.user.id
      };

      const { data, error } = await supabase
        .from('services')
        .insert(newService)
        .select()
        .single();

      if (error) throw error;
      
      onServiceAdded(data as ServiceType);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New Service</DialogTitle>
          <DialogDescription>
            Create a new service to showcase your skills and offerings.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] overflow-y-auto pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input 
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Service title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea 
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your service"
                required
                rows={4}
              />
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="image">Image URL *</Label>
              <Input 
                id="image"
                name="image"
                value={formData.image}
                onChange={handleInputChange}
                placeholder="Image URL for your service"
                required
              />
              <p className="text-xs text-gray-500">
                Provide a URL to an image that represents your service. Use services like Unsplash for free images.
              </p>
            </div>

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
              <Label htmlFor="price">Pricing</Label>
              <Input 
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="e.g. $100/hour or Starting from $500"
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

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Service'}
              </Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
