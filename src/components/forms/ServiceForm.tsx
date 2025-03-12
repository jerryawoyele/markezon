import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";

interface ServiceFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    category: string;
    price: string;
    image?: string;
    id?: string;
    user_id?: string;
    created_at?: string;
  }) => void;
  onCancel: () => void;
  initialData?: {
    title?: string;
    description?: string;
    category?: string;
    price?: string;
    image?: string;
  };
}

export function ServiceForm({ onSubmit, onCancel, initialData }: ServiceFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [price, setPrice] = useState(initialData?.price || "");
  const [image, setImage] = useState(initialData?.image || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !price.trim() || !category.trim()) {
      return;
    }

    setLoading(true);
    try {
      const serviceData = {
        id: crypto.randomUUID(),
        title,
        description,
        category,
        price,
        image,
        created_at: new Date().toISOString(),
      };

      onSubmit(serviceData);
    } catch (error) {
      console.error("Error submitting service:", error);
    } finally {
      setLoading(false);
    }
  };

  // Common service categories
  const serviceCategories = [
    "Web Development",
    "Mobile App Development",
    "UI/UX Design",
    "Graphic Design",
    "Digital Marketing",
    "Content Writing",
    "Photography",
    "Video Production",
    "Social Media Management",
    "SEO Services",
    "Business Consulting",
    "Other"
  ];

  const handleImageUpload = (url: string) => {
    setImage(url);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Service Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Logo Design, Web Development"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select 
          value={category} 
          onValueChange={setCategory}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {serviceCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your service in detail"
          required
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Price ($)</Label>
        <Input
          id="price"
          type="text"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g., 100, 250, etc."
          required
        />
      </div>

      <div className="space-y-2">
        <FileUpload 
          endpoint="serviceImage" 
          onChange={handleImageUpload}
          className="w-full"
        />
        {image && (
          <div className="mt-2">
            <p className="text-sm text-muted-foreground mb-1">Preview:</p>
            <img 
              src={image} 
              alt="Service preview" 
              className="max-h-32 rounded-md border"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading || !title || !description || !price || !category}
        >
          {loading ? "Adding..." : "Add Service"}
        </Button>
      </div>
    </form>
  );
} 