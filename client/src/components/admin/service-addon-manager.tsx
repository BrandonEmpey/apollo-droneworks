import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AddonEditorModal from "./addon-editor-modal";

interface ServiceAddon {
  id: number;
  serviceId: number;
  addonServiceId?: number; // Optional for standalone add-ons
  price: number;
  weeklyPrice: number;
  monthlyPrice: number;
  isEnabled: boolean;
  isSubscription: boolean;
  billingFrequency: string; // "weekly" or "monthly" 
  tooltipDescription?: string; // Short description shown in tooltip
  addonName?: string;
  addonDescription?: string;
  addonBasePrice?: number;
  isStandalone?: boolean; // Flag to indicate this is a standalone add-on
}

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  features: string[] | null;
  isAvailableAsAddon?: boolean;
  addonPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export default function ServiceAddonManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  // State to track prices during editing (before submission)
  const [editingPrices, setEditingPrices] = useState<{
    [addonId: number]: {
      price: string;
      weeklyPrice: string;
      monthlyPrice: string;
    }
  }>({});
  // State for addon editor modal
  const [addonEditorOpen, setAddonEditorOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<ServiceAddon | undefined>(undefined);

  // Fetch all services
  const { data: services, isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Fetch add-ons for the selected service
  const { data: addons, isLoading: isLoadingAddons } = useQuery<ServiceAddon[]>({
    queryKey: ["/api/services", selectedServiceId, "addons"],
    queryFn: async () => {
      if (!selectedServiceId) return [];
      const response = await fetch(`/api/services/${selectedServiceId}/addons`);
      if (!response.ok) {
        throw new Error("Failed to fetch service add-ons");
      }
      return response.json();
    },
    enabled: !!selectedServiceId,
  });

  // Update an add-on
  const updateAddonMutation = useMutation({
    mutationFn: async (addon: Partial<ServiceAddon> & { id: number }) => {
      const response = await apiRequest(
        "PUT",
        `/api/service-addons/${addon.id}`,
        addon
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Add-on updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services", selectedServiceId, "addons"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete an add-on
  const deleteAddonMutation = useMutation({
    mutationFn: async (addonId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/service-addons/${addonId}`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Add-on deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services", selectedServiceId, "addons"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Select the first service by default when the services are loaded
  useEffect(() => {
    if (services && services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(services[0].id);
    }
  }, [services, selectedServiceId]);

  // Handle enabling/disabling an add-on
  const handleToggleEnabled = (addon: ServiceAddon) => {
    updateAddonMutation.mutate({
      id: addon.id,
      isEnabled: !addon.isEnabled,
    });
  };

  // Handle subscription toggle for an add-on
  const handleToggleSubscription = (addon: ServiceAddon) => {
    updateAddonMutation.mutate({
      id: addon.id,
      isSubscription: !addon.isSubscription,
    });
  };

  // Handle billing frequency change for an add-on
  const handleBillingFrequencyChange = (addon: ServiceAddon, frequency: string) => {
    // Get current frequencies as an array
    const currentFrequencies = addon.billingFrequency?.split(',') || [];
    
    // Check if the frequency is already in the array
    const isFrequencyActive = currentFrequencies.includes(frequency);
    
    // Toggle the frequency (add if not present, remove if present)
    let newFrequencies;
    if (isFrequencyActive) {
      newFrequencies = currentFrequencies.filter(f => f !== frequency);
    } else {
      newFrequencies = [...currentFrequencies, frequency];
    }
    
    // Convert back to comma-separated string, excluding empty values
    const newFrequencyString = newFrequencies.filter(f => f).join(',');
    
    updateAddonMutation.mutate({
      id: addon.id,
      billingFrequency: newFrequencyString || null, // Use null if empty to reset to default
    });
  };

  // Initialize editing prices when addons are loaded
  useEffect(() => {
    if (addons) {
      const initialPrices = addons.reduce((acc, addon) => {
        acc[addon.id] = {
          price: Math.round(addon.price / 100).toString(),
          weeklyPrice: Math.round(addon.weeklyPrice / 100).toString(),
          monthlyPrice: Math.round(addon.monthlyPrice / 100).toString()
        };
        return acc;
      }, {} as {[key: number]: {price: string, weeklyPrice: string, monthlyPrice: string}});
      
      setEditingPrices(initialPrices);
    }
  }, [addons]);

  // Validate a price string
  const isPriceValid = (value: string) =>
    value.trim() !== '' && !isNaN(parseFloat(value)) && parseFloat(value) >= 0;

  // Track price during editing (without submitting)
  const handlePriceEdit = (addonId: number, field: 'price' | 'weeklyPrice' | 'monthlyPrice', value: string) => {
    setEditingPrices(prev => ({
      ...prev,
      [addonId]: {
        ...prev[addonId],
        [field]: value
      }
    }));
  };
  
  // Submit price on blur
  const handlePriceSubmit = (addon: ServiceAddon, field: 'price' | 'weeklyPrice' | 'monthlyPrice') => {
    const editingValue = editingPrices[addon.id]?.[field];
    if (!editingValue) return;
    if (!isPriceValid(editingValue)) return;
    
    // Convert price from dollars to cents for storage
    const priceInCents = Math.round(parseFloat(editingValue) * 100);
    
    updateAddonMutation.mutate({
      id: addon.id,
      [field]: priceInCents,
    });
  };
  
  // Handle tooltip description change
  const handleTooltipDescriptionChange = (addon: ServiceAddon, description: string) => {
    updateAddonMutation.mutate({
      id: addon.id,
      tooltipDescription: description.trim() || null,
    });
  };
  
  // Handle delete add-on 
  const handleDeleteAddon = (addonId: number) => {
    if (window.confirm("Are you sure you want to delete this add-on? This action cannot be undone.")) {
      deleteAddonMutation.mutate(addonId);
    }
  };

  if (isLoadingServices) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Add-ons</CardTitle>
          <CardDescription>Loading services...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!services || services.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Add-ons</CardTitle>
          <CardDescription>No services found. Please create services first.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Service Add-ons</CardTitle>
        <CardDescription>
          Configure which services can be used as add-ons for other services. Set prices and specify
          if an add-on is a subscription with weekly or monthly billing cycles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Addon Editor Modal */}
        <AddonEditorModal 
          open={addonEditorOpen}
          onOpenChange={setAddonEditorOpen}
          serviceId={selectedServiceId || services[0].id}
          addon={editingAddon}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/services", selectedServiceId, "addons"] });
          }}
        />
      
        <Tabs defaultValue={selectedServiceId?.toString() || services[0].id.toString()} onValueChange={(value) => setSelectedServiceId(parseInt(value))}>
          <TabsList className="mb-4 flex-wrap">
            {services.map((service) => (
              <TabsTrigger key={service.id} value={service.id.toString()}>
                {service.name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {services.map((service) => (
            <TabsContent key={service.id} value={service.id.toString()}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Configure Add-ons for {service.name}</h3>
                <Button 
                  variant="default"
                  onClick={() => {
                    setEditingAddon(undefined); // Clear any existing addon
                    setAddonEditorOpen(true);
                  }}
                >
                  Create New Add-on
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Manage add-on services for {service.name}. Configure pricing, subscription options, and tooltip descriptions for customers.
                You can create new add-ons directly from this tab, or edit existing ones.
              </p>
              
              {isLoadingAddons ? (
                <div className="py-4 text-center">Loading add-ons...</div>
              ) : !addons || addons.length === 0 ? (
                <div className="py-4 text-center">No add-ons available for this service.</div>
              ) : (
                <div className="space-y-4">
                  {addons.map((addon) => (
                    <div key={addon.id} className="border rounded-md p-4 bg-card shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-medium">{addon.addonName}</h4>
                          <div className="flex items-center">
                            <Switch
                              checked={addon.isEnabled}
                              onCheckedChange={() => handleToggleEnabled(addon)}
                            />
                            <span className="ml-2 text-sm">Enabled</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingAddon(addon);
                              setAddonEditorOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteAddon(addon.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      
                      {/* Two-column layout with inputs on left, tooltip description on right */}
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Left column - all controls */}
                        <div className="w-full md:w-1/2 space-y-4">
                          {/* One-time Price */}
                          <div className="space-y-2">
                            <Label className="font-medium">One-time Price</Label>
                            <div className="flex items-center space-x-2">
                              <span className="text-muted-foreground">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                className={`w-32 ${addon.isEnabled && editingPrices[addon.id] && !isPriceValid(editingPrices[addon.id].price) ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                value={editingPrices[addon.id]?.price || Math.round(addon.price / 100).toString()}
                                onChange={(e) => handlePriceEdit(addon.id, 'price', e.target.value)}
                                onBlur={() => handlePriceSubmit(addon, 'price')}
                                disabled={!addon.isEnabled}
                              />
                            </div>
                            {addon.isEnabled && editingPrices[addon.id] && !isPriceValid(editingPrices[addon.id].price) && (
                              <p className="text-xs text-red-500">Please enter a valid price</p>
                            )}
                          </div>
                          
                          {/* Subscription Toggle */}
                          <div className="space-y-0">
                            <div className="flex items-center mb-2">
                              <Label className="font-medium mr-4">Subscription</Label>
                              <Switch
                                checked={addon.isSubscription || false}
                                onCheckedChange={() => handleToggleSubscription(addon)}
                                disabled={!addon.isEnabled}
                              />
                              <span className="ml-2">{addon.isSubscription ? 'Enabled' : 'Disabled'}</span>
                            </div>
                          </div>
                          
                          {/* Subscription Options - Conditionally shown */}
                          <div className={`space-y-4 ${!addon.isEnabled || !addon.isSubscription ? 'opacity-50' : ''}`}>
                            {/* Weekly Price */}
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <Label className="font-medium mr-4">Weekly Price</Label>
                                <Switch
                                  id={`weekly-${addon.id}`}
                                  checked={(addon.billingFrequency || "").split(',').includes("weekly")}
                                  onCheckedChange={() => handleBillingFrequencyChange(addon, "weekly")}
                                  disabled={!addon.isEnabled || !addon.isSubscription}
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  className={`w-32 ${addon.isEnabled && addon.isSubscription && (addon.billingFrequency || "").split(',').includes("weekly") && editingPrices[addon.id] && !isPriceValid(editingPrices[addon.id].weeklyPrice) ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                  value={editingPrices[addon.id]?.weeklyPrice || Math.round(addon.weeklyPrice / 100).toString()}
                                  onChange={(e) => handlePriceEdit(addon.id, 'weeklyPrice', e.target.value)}
                                  onBlur={() => handlePriceSubmit(addon, 'weeklyPrice')}
                                  disabled={!addon.isEnabled || !addon.isSubscription}
                                />
                              </div>
                              {addon.isEnabled && addon.isSubscription && (addon.billingFrequency || "").split(',').includes("weekly") && editingPrices[addon.id] && !isPriceValid(editingPrices[addon.id].weeklyPrice) && (
                                <p className="text-xs text-red-500">Please enter a valid price</p>
                              )}
                            </div>
                            
                            {/* Monthly Price */}
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <Label className="font-medium mr-4">Monthly Price</Label>
                                <Switch
                                  id={`monthly-${addon.id}`}
                                  checked={(addon.billingFrequency || "").split(',').includes("monthly")}
                                  onCheckedChange={() => handleBillingFrequencyChange(addon, "monthly")}
                                  disabled={!addon.isEnabled || !addon.isSubscription}
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  className={`w-32 ${addon.isEnabled && addon.isSubscription && (addon.billingFrequency || "").split(',').includes("monthly") && editingPrices[addon.id] && !isPriceValid(editingPrices[addon.id].monthlyPrice) ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                  value={editingPrices[addon.id]?.monthlyPrice || Math.round(addon.monthlyPrice / 100).toString()}
                                  onChange={(e) => handlePriceEdit(addon.id, 'monthlyPrice', e.target.value)}
                                  onBlur={() => handlePriceSubmit(addon, 'monthlyPrice')}
                                  disabled={!addon.isEnabled || !addon.isSubscription}
                                />
                              </div>
                              {addon.isEnabled && addon.isSubscription && (addon.billingFrequency || "").split(',').includes("monthly") && editingPrices[addon.id] && !isPriceValid(editingPrices[addon.id].monthlyPrice) && (
                                <p className="text-xs text-red-500">Please enter a valid price</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Right column - Tooltip Description */}
                        <div className="w-full md:w-1/2 space-y-2">
                          <Label className="font-medium">Tooltip Description</Label>
                          <textarea
                            className="w-full min-h-[150px] p-2 rounded-md border border-input bg-background disabled:opacity-50 resize-none"
                            placeholder="Short description shown when customer hovers over info icon..."
                            value={addon.tooltipDescription || ""}
                            onChange={(e) => handleTooltipDescriptionChange(addon, e.target.value)}
                            disabled={!addon.isEnabled}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}