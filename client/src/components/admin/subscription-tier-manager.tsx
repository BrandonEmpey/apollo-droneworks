import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Edit, Trash2, Check, X, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Service, SubscriptionTier } from "@shared/schema";

interface TierFormData {
  name: string;
  description: string;
  price: number;
  frequency: string;
  features: string[];
  isPopular: boolean;
  displayOrder: number;
}

interface TierEditorProps {
  tier?: SubscriptionTier;
  serviceId: number;
  service: Service;
  onClose: () => void;
  isOpen: boolean;
}

function TierEditor({ tier, serviceId, service, onClose, isOpen }: TierEditorProps) {
  const isEditing = !!tier;
  const queryClient = useQueryClient();
  
  // Form state
  const [formData, setFormData] = useState<TierFormData>({
    name: tier?.name || "",
    description: tier?.description || "",
    price: tier?.price ? tier.price / 100 : 0, // Convert cents to dollars for the form
    frequency: tier?.frequency || "monthly",
    features: tier?.features || [],
    isPopular: tier?.isPopular || false,
    displayOrder: tier?.displayOrder || 100
  });
  
  // New feature state
  const [newFeature, setNewFeature] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  
  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };
  
  // Handle frequency selection and update price based on service pricing
  const handleFrequencyChange = (value: string) => {
    let updatedPrice = formData.price;
    
    // Update price based on the new frequency
    if (value === "monthly" && service.monthlyPrice) {
      updatedPrice = service.monthlyPrice / 100;
    } else if (value === "bi-weekly" && service.biWeeklyPrice) {
      updatedPrice = service.biWeeklyPrice / 100;
    } else if (value === "weekly" && service.weeklyPrice) {
      updatedPrice = service.weeklyPrice / 100;
    }
    
    setFormData({ 
      ...formData, 
      frequency: value,
      price: updatedPrice
    });
  };
  
  // Handle popular toggle
  const handlePopularToggle = (checked: boolean) => {
    setFormData({ ...formData, isPopular: checked });
  };
  
  // Add a new feature
  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()]
      });
      setNewFeature("");
    }
  };
  
  // Remove a feature
  const handleRemoveFeature = (index: number) => {
    const updatedFeatures = [...formData.features];
    updatedFeatures.splice(index, 1);
    setFormData({ ...formData, features: updatedFeatures });
  };
  
  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: TierFormData) => {
      // Convert dollars to cents for the API
      const apiData = {
        ...data,
        price: Math.round(data.price * 100),
        serviceId: parseInt(serviceId.toString()) // Ensure serviceId is an integer
      };
      console.log("Creating tier with data:", apiData);
      const response = await apiRequest("POST", "/api/subscription-tiers", apiData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}/tiers`] });
      toast({
        title: "Success",
        description: "Subscription tier created successfully",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create subscription tier: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: TierFormData) => {
      // Convert dollars to cents for the API
      const apiData = {
        ...data,
        price: Math.round(data.price * 100),
        serviceId: parseInt(serviceId.toString()) // Ensure serviceId is an integer
      };
      console.log("Updating tier with data:", apiData);
      
      if (!tier?.id) {
        throw new Error("Cannot update tier: Missing tier ID");
      }
      
      const response = await apiRequest("PUT", `/api/subscription-tiers/${tier.id}`, apiData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}/tiers`] });
      toast({
        title: "Success",
        description: "Subscription tier updated successfully",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update subscription tier: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const isPriceValid = !isNaN(formData.price) && formData.price >= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!isPriceValid) return;
    console.log("Form submission - isEditing:", isEditing, "tier ID:", tier?.id);
    if (isEditing && tier?.id) {
      updateMutation.mutate(formData);
    } else {
      // Always use createMutation for new tiers or if tier ID is missing
      createMutation.mutate(formData);
    }
  };
  
  const isPending = createMutation.isPending || updateMutation.isPending;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit" : "Create"} Subscription Tier</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the subscription tier details below."
              : "Add a new subscription tier for this service."
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleChange}
                className="col-span-3"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price ($)
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  className={submitAttempted && !isPriceValid ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  required
                />
                {submitAttempted && !isPriceValid && (
                  <p className="text-xs text-red-500">Please enter a valid price</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="frequency" className="text-right">
                Frequency
              </Label>
              <Select 
                value={formData.frequency} 
                onValueChange={handleFrequencyChange}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select billing frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="displayOrder" className="text-right">
                Display Order
              </Label>
              <Input
                id="displayOrder"
                name="displayOrder"
                type="number"
                min="0"
                step="1"
                value={formData.displayOrder}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isPopular" className="text-right">
                Mark as Popular
              </Label>
              <div className="col-span-3 flex items-center">
                <Switch 
                  id="isPopular"
                  checked={formData.isPopular}
                  onCheckedChange={handlePopularToggle}
                />
                <span className="ml-2 text-sm text-muted-foreground">
                  {formData.isPopular ? "Featured as a popular choice" : "Not featured"}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <Label className="text-right mt-2">
                Features
              </Label>
              <div className="col-span-3 space-y-2">
                <div className="flex space-x-2">
                  <Input
                    id="newFeature"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="Add a feature..."
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={handleAddFeature}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {formData.features.map((feature, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between bg-secondary/50 p-2 rounded"
                    >
                      <div className="flex items-center">
                        <Check className="h-4 w-4 mr-2 text-primary" />
                        <span>{feature}</span>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveFeature(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {formData.features.length === 0 && (
                    <div className="text-sm text-muted-foreground italic p-2">
                      No features added yet. Features will be displayed as bullet points.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update" : "Create"} Tier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SubscriptionTierManager({ service }: { service: Service }) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | undefined>(undefined);
  const queryClient = useQueryClient();
  
  // Fetch subscription tiers for this service
  const { data: tiers = [], isLoading, error } = useQuery<SubscriptionTier[]>({
    queryKey: [`/api/services/${service.id}/tiers`],
    enabled: !!service.id && !!service.isSubscription
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (tierId: number) => {
      await apiRequest("DELETE", `/api/subscription-tiers/${tierId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: [`/api/services/${service.id}/tiers`] });
      toast({
        title: "Success",
        description: "Subscription tier deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete subscription tier: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleCreateTier = () => {
    // Use service prices as defaults when creating new tiers
    const newTier: Partial<SubscriptionTier> = {
      name: "", 
      description: "",
      price: 0, 
      frequency: service.billingFrequency || "monthly",
      features: [],
      isPopular: false,
      displayOrder: 100
    };
    
    // Set pricing based on service's pricing and default frequency
    if (newTier.frequency === "monthly" && service.monthlyPrice) {
      newTier.price = service.monthlyPrice;
    } else if (newTier.frequency === "bi-weekly" && service.biWeeklyPrice) {
      newTier.price = service.biWeeklyPrice;
    } else if (newTier.frequency === "weekly" && service.weeklyPrice) {
      newTier.price = service.weeklyPrice;
    }
    
    setSelectedTier(newTier as SubscriptionTier);
    setIsEditorOpen(true);
  };
  
  const handleEditTier = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    setIsEditorOpen(true);
  };
  
  const handleDeleteTier = (tierId: number) => {
    if (window.confirm("Are you sure you want to delete this subscription tier?")) {
      deleteMutation.mutate(tierId);
    }
  };
  
  const handleEditorClose = () => {
    setIsEditorOpen(false);
  };
  
  if (!service.isSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Tiers</CardTitle>
          <CardDescription>
            Enable subscription mode in the service settings to manage subscription tiers.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Subscription Tiers</CardTitle>
          <CardDescription>
            Create and manage subscription tiers for this service
          </CardDescription>
        </div>
        <Button onClick={handleCreateTier}>
          <Plus className="mr-2 h-4 w-4" />
          Add Tier
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
          </div>
        ) : error ? (
          <div className="text-center p-4 text-red-500">
            Failed to load subscription tiers
          </div>
        ) : (tiers && tiers.length > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiers.map((tier) => (
              <Card key={tier.id} className={`border ${tier.isPopular ? 'border-primary' : ''}`}>
                <CardHeader className="relative pb-2">
                  {tier.isPopular && (
                    <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                        Popular
                      </span>
                    </div>
                  )}
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <div className="flex flex-col">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">{formatCurrency(tier.price/100)}</span>
                      <span className="text-muted-foreground ml-1">/mo</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {tier.frequency === 'weekly' ? (
                        `(${formatCurrency((tier.price/100)/4)} per Report)`
                      ) : tier.frequency === 'bi-weekly' ? (
                        `(${formatCurrency((tier.price/100)/2)} per Report)`
                      ) : tier.frequency === 'monthly' ? (
                        `(${formatCurrency(tier.price/100)} per Report)`
                      ) : tier.frequency === 'quarterly' ? (
                        `(${formatCurrency((tier.price/100)/3)} per Report)`
                      ) : (
                        `(${formatCurrency((tier.price/100)/12)} per Report)`
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  {tier.description && (
                    <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
                  )}
                  <ul className="space-y-2">
                    {tier.features && tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-4 w-4 mr-2 mt-0.5 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    {(!tier.features || tier.features.length === 0) && (
                      <li className="text-sm text-muted-foreground italic">No features listed</li>
                    )}
                  </ul>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTier(tier)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteTier(tier.id)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-6 border rounded-lg bg-muted/30">
            <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No subscription tiers yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create subscription tiers to offer different pricing levels for this service.
            </p>
            <Button onClick={handleCreateTier}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Tier
            </Button>
          </div>
        )}
      </CardContent>
      
      {isEditorOpen && (
        <TierEditor
          tier={selectedTier}
          serviceId={service.id}
          service={service}
          onClose={handleEditorClose}
          isOpen={isEditorOpen}
        />
      )}
    </Card>
  );
}