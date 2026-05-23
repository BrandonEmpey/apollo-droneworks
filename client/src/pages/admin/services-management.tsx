import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Plus, Edit, Trash2, DollarSign, Package, Settings, Minus, GripVertical, ArrowUp, ArrowDown, Link, Info, Upload, Image, Check, ChevronDown, ChevronUp } from "lucide-react";
import { formatImageRejectionToast, parseAerialRejectionError } from "@/lib/upload-error";
import { EnhancedServiceCard } from "@/components/enhanced-service-card";
import { ServicesDisplayTest } from "@/components/services-display-test";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Service } from "@shared/schema";

// Service form schema
const serviceFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().min(1, "Short description is required"),
  tooltipDescription: z.string().min(1, "Tooltip description is required"),
  disclaimer: z.string().max(2000, "Disclaimer is too long").optional().or(z.literal("")),
  aboutServiceContent: z.string().min(1, "About this service content is required"),
  imageUrl: z.string().url("Please enter a valid image URL").or(z.string().min(0)),
  videoUrl: z.string().url("Please enter a valid video URL").optional().or(z.string().min(0)),
  videoPlayback: z.enum(["autoplay", "hover", "click"]).default("hover"),
  price: z.number().min(0, "Price must be positive"),
  // Range-based pricing fields
  minPrice: z.number().min(0, "Minimum price must be positive").optional(),
  maxPrice: z.number().min(0, "Maximum price must be positive").optional(),
  // Per-unit pricing fields
  unitType: z.string().default("unit"),
  basePriceQuantity: z.number().min(1, "Base quantity must be at least 1").default(1),
  additionalPricePerUnit: z.number().min(0, "Additional price per unit must be positive").default(0),
  pricingDescription: z.string().optional(),
  features: z.array(z.string()).default([]),
  whatsIncludedContent: z.array(z.string()).default([]),
  // Possibilities and Process Steps both default to empty strings so that
  // an admin can save partial entries (e.g. just a title) without the form
  // refusing to submit. Fully empty rows are stripped in onSubmit before
  // the request is sent to the server.
  possibilities: z.array(z.object({
    title: z.string().default(""),
    description: z.string().default(""),
  })).default([]),
  processSteps: z.array(z.object({
    title: z.string().default(""),
    description: z.string().default(""),
  })).default([]),
  classification: z.enum(["Revenue Generation", "Overhead Reduction", "N/A"]).default("N/A"),
  pricingType: z.enum(["flat", "tiered", "per_unit", "range_based"]).default("flat"),
  featuredBadge: z.boolean().default(false),
  hideFromServicesPage: z.boolean().default(false),
  isSubscription: z.boolean().default(false),
  weeklySubscriptionEnabled: z.boolean().default(false),
  weeklyPrice: z.number().min(0).default(0),
  weeklyPriceType: z.enum(["fixed", "percentage"]).default("fixed"),
  weeklyPercentage: z.number().min(0).max(100).default(0),
  biWeeklySubscriptionEnabled: z.boolean().default(false),
  biWeeklyPrice: z.number().min(0).default(0),
  biWeeklyPriceType: z.enum(["fixed", "percentage"]).default("fixed"),
  biWeeklyPercentage: z.number().min(0).max(100).default(0),
  monthlySubscriptionEnabled: z.boolean().default(false),
  monthlyPrice: z.number().min(0).default(0),
  monthlyPriceType: z.enum(["fixed", "percentage"]).default("fixed"),
  monthlyPercentage: z.number().min(0).max(100).default(0),
  billingFrequency: z.string().default(""),
  frequencyDetails: z.string().default(""),
  displayOrder: z.number().default(999),
  category: z.string().default(""),
  folderStructure: z.array(z.string()).default([]),
  // Enhanced bundle pricing fields
  bundleDiscountPercentage: z.number().min(0).max(100).default(0),
  bundleConfigurations: z.array(z.object({
    serviceId: z.number(),
    discountPercentage: z.number().min(0).max(100),
    customPrice: z.number().min(0).optional(),
  })).default([]),
  // Tiered pricing tiers
  pricingTiers: z.array(z.object({
    name: z.string().optional(),
    // Legacy single-deliverable fields — kept optional so old records still load.
    minQuantity: z.number().optional(),
    maxQuantity: z.number().optional(),
    exactQuantity: z.number().optional(),
    quantityType: z.enum(["range", "exact"]).default("range"),
    quantityUnit: z.string().default("items"),
    // New: zero or more deliverables describing what the tier includes.
    deliverables: z.array(z.object({
      name: z.string().optional(),
      quantityType: z.enum(["range", "exact"]).default("exact"),
      exactQuantity: z.number().optional(),
      minQuantity: z.number().optional(),
      maxQuantity: z.number().optional(),
      quantityUnit: z.string().default("items"),
    })).default([]),
    price: z.number().min(0).default(0),
    priceType: z.enum(["fixed", "range", "quote"]).default("fixed"),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
    description: z.string().optional(),
    // Subscription pricing for this tier
    subscriptionEnabled: z.boolean().default(false),
    weeklySubscriptionPrice: z.number().min(0).default(0),
    biWeeklySubscriptionPrice: z.number().min(0).default(0),
    monthlySubscriptionPrice: z.number().min(0).default(0),
    subscriptionPriceType: z.enum(["fixed", "percentage"]).default("fixed"),
    subscriptionPercentage: z.number().min(0).max(100).default(0),
    features: z.array(z.string()).default([]),
    isPopular: z.boolean().default(false),
    displayOrder: z.number().optional(),
  })).default([]),
});

type ServiceFormData = z.infer<typeof serviceFormSchema>;

export default function ServicesManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [expandedTiers, setExpandedTiers] = useState<Set<number>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: addons = [] } = useQuery({
    queryKey: ["/api/addons"],
  });

  const { data: allServiceAddons = [] } = useQuery({
    queryKey: ["/api/service-addons"],
  });

  const { data: serviceAddons = [] } = useQuery({
    queryKey: ["/api/services", editingService?.id, "addons"],
    enabled: !!editingService?.id,
  });

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      tooltipDescription: "",
      disclaimer: "",
      aboutServiceContent: "",
      imageUrl: "",
      videoUrl: "",
      videoPlayback: "hover",
      price: 0,
      minPrice: 0,
      maxPrice: 0,
      unitType: "unit",
      basePriceQuantity: 1,
      additionalPricePerUnit: 0,
      pricingDescription: "",
      features: [],
      whatsIncludedContent: [],
      possibilities: [],
      processSteps: [],
      classification: "N/A",
      pricingType: "flat",
      featuredBadge: false,
      hideFromServicesPage: false,
      isSubscription: false,
      weeklySubscriptionEnabled: false,
      weeklyPrice: 0,
      weeklyPriceType: "fixed",
      weeklyPercentage: 0,
      biWeeklySubscriptionEnabled: false,
      biWeeklyPrice: 0,
      biWeeklyPriceType: "fixed",
      biWeeklyPercentage: 0,
      monthlySubscriptionEnabled: false,
      monthlyPrice: 0,
      monthlyPriceType: "fixed",
      monthlyPercentage: 0,
      billingFrequency: "",
      frequencyDetails: "",
      displayOrder: 999,
      category: "",
      folderStructure: [],
      bundleDiscountPercentage: 0,
      bundleConfigurations: [],
      pricingTiers: [],
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(JSON.stringify({
          error: err?.error || `Upload failed (HTTP ${response.status})`,
          reason: err?.reason,
        }));
      }

      return response.json();
    },
    onSuccess: (data) => {
      form.setValue('imageUrl', data.url);
      form.trigger('imageUrl');
      toast({
        title: "Image uploaded",
        description: "The service image has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      const parsed = parseAerialRejectionError(error.message);
      toast({
        title: parsed?.title ?? "Upload failed",
        description: parsed?.description ?? error.message,
        variant: "destructive",
      });
    },
  });

  const uploadVideoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload/video', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload video');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      form.setValue('videoUrl', data.url);
      form.trigger('videoUrl');
      toast({
        title: "Video uploaded",
        description: "The service video has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Video upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const response = await apiRequest("POST", "/api/services", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Service created",
        description: "The service has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ServiceFormData> }) => {
      // Ensure array fields are properly formatted
      const cleanedData = {
        ...data,
        features: Array.isArray(data.features) ? data.features : [],
        whatsIncludedContent: Array.isArray(data.whatsIncludedContent) ? data.whatsIncludedContent : [],
        processSteps: Array.isArray(data.processSteps) ? data.processSteps : [],
        bundleConfigurations: Array.isArray(data.bundleConfigurations) ? data.bundleConfigurations : [],
        pricingTiers: Array.isArray(data.pricingTiers) ? data.pricingTiers : [],
        folderStructure: Array.isArray(data.folderStructure) ? data.folderStructure : [],
      };
      
      const response = await apiRequest("PATCH", `/api/services/${id}`, cleanedData);
      if (response.ok) {
        const text = await response.text();
        if (!text || text.trim() === '') {
          return {}; // Return empty object for empty responses
        }
        try {
          return JSON.parse(text);
        } catch (error) {
          console.warn('Invalid JSON response:', text);
          return {}; // Return empty object if JSON parsing fails
        }
      }
      throw new Error('Failed to update service');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services", editingService?.id, "addons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services", editingService?.id] });
      setEditingService(null);
      form.reset();
      toast({
        title: "Service updated",
        description: "The service has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateServiceAddonsMutation = useMutation({
    mutationFn: async ({ serviceId, enabledAddons }: { serviceId: number; enabledAddons: { addonId: number; isEnabled: boolean; customPrice?: number | null }[] }) => {
      const response = await fetch(`/api/services/${serviceId}/addons`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledAddons }),
      });
      if (!response.ok) throw new Error("Failed to update service addons");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services", editingService?.id, "addons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-addons"] });
      toast({
        title: "Success",
        description: "Service addons updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleFeaturedBadgeMutation = useMutation({
    mutationFn: async ({ id, featuredBadge }: { id: number; featuredBadge: boolean }) => {
      const response = await apiRequest("PATCH", `/api/services/${id}`, { featuredBadge });
      if (!response.ok) {
        throw new Error("Failed to update badge");
      }
      return response.json().catch(() => ({}));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: variables.featuredBadge ? "Badge enabled" : "Badge disabled",
        description: variables.featuredBadge
          ? "The Serving Southern Utah badge is now visible."
          : "The Serving Southern Utah badge has been hidden.",
      });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Couldn't update badge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleHideFromServicesPageMutation = useMutation({
    mutationFn: async ({ id, hideFromServicesPage }: { id: number; hideFromServicesPage: boolean }) => {
      const response = await apiRequest("PATCH", `/api/services/${id}`, { hideFromServicesPage });
      if (!response.ok) {
        throw new Error("Failed to update visibility");
      }
      return response.json().catch(() => ({}));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: variables.hideFromServicesPage ? "Service hidden" : "Service visible",
        description: variables.hideFromServicesPage
          ? "This service is now hidden from the public services page."
          : "This service is now visible on the public services page.",
      });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Couldn't update visibility",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Service deleted",
        description: "The service has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      // Server errors arrive as `"<status>: <body>"` from apiRequest. If the body is
      // JSON with a `message` field, surface that human-readable text instead of the
      // raw `"409: {...}"` blob.
      let description = error.message;
      const match = error.message.match(/^\d+:\s*(.*)$/s);
      if (match) {
        const body = match[1].trim();
        try {
          const parsed = JSON.parse(body);
          if (parsed && typeof parsed.message === "string") {
            description = parsed.message;
          }
        } catch {
          if (body) description = body;
        }
      }
      toast({
        title: "Couldn't delete service",
        description,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadingImage(true);
      uploadImageMutation.mutate(file, {
        onSettled: () => setUploadingImage(false),
      });
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Video upload handled directly in form field
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerVideoUpload = () => {
    videoInputRef.current?.click();
  };

  const onSubmit = (data: ServiceFormData) => {
    console.log('Form submission attempted');
    console.log('Form data:', data);
    
    // Prices are stored in cents in the DB; form values are in dollars — multiply by 100 before saving
    const trimmedDisclaimer = data.disclaimer?.trim();
    // Drop fully-empty Possibility / Process Step rows so accidental "Add"
    // clicks don't persist blank entries.
    const cleanedPossibilities = (data.possibilities ?? []).filter(
      (p) => (p.title ?? "").trim().length > 0 || (p.description ?? "").trim().length > 0,
    );
    const cleanedProcessSteps = (data.processSteps ?? []).filter(
      (s) => (s.title ?? "").trim().length > 0 || (s.description ?? "").trim().length > 0,
    );
    const dataToSave = {
      ...data,
      possibilities: cleanedPossibilities,
      processSteps: cleanedProcessSteps,
      disclaimer: trimmedDisclaimer && trimmedDisclaimer.length > 0 ? trimmedDisclaimer : null,
      price: Math.round(data.price * 100),
      minPrice: data.minPrice ? Math.round(data.minPrice * 100) : undefined,
      maxPrice: data.maxPrice ? Math.round(data.maxPrice * 100) : undefined,
      additionalPricePerUnit: Math.round(data.additionalPricePerUnit * 100),
      weeklyPrice: Math.round(data.weeklyPrice * 100),
      biWeeklyPrice: Math.round(data.biWeeklyPrice * 100),
      monthlyPrice: Math.round(data.monthlyPrice * 100),
      pricingTiers: data.pricingTiers?.map((tier, idx) => ({
        ...tier,
        price: Math.round(tier.price * 100),
        minPrice: tier.minPrice ? Math.round(tier.minPrice * 100) : undefined,
        maxPrice: tier.maxPrice ? Math.round(tier.maxPrice * 100) : undefined,
        features: (tier.features || []).map((f) => String(f).trim()).filter((f) => f.length > 0),
        isPopular: Boolean(tier.isPopular),
        displayOrder: idx,
      })) || [],
      bundleConfigurations: data.bundleConfigurations?.map(config => ({
        ...config,
        customPrice: config.customPrice ? Math.round(config.customPrice * 100) : undefined,
      })) || [],
    };
    
    console.log('Form errors:', form.formState.errors);
    console.log('Is editing service:', !!editingService);
    
    if (editingService) {
      console.log('Updating service ID:', editingService.id);
      updateServiceMutation.mutate({ id: editingService.id, data: dataToSave });
    } else {
      console.log('Creating new service');
      createServiceMutation.mutate(dataToSave);
    }
  };



  // Toggle functions for collapsible interface
  const toggleTierExpansion = (index: number) => {
    setExpandedTiers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleStepExpansion = (index: number) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    // Reset collapsible state when editing a new service
    setExpandedTiers(new Set());
    setExpandedSteps(new Set());
    // Prices are stored in cents in the DB; divide by 100 to show dollars in the form
    form.reset({
      name: service.name,
      description: service.description,
      tooltipDescription: service.tooltipDescription || service.description,
      disclaimer: service.disclaimer ?? "",
      aboutServiceContent: service.aboutServiceContent || service.description,
      imageUrl: service.imageUrl || "",
      videoUrl: (service as any).videoUrl || "",
      videoPlayback: ((service as any).videoPlayback as "autoplay" | "hover" | "click") || "hover",
      price: service.price / 100,
      minPrice: (service as any).minPrice ? (service as any).minPrice / 100 : 0,
      maxPrice: (service as any).maxPrice ? (service as any).maxPrice / 100 : 0,
      unitType: (service as any).unitType || "unit",
      basePriceQuantity: (service as any).basePriceQuantity || 1,
      additionalPricePerUnit: (service as any).additionalPricePerUnit ? (service as any).additionalPricePerUnit / 100 : 0,
      pricingDescription: (service as any).pricingDescription || "",
      features: service.features || [],
      whatsIncludedContent: service.whatsIncludedContent || [],
      possibilities: service.possibilities || [],
      processSteps: service.processSteps || [],
      classification: (service.classification as "Revenue Generation" | "Overhead Reduction" | "N/A") || "N/A",
      pricingType: service.pricingType as "flat" | "tiered" | "per_unit" | "range_based",
      featuredBadge: service.featuredBadge || false,
      hideFromServicesPage: service.hideFromServicesPage || false,
      isSubscription: service.isSubscription || false,
      weeklySubscriptionEnabled: (service as any).weeklySubscriptionEnabled || false,
      weeklyPrice: service.weeklyPrice ? service.weeklyPrice / 100 : 0,
      weeklyPriceType: ((service as any).weeklyPriceType as "fixed" | "percentage") || "fixed",
      weeklyPercentage: (service as any).weeklyPercentage || 0,
      biWeeklySubscriptionEnabled: (service as any).biWeeklySubscriptionEnabled || false,
      biWeeklyPrice: (service as any).biWeeklyPrice ? (service as any).biWeeklyPrice / 100 : 0,
      biWeeklyPriceType: ((service as any).biWeeklyPriceType as "fixed" | "percentage") || "fixed",
      biWeeklyPercentage: (service as any).biWeeklyPercentage || 0,
      monthlySubscriptionEnabled: (service as any).monthlySubscriptionEnabled || false,
      monthlyPrice: service.monthlyPrice ? service.monthlyPrice / 100 : 0,
      monthlyPriceType: ((service as any).monthlyPriceType as "fixed" | "percentage") || "fixed",
      monthlyPercentage: (service as any).monthlyPercentage || 0,
      billingFrequency: (service as any).billingFrequency || "",
      frequencyDetails: (service as any).frequencyDetails || "",
      displayOrder: service.displayOrder || 999,
      category: (service as any).category || "",
      folderStructure: Array.isArray((service as any).folderStructure) ? (service as any).folderStructure : [],
      pricingTiers: Array.isArray(service.pricingTiers) && service.pricingTiers.length > 0 
        ? service.pricingTiers.map((tier: any) => {
            // Round-trip rule: an explicit `deliverables` property (even an empty array)
            // is always preserved as-is. Only synthesize a legacy row when the property is
            // entirely absent AND legacy quantity fields exist.
            const hasDeliverablesKey = Object.prototype.hasOwnProperty.call(tier, "deliverables")
              && Array.isArray(tier.deliverables);
            const hasLegacyQuantity = !hasDeliverablesKey && (
              tier.exactQuantity != null || tier.minQuantity != null || tier.maxQuantity != null
            );
            const deliverables = hasDeliverablesKey
              ? tier.deliverables.map((d: any) => ({
                  name: d.name || "",
                  quantityType: d.quantityType || "exact",
                  exactQuantity: d.exactQuantity != null ? Number(d.exactQuantity) : undefined,
                  minQuantity: d.minQuantity != null ? Number(d.minQuantity) : undefined,
                  maxQuantity: d.maxQuantity != null ? Number(d.maxQuantity) : undefined,
                  quantityUnit: d.quantityUnit || "items",
                }))
              : hasLegacyQuantity
                ? [{
                    name: "",
                    quantityType: tier.quantityType || "range",
                    exactQuantity: tier.exactQuantity != null ? Number(tier.exactQuantity) : undefined,
                    minQuantity: tier.minQuantity != null ? Number(tier.minQuantity) : undefined,
                    maxQuantity: tier.maxQuantity != null ? Number(tier.maxQuantity) : undefined,
                    quantityUnit: tier.quantityUnit || "items",
                  }]
                : [];
            return {
              name: tier.name || `Tier ${(service.pricingTiers?.indexOf(tier) || 0) + 1}`,
              minQuantity: Number(tier.minQuantity) || 1,
              maxQuantity: tier.maxQuantity ? Number(tier.maxQuantity) : undefined,
              exactQuantity: tier.exactQuantity ? Number(tier.exactQuantity) : undefined,
              quantityType: tier.quantityType || "range",
              price: tier.price ? Number(tier.price) / 100 : 0,
              priceType: tier.priceType || "fixed",
              minPrice: tier.minPrice ? Number(tier.minPrice) / 100 : undefined,
              maxPrice: tier.maxPrice ? Number(tier.maxPrice) / 100 : undefined,
              quantityUnit: tier.quantityUnit || "items",
              description: tier.description || "",
              deliverables,
              features: Array.isArray(tier.features) ? tier.features.map((f: unknown) => String(f)) : [],
              isPopular: Boolean(tier.isPopular),
              displayOrder: tier.displayOrder != null ? Number(tier.displayOrder) : undefined,
            };
          })
        : [],
      // Enhanced bundle pricing fields
      bundleDiscountPercentage: service.bundleDiscountPercentage || 0,
      bundleConfigurations: (service.bundleConfigurations || []).map((config: any) => ({
        ...config,
        customPrice: config.customPrice ? config.customPrice / 100 : undefined,
      })),
    });
  };



  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this service?")) {
      deleteServiceMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Services Management | Apollo DroneWorks Admin</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Services Management</h1>
            <p className="text-gray-400 mt-2">10 canonical drone services across 3 categories — edit details and pricing below</p>
          </div>
        </div>

        {/* Services grouped by category */}
        {["Real Estate & Marketing", "Property Inspections", "Mapping & Modeling"].map((category) => (
          <div key={category} className="space-y-4">
            <h2 className="text-xl font-semibold text-gold border-b border-gold/30 pb-2">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services?.filter((s) => s.category === category).map((service) => (
            <Card key={service.id} className="bg-gray-800 border-gray-700 overflow-hidden">
              {/* Service Image */}
              {service.imageUrl && (
                <div className="relative h-48 bg-gray-700">
                  <img 
                    src={service.imageUrl} 
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white text-lg">{service.name}</CardTitle>
                    <CardDescription className="text-gray-400 mt-1">
                      {service.description}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(service)}
                      className="text-gray-400 hover:text-white"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gold">
                      {service.pricingType === "tiered" && service.pricingTiers && service.pricingTiers.length > 0 
                        ? (() => {
                            const allPrices: number[] = [];
                            
                            service.pricingTiers.forEach(tier => {
                              if (tier.priceType === "fixed" && tier.price) {
                                allPrices.push(tier.price / 100);
                              } else if (tier.priceType === "range" && tier.minPrice && tier.maxPrice) {
                                allPrices.push(tier.minPrice / 100, tier.maxPrice / 100);
                              }
                            });
                            
                            if (allPrices.length > 0) {
                              const minPrice = Math.min(...allPrices);
                              const maxPrice = Math.max(...allPrices);
                              return minPrice === maxPrice 
                                ? `$${minPrice.toFixed(0)}`
                                : `$${minPrice.toFixed(0)} - $${maxPrice.toFixed(0)}`;
                            } else {
                              return `$${(service.price / 100).toFixed(0)}`;
                            }
                          })()
                        : `$${(service.price / 100).toFixed(0)}`
                      }
                    </span>
                    <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                      {service.classification}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Package className="h-4 w-4" />
                    <span>{service.pricingType || 'flat'} pricing</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3 rounded-md border border-gray-700 bg-gray-900/50 px-3 py-2">
                    <div className="flex flex-col">
                      <Label
                        htmlFor={`featured-badge-${service.id}`}
                        className="text-sm text-gray-200 cursor-pointer"
                      >
                        Serving Southern Utah badge
                      </Label>
                      <span className="text-xs text-gray-500">
                        Show the regional badge on the public service card
                      </span>
                    </div>
                    <Switch
                      id={`featured-badge-${service.id}`}
                      data-testid={`switch-featured-badge-${service.id}`}
                      checked={!!service.featuredBadge}
                      disabled={
                        toggleFeaturedBadgeMutation.isPending &&
                        toggleFeaturedBadgeMutation.variables?.id === service.id
                      }
                      onCheckedChange={(checked) =>
                        toggleFeaturedBadgeMutation.mutate({
                          id: service.id,
                          featuredBadge: checked,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-md border border-gray-700 bg-gray-900/50 px-3 py-2">
                    <div className="flex flex-col">
                      <Label
                        htmlFor={`hide-from-services-${service.id}`}
                        className="text-sm text-gray-200 cursor-pointer"
                      >
                        Hidden from clients
                      </Label>
                      <span className="text-xs text-gray-500">
                        Hide this service from the public services page
                      </span>
                    </div>
                    <Switch
                      id={`hide-from-services-${service.id}`}
                      data-testid={`switch-hide-from-services-${service.id}`}
                      checked={!!service.hideFromServicesPage}
                      disabled={
                        toggleHideFromServicesPageMutation.isPending &&
                        toggleHideFromServicesPageMutation.variables?.id === service.id
                      }
                      onCheckedChange={(checked) =>
                        toggleHideFromServicesPageMutation.mutate({
                          id: service.id,
                          hideFromServicesPage: checked,
                        })
                      }
                    />
                  </div>

                  {service.isSubscription && (
                    <Badge variant="outline" className="border-gold text-gold">
                      Subscription Service
                    </Badge>
                  )}
                  
                  {service.features && service.features.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-300">Features:</p>
                      <ul className="text-sm text-gray-400 space-y-1">
                        {service.features.slice(0, 3).map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-gold rounded-full"></div>
                            {feature}
                          </li>
                        ))}
                        {service.features.length > 3 && (
                          <li className="text-xs text-gray-500">
                            +{service.features.length - 3} more features
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  {/* Active Addons Indicator */}
                  {(() => {
                    const activeAddonCount = allServiceAddons && Array.isArray(allServiceAddons) 
                      ? allServiceAddons.filter((sa: any) => sa.serviceId === service.id && sa.isEnabled).length 
                      : 0;
                    
                    return activeAddonCount > 0 ? (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 text-sm text-green-400">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>Active Add-ons</span>
                          <Badge variant="outline" className="border-green-400 text-green-400 text-xs">
                            {activeAddonCount}
                          </Badge>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </CardContent>
            </Card>
          ))}
            </div>
          </div>
        ))}

        {/* Edit Dialog */}
        <Dialog open={!!editingService} onOpenChange={(open) => !open && setEditingService(null)}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] bg-gray-900 border-gray-700 overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Service</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update service details and pricing
              </DialogDescription>
            </DialogHeader>
            <ServiceForm
              form={form}
              onSubmit={onSubmit}
              isLoading={updateServiceMutation.isPending}
              onCancel={() => setEditingService(null)}
              services={services || []}
              addons={addons as any[]}
              serviceAddons={serviceAddons as any[]}
              editingService={editingService}
              updateServiceAddonsMutation={updateServiceAddonsMutation}
              fileInputRef={fileInputRef}
              handleFileUpload={handleFileUpload}
              triggerFileUpload={triggerFileUpload}
              uploadingImage={uploadingImage}
            />
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

// Service Form Component
function ServiceForm({
  form,
  onSubmit,
  isLoading,
  onCancel,
  services,
  addons = [],
  serviceAddons = [],
  editingService,
  updateServiceAddonsMutation,
  fileInputRef,
  handleFileUpload,
  triggerFileUpload,
  uploadingImage,
}: {
  form: any;
  onSubmit: (data: ServiceFormData) => void;
  isLoading: boolean;
  onCancel: () => void;
  services: Service[];
  addons?: any[];
  serviceAddons?: any[];
  editingService?: Service | null;
  updateServiceAddonsMutation?: any;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  handleFileUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  triggerFileUpload?: () => void;
  uploadingImage?: boolean;
}) {
  const pricingType = form.watch("pricingType");
  const pricingTiers = form.watch("pricingTiers");
  const [expandedTiers, setExpandedTiers] = useState<Set<number>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const addPricingTier = () => {
    const currentTiers = form.getValues("pricingTiers") || [];
    const nextMinQuantity = currentTiers.length > 0 
      ? Math.max(...currentTiers.map((t: any) => t.maxQuantity || t.minQuantity)) + 1
      : 1;
    
    form.setValue("pricingTiers", [
      ...currentTiers,
      {
        name: `Tier ${currentTiers.length + 1}`,
        minQuantity: nextMinQuantity,
        maxQuantity: undefined,
        exactQuantity: undefined,
        quantityType: "range" as const,
        price: 0,
        priceType: "fixed" as const,
        minPrice: undefined,
        maxPrice: undefined,
        quantityUnit: "items",
        description: "",
        deliverables: [],
        features: [],
        isPopular: false,
        displayOrder: currentTiers.length,
      },
    ]);
  };

  const addTierFeature = (tierIndex: number) => {
    const currentTiers = form.getValues("pricingTiers") || [];
    const newTiers = [...currentTiers];
    const tier = { ...newTiers[tierIndex] };
    const list = Array.isArray(tier.features) ? [...tier.features] : [];
    list.push("");
    tier.features = list;
    newTiers[tierIndex] = tier;
    form.setValue("pricingTiers", newTiers, { shouldDirty: true });
  };

  const removeTierFeature = (tierIndex: number, featureIndex: number) => {
    const currentTiers = form.getValues("pricingTiers") || [];
    const newTiers = [...currentTiers];
    const tier = { ...newTiers[tierIndex] };
    const list = Array.isArray(tier.features) ? [...tier.features] : [];
    list.splice(featureIndex, 1);
    tier.features = list;
    newTiers[tierIndex] = tier;
    form.setValue("pricingTiers", newTiers, { shouldDirty: true });
  };

  const updateTierFeature = (tierIndex: number, featureIndex: number, value: string) => {
    const currentTiers = form.getValues("pricingTiers") || [];
    const newTiers = [...currentTiers];
    const tier = { ...newTiers[tierIndex] };
    const list = Array.isArray(tier.features) ? [...tier.features] : [];
    list[featureIndex] = value;
    tier.features = list;
    newTiers[tierIndex] = tier;
    form.setValue("pricingTiers", newTiers, { shouldDirty: true });
  };

  const moveTierFeature = (tierIndex: number, fromIndex: number, toIndex: number) => {
    const currentTiers = form.getValues("pricingTiers") || [];
    const newTiers = [...currentTiers];
    const tier = { ...newTiers[tierIndex] };
    const list = Array.isArray(tier.features) ? [...tier.features] : [];
    if (toIndex < 0 || toIndex >= list.length) return;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    tier.features = list;
    newTiers[tierIndex] = tier;
    form.setValue("pricingTiers", newTiers, { shouldDirty: true });
  };

  const addDeliverable = (tierIndex: number) => {
    const currentTiers = form.getValues("pricingTiers") || [];
    const newTiers = [...currentTiers];
    const tier = { ...newTiers[tierIndex] };
    const list = Array.isArray(tier.deliverables) ? [...tier.deliverables] : [];
    list.push({
      name: "",
      quantityType: "exact" as const,
      exactQuantity: 1,
      minQuantity: undefined,
      maxQuantity: undefined,
      quantityUnit: "items",
    });
    tier.deliverables = list;
    newTiers[tierIndex] = tier;
    form.setValue("pricingTiers", newTiers, { shouldDirty: true });
  };

  const removeDeliverable = (tierIndex: number, deliverableIndex: number) => {
    const currentTiers = form.getValues("pricingTiers") || [];
    const newTiers = [...currentTiers];
    const tier = { ...newTiers[tierIndex] };
    const list = Array.isArray(tier.deliverables) ? [...tier.deliverables] : [];
    list.splice(deliverableIndex, 1);
    tier.deliverables = list;
    newTiers[tierIndex] = tier;
    form.setValue("pricingTiers", newTiers, { shouldDirty: true });
  };

  const updateDeliverable = (tierIndex: number, deliverableIndex: number, field: string, value: any) => {
    const currentTiers = form.getValues("pricingTiers") || [];
    const newTiers = [...currentTiers];
    const tier = { ...newTiers[tierIndex] };
    const list = Array.isArray(tier.deliverables) ? [...tier.deliverables] : [];
    list[deliverableIndex] = { ...list[deliverableIndex], [field]: value };
    tier.deliverables = list;
    newTiers[tierIndex] = tier;
    form.setValue("pricingTiers", newTiers, { shouldDirty: true });
  };

  const moveDeliverable = (tierIndex: number, fromIndex: number, toIndex: number) => {
    const currentTiers = form.getValues("pricingTiers") || [];
    const newTiers = [...currentTiers];
    const tier = { ...newTiers[tierIndex] };
    const list = Array.isArray(tier.deliverables) ? [...tier.deliverables] : [];
    if (toIndex < 0 || toIndex >= list.length) return;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    tier.deliverables = list;
    newTiers[tierIndex] = tier;
    form.setValue("pricingTiers", newTiers, { shouldDirty: true });
  };

  const removePricingTier = (index: number) => {
    const currentTiers = form.getValues("pricingTiers") || [];
    form.setValue("pricingTiers", currentTiers.filter((_: any, i: number) => i !== index));
  };

  const updatePricingTier = (index: number, field: string, value: any) => {
    const currentTiers = form.getValues("pricingTiers") || [];
    const newTiers = [...currentTiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    form.setValue("pricingTiers", newTiers);
  };

  const moveTier = (fromIndex: number, toIndex: number) => {
    const currentTiers = [...(form.getValues("pricingTiers") || [])];
    const [movedTier] = currentTiers.splice(fromIndex, 1);
    currentTiers.splice(toIndex, 0, movedTier);
    form.setValue("pricingTiers", currentTiers);
  };

  const moveTierUp = (index: number) => {
    if (index > 0) {
      moveTier(index, index - 1);
    }
  };

  const moveTierDown = (index: number) => {
    const currentTiers = form.getValues("pricingTiers") || [];
    if (index < currentTiers.length - 1) {
      moveTier(index, index + 1);
    }
  };

  // What's Included management functions
  const addWhatsIncluded = () => {
    const currentItems = form.getValues("whatsIncludedContent") || [];
    form.setValue("whatsIncludedContent", [...currentItems, ""]);
  };

  const removeWhatsIncluded = (index: number) => {
    const currentItems = form.getValues("whatsIncludedContent") || [];
    form.setValue("whatsIncludedContent", currentItems.filter((_: any, i: number) => i !== index));
  };

  const updateWhatsIncluded = (index: number, value: string) => {
    const currentItems = form.getValues("whatsIncludedContent") || [];
    const newItems = [...currentItems];
    newItems[index] = value;
    form.setValue("whatsIncludedContent", newItems);
  };

  // Possibilities management functions.
  // These inputs are rendered as raw <Input>/<Textarea> (not <FormField>), so we
  // must pass shouldDirty + shouldValidate + shouldTouch on every setValue —
  // otherwise the form's dirty/error state never updates and Save appears to
  // do nothing when an empty possibility row is added.
  const possibilityMutationOpts = {
    shouldDirty: true,
    shouldValidate: true,
    shouldTouch: true,
  } as const;

  const addPossibility = () => {
    const currentPossibilities = form.getValues("possibilities") || [];
    form.setValue(
      "possibilities",
      [...currentPossibilities, { title: "", description: "" }],
      possibilityMutationOpts,
    );
  };

  const removePossibility = (index: number) => {
    const currentPossibilities = form.getValues("possibilities") || [];
    form.setValue(
      "possibilities",
      currentPossibilities.filter((_: any, i: number) => i !== index),
      possibilityMutationOpts,
    );
  };

  const updatePossibility = (index: number, field: "title" | "description", value: string) => {
    const currentPossibilities = form.getValues("possibilities") || [];
    const newPossibilities = [...currentPossibilities];
    newPossibilities[index] = { ...newPossibilities[index], [field]: value };
    form.setValue("possibilities", newPossibilities, possibilityMutationOpts);
  };

  // Service Features management functions
  const addFeature = () => {
    const currentFeatures = form.getValues("features") || [];
    form.setValue("features", [...currentFeatures, ""]);
  };

  const removeFeature = (index: number) => {
    const currentFeatures = form.getValues("features") || [];
    form.setValue("features", currentFeatures.filter((_: any, i: number) => i !== index));
  };

  const updateFeature = (index: number, value: string) => {
    const currentFeatures = form.getValues("features") || [];
    const newFeatures = [...currentFeatures];
    newFeatures[index] = value;
    form.setValue("features", newFeatures);
  };

  // Process Steps management functions.
  // Same pattern as possibilities — these inputs aren't <FormField>s, so we
  // must explicitly tell react-hook-form to mark dirty/validate/touch.
  const processStepMutationOpts = possibilityMutationOpts;

  const addProcessStep = () => {
    const currentSteps = form.getValues("processSteps") || [];
    form.setValue(
      "processSteps",
      [...currentSteps, { title: "", description: "" }],
      processStepMutationOpts,
    );
  };

  const removeProcessStep = (index: number) => {
    const currentSteps = form.getValues("processSteps") || [];
    form.setValue(
      "processSteps",
      currentSteps.filter((_: any, i: number) => i !== index),
      processStepMutationOpts,
    );
  };

  const updateProcessStep = (index: number, field: "title" | "description", value: string) => {
    const currentSteps = form.getValues("processSteps") || [];
    const newSteps = [...currentSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    form.setValue("processSteps", newSteps, processStepMutationOpts);
  };

  // Bundle configuration management functions
  const addBundleConfiguration = () => {
    const currentConfigs = form.getValues("bundleConfigurations") || [];
    form.setValue("bundleConfigurations", [...currentConfigs, {
      serviceId: 0,
      discountPercentage: 0,
      customPrice: undefined
    }]);
  };

  const removeBundleConfiguration = (index: number) => {
    const currentConfigs = form.getValues("bundleConfigurations") || [];
    form.setValue("bundleConfigurations", currentConfigs.filter((_: any, i: number) => i !== index));
  };

  const updateBundleConfiguration = (index: number, field: string, value: any) => {
    const currentConfigs = form.getValues("bundleConfigurations") || [];
    const newConfigs = [...currentConfigs];
    newConfigs[index] = { ...newConfigs[index], [field]: value };
    form.setValue("bundleConfigurations", newConfigs);
  };

  const toggleAvailableAddon = (serviceId: number) => {
    const currentAddOns = form.getValues("availableAddOns") || [];
    const isSelected = currentAddOns.includes(serviceId);
    
    if (isSelected) {
      form.setValue("availableAddOns", currentAddOns.filter((id: number) => id !== serviceId));
    } else {
      form.setValue("availableAddOns", [...currentAddOns, serviceId]);
    }
  };

  // Toggle functions for collapsible interface
  const toggleTierExpansion = (index: number) => {
    setExpandedTiers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleStepExpansion = (index: number) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <TooltipProvider>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            // Surface validation failures so Save never feels "dead". Possibilities
            // and Process Steps no longer have required-field rules (admins can
            // save partial entries — see schema comment), so this toast normally
            // fires only when other required fields are missing.
            console.log("Form validation failed:", errors);
            const fieldNames = Object.keys(errors as Record<string, unknown>);
            toast({
              title: "Please fix the form before saving",
              description:
                fieldNames.length > 0
                  ? `Some fields need attention: ${fieldNames.join(", ")}.`
                  : "Some required fields are missing or invalid.",
              variant: "destructive",
            });
          })}
          className="space-y-6"
        >
          {/* Basic Service Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">Basic Information</h3>
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Service Name</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-gray-800 border-gray-600 text-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Short Description (Sub-heading)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Brief service description for cards and listings"
                      className="bg-gray-800 border-gray-600 text-white" 
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tooltipDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Tooltip Description</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Short tooltip text for hover descriptions"
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="disclaimer"
              render={({ field }) => {
                const previewText = (field.value ?? "").trim();
                return (
                  <FormItem>
                    <FormLabel className="text-white">Disclaimer (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Disclaimer text shown on this service's page and on customer receipts (e.g. weather-dependent scheduling, FAA waiver requirements)"
                        className="bg-gray-800 border-gray-600 text-white"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                    {previewText.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Preview disclaimer</p>
                        <div className="rounded border border-gold-dark/20 bg-[#080d17]/50 p-3">
                          <div className="text-xs font-semibold text-gold mb-1">Disclaimer</div>
                          <p className="text-xs text-offwhite/70 leading-relaxed whitespace-pre-line">
                            {previewText}
                          </p>
                        </div>
                      </div>
                    )}
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="aboutServiceContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">About This Service (Detailed Description)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Comprehensive service description for the About This Service section"
                      className="bg-gray-800 border-gray-600 text-white"
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Service Image</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://example.com/image.jpg or upload a file"
                          className="bg-gray-800 border-gray-600 text-white flex-1"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                        onClick={() => document.getElementById('image-upload')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const formData = new FormData();
                          formData.append('file', file);
                          
                          try {
                            const response = await fetch('/api/upload/image', {
                              method: 'POST',
                              body: formData,
                            });

                            if (response.ok) {
                              const data = await response.json();
                              field.onChange(data.url);
                              form.trigger('imageUrl');
                            } else {
                              const err = await response.json().catch(() => ({}));
                              const { title, description } = formatImageRejectionToast(err);
                              toast({ title, description, variant: 'destructive' });
                            }
                          } catch (error: unknown) {
                            const message = error instanceof Error ? error.message : 'Upload error';
                            toast({
                              title: 'Upload error',
                              description: message,
                              variant: 'destructive',
                            });
                          }
                        }
                      }}
                    />
                    {field.value && (field.value.startsWith('http') || field.value.startsWith('/uploads')) && (
                      <div className="mt-2">
                        <img 
                          src={field.value} 
                          alt="Preview" 
                          className="w-32 h-32 object-cover rounded border border-gray-600" 
                        />
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="videoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Service Video (Optional)</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://example.com/video.mp4 or upload a file"
                          className="bg-gray-800 border-gray-600 text-white flex-1"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                        onClick={() => document.getElementById('video-upload')?.click()}
                        disabled={false}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                    <input
                      id="video-upload"
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const formData = new FormData();
                          formData.append('file', file);
                          
                          try {
                            const response = await fetch('/api/upload/video', {
                              method: 'POST',
                              body: formData,
                            });
                            
                            if (response.ok) {
                              const data = await response.json();
                              field.onChange(data.url);
                              
                              // Video uploaded successfully - will be saved when user clicks "Save Changes"
                            } else {
                              console.error('Video upload failed');
                            }
                          } catch (error) {
                            console.error('Video upload error:', error);
                          }
                        }
                      }}
                    />
                    {field.value && (field.value.startsWith('http') || field.value.startsWith('/uploads')) && (
                      <div className="mt-2">
                        <video 
                          src={field.value} 
                          controls
                          className="w-64 h-36 object-cover rounded border border-gray-600" 
                        />
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="videoPlayback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Video Playback Behavior</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder="Select playback behavior" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="hover">Play on Hover</SelectItem>
                      <SelectItem value="autoplay">Auto-play (Muted)</SelectItem>
                      <SelectItem value="click">Play on Click</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Display Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="classification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Classification</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="N/A">N/A</SelectItem>
                        <SelectItem value="Revenue Generation">Revenue Generation</SelectItem>
                        <SelectItem value="Overhead Reduction">Overhead Reduction</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pricingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Pricing Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="flat">Flat Rate</SelectItem>
                        <SelectItem value="tiered">Tiered Pricing</SelectItem>
                        <SelectItem value="per_unit">Per Unit</SelectItem>
                        <SelectItem value="range_based">Range Based</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Category & Folder Structure */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">Category &amp; Folder Structure</h3>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Service Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="Real Estate & Marketing">Real Estate &amp; Marketing</SelectItem>
                      <SelectItem value="Property Inspections">Property Inspections</SelectItem>
                      <SelectItem value="Mapping & Modeling">Mapping &amp; Modeling</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="folderStructure"
              render={({ field }) => {
                const folders: string[] = Array.isArray(field.value) ? field.value : [];
                return (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-white">Folder Structure</FormLabel>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{folders.length} folder{folders.length !== 1 ? "s" : ""}</span>
                        {folders.length > 0 && (
                          <button
                            type="button"
                            className="text-xs text-red-400 hover:text-red-300 underline"
                            onClick={() => field.onChange([])}
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                    <FormControl>
                      <Textarea
                        className="bg-gray-800 border-gray-600 text-white font-mono text-sm"
                        rows={6}
                        placeholder={"01_Raw_Footage\n02_Edited_Photos\n03_Final_Deliverables\n04_Client_Feedback"}
                        value={folders.join("\n")}
                        onChange={(e) => {
                          const lines = e.target.value
                            .split("\n")
                            .map(l => l.trimEnd())
                            .filter(l => l.trim().length > 0);
                          field.onChange(lines);
                        }}
                        onBlur={() => {
                          field.onChange(folders.map(l => l.trim()).filter(l => l.length > 0));
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-gray-400">
                      One folder path per line. Use <code className="bg-gray-700 px-1 rounded">subfolder/nested</code> for nested folders. These folders are created in the client project ZIP when this service is selected.
                    </p>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>

          {/* Dynamic Pricing Fields Based on Pricing Type */}
          {form.watch("pricingType") === "range_based" && (
          <div className="space-y-4 p-4 border border-gray-600 rounded-lg">
            <h4 className="text-white font-medium">Range-Based Pricing</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Minimum Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Maximum Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="pricingDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Pricing Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Explain the pricing range (e.g., 'Price varies based on property size and complexity')"
                      className="bg-gray-800 border-gray-600 text-white"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {form.watch("pricingType") === "per_unit" && (
          <div className="space-y-4 p-4 border border-gray-600 rounded-lg">
            <h4 className="text-white font-medium">Per-Unit Pricing</h4>
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="unitType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Unit Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue placeholder="Select unit type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="unit">Unit</SelectItem>
                        <SelectItem value="images">Images</SelectItem>
                        <SelectItem value="photos">Photos</SelectItem>
                        <SelectItem value="videos">Videos</SelectItem>
                        <SelectItem value="acres">Acres</SelectItem>
                        <SelectItem value="sq ft">Square Feet</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="properties">Properties</SelectItem>
                        <SelectItem value="locations">Locations</SelectItem>
                        <SelectItem value="flights">Flights</SelectItem>
                        <SelectItem value="deliverables">Deliverables</SelectItem>
                        <SelectItem value="items">Items</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="basePriceQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Base Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="additionalPricePerUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">
                      Additional Price per {
                        form.watch("unitType") === "image" ? "Image" :
                        form.watch("unitType") === "acre" ? "Acre" :
                        form.watch("unitType") === "square_foot" ? "Sq/Ft" :
                        form.watch("unitType") === "hour" ? "Hour" :
                        form.watch("unitType") === "day" ? "Day" :
                        form.watch("unitType") === "property" ? "Property" :
                        form.watch("unitType") === "room" ? "Room" :
                        form.watch("unitType") === "item" ? "Item" :
                        "Unit"
                      } ($)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="pricingDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Pricing Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Explain the per-unit pricing (e.g., 'Base price includes first 5 acres, additional acres at $50 each')"
                      className="bg-gray-800 border-gray-600 text-white"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Tiered Pricing Configuration */}
        {pricingType === "tiered" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">Interactive Pricing Tier Builder</h3>
                <p className="text-sm text-gray-400">
                  Drag to reorder • Click arrows to move • Define quantity ranges and prices
                </p>
              </div>
              <Button
                type="button"
                onClick={addPricingTier}
                className="bg-gold text-black hover:bg-gold/90"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tier
              </Button>
            </div>

            {/* Live Pricing Preview */}
            {pricingTiers && pricingTiers.length > 0 && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gold" />
                  Live Pricing Preview
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {pricingTiers.map((tier: any, index: number) => (
                    <div key={index} className="bg-gray-800 border border-gray-600 rounded-lg p-3">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gold mb-1">
                          {tier.name || `Tier ${index + 1}`}
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">
                          {tier.priceType === "range" && tier.minPrice && tier.maxPrice ? (
                            `$${tier.minPrice.toFixed(2)} - $${tier.maxPrice.toFixed(2)}`
                          ) : (
                            `$${(tier.price || 0).toFixed(2)}`
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mb-2">
                          {tier.minQuantity} {tier.maxQuantity ? `- ${tier.maxQuantity}` : '+'} units
                        </div>
                        <div className="text-xs text-gray-500">
                          {tier.description || "No description"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing Tier Builder */}
            {pricingTiers && pricingTiers.length > 0 && (
              <div className="space-y-3">
                <div className="text-lg font-medium text-gold-gradient mb-3">Packages:</div>
                {pricingTiers.map((tier: any, index: number) => (
                  <div 
                    key={index} 
                    className="bg-gray-800 border-2 rounded-lg border-gold-gradient"
                    style={{
                      borderImage: 'linear-gradient(90deg, var(--gold-start), var(--gold-middle), var(--gold-end)) 1'
                    }}
                  >
                    {/* Header - Always Visible */}
                    <div className="p-4 border-b border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => moveTierUp(index)}
                            disabled={index === 0}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white disabled:opacity-30"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => moveTierDown(index)}
                            disabled={index === pricingTiers.length - 1}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white disabled:opacity-30"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <GripVertical className="h-4 w-4 text-gray-500 cursor-move" />
                        <div 
                          className="flex items-center gap-2 cursor-pointer flex-1"
                          onClick={() => toggleTierExpansion(index)}
                        >
                          <div className="flex-1">
                            <h4 className="text-white font-medium">{tier.name || `Tier ${index + 1}`}</h4>
                            <div className="text-xs text-gray-400">
                              {tier.quantityType === 'exact' 
                                ? `Exactly ${tier.exactQuantity || 0} ${tier.quantityUnit || 'items'}`
                                : `${tier.minQuantity} - ${tier.maxQuantity || '∞'} ${tier.quantityUnit || 'items'}`
                              } • 
                              {tier.priceType === 'range' 
                                ? `$${(tier.minPrice || 0).toFixed(2)} - $${(tier.maxPrice || 0).toFixed(2)}` 
                                : tier.priceType === 'quote' 
                                  ? 'Contact for Quote' 
                                  : `$${(tier.price || 0).toFixed(2)}`
                              }
                            </div>
                          </div>
                          {expandedTiers.has(index) ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePricingTier(index);
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Collapsible Content */}
                    {expandedTiers.has(index) && (
                    <div className="space-y-3 pt-3 border-t border-gray-700 p-4">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-sm text-gray-300 mb-1 block">Tier Name</label>
                        <Input
                          value={tier.name || ""}
                          onChange={(e) => updatePricingTier(index, "name", e.target.value)}
                          placeholder="Tier name"
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-300 mb-1 block">Description</label>
                        <Input
                          value={tier.description || ""}
                          onChange={(e) => updatePricingTier(index, "description", e.target.value)}
                          placeholder="Brief description"
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                    </div>

                    <div className="mb-3" data-testid={`tier-deliverables-${index}`}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm text-gray-300 block">Deliverables Included</label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addDeliverable(index)}
                          className="h-8"
                          data-testid={`button-add-deliverable-${index}`}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Deliverable
                        </Button>
                      </div>

                      {(!tier.deliverables || tier.deliverables.length === 0) ? (
                        <div className="text-xs text-gray-500 bg-gray-800/40 border border-dashed border-gray-700 rounded p-3 text-center">
                          No deliverables added — this tier will display as "contact for details".
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {tier.deliverables.map((deliverable: any, dIndex: number) => (
                            <div
                              key={dIndex}
                              className="bg-gray-800/60 border border-gray-700 rounded p-3 space-y-2"
                              data-testid={`deliverable-row-${index}-${dIndex}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-gray-400">Deliverable {dIndex + 1}</span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => moveDeliverable(index, dIndex, dIndex - 1)}
                                    disabled={dIndex === 0}
                                    className="h-7 w-7 p-0"
                                    data-testid={`button-move-deliverable-up-${index}-${dIndex}`}
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => moveDeliverable(index, dIndex, dIndex + 1)}
                                    disabled={dIndex === tier.deliverables.length - 1}
                                    className="h-7 w-7 p-0"
                                    data-testid={`button-move-deliverable-down-${index}-${dIndex}`}
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeDeliverable(index, dIndex)}
                                    className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                                    data-testid={`button-remove-deliverable-${index}-${dIndex}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant={deliverable.quantityType === "exact" ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => updateDeliverable(index, dIndex, "quantityType", "exact")}
                                  className="flex-1 h-8 text-xs"
                                >
                                  Exact
                                </Button>
                                <Button
                                  type="button"
                                  variant={deliverable.quantityType === "range" ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => updateDeliverable(index, dIndex, "quantityType", "range")}
                                  className="flex-1 h-8 text-xs"
                                >
                                  Range
                                </Button>
                              </div>

                              {deliverable.quantityType === "range" ? (
                                <div className="grid grid-cols-3 gap-2">
                                  <Input
                                    type="number"
                                    value={deliverable.minQuantity ?? ""}
                                    onChange={(e) => updateDeliverable(index, dIndex, "minQuantity", e.target.value === "" ? undefined : Number(e.target.value))}
                                    placeholder="Min"
                                    className="bg-gray-700 border-gray-600 text-white h-9"
                                  />
                                  <Input
                                    type="number"
                                    value={deliverable.maxQuantity ?? ""}
                                    onChange={(e) => updateDeliverable(index, dIndex, "maxQuantity", e.target.value === "" ? undefined : Number(e.target.value))}
                                    placeholder="Max"
                                    className="bg-gray-700 border-gray-600 text-white h-9"
                                  />
                                  <Select
                                    value={deliverable.quantityUnit || "items"}
                                    onValueChange={(value) => updateDeliverable(index, dIndex, "quantityUnit", value)}
                                  >
                                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-600">
                                      <SelectItem value="items">Items</SelectItem>
                                      <SelectItem value="images">Images</SelectItem>
                                      <SelectItem value="photos">Photos</SelectItem>
                                      <SelectItem value="videos">Videos</SelectItem>
                                      <SelectItem value="maps">Maps</SelectItem>
                                      <SelectItem value="acres">Acres</SelectItem>
                                      <SelectItem value="sq_ft">Square Feet</SelectItem>
                                      <SelectItem value="hours">Hours</SelectItem>
                                      <SelectItem value="days">Days</SelectItem>
                                      <SelectItem value="properties">Properties</SelectItem>
                                      <SelectItem value="locations">Locations</SelectItem>
                                      <SelectItem value="flights">Flights</SelectItem>
                                      <SelectItem value="deliverables">Deliverables</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    type="number"
                                    value={deliverable.exactQuantity ?? ""}
                                    onChange={(e) => updateDeliverable(index, dIndex, "exactQuantity", e.target.value === "" ? undefined : Number(e.target.value))}
                                    placeholder="Quantity"
                                    className="bg-gray-700 border-gray-600 text-white h-9"
                                  />
                                  <Select
                                    value={deliverable.quantityUnit || "items"}
                                    onValueChange={(value) => updateDeliverable(index, dIndex, "quantityUnit", value)}
                                  >
                                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-600">
                                      <SelectItem value="items">Items</SelectItem>
                                      <SelectItem value="images">Images</SelectItem>
                                      <SelectItem value="photos">Photos</SelectItem>
                                      <SelectItem value="videos">Videos</SelectItem>
                                      <SelectItem value="maps">Maps</SelectItem>
                                      <SelectItem value="acres">Acres</SelectItem>
                                      <SelectItem value="sq_ft">Square Feet</SelectItem>
                                      <SelectItem value="hours">Hours</SelectItem>
                                      <SelectItem value="days">Days</SelectItem>
                                      <SelectItem value="properties">Properties</SelectItem>
                                      <SelectItem value="locations">Locations</SelectItem>
                                      <SelectItem value="flights">Flights</SelectItem>
                                      <SelectItem value="deliverables">Deliverables</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              <Input
                                value={deliverable.name || ""}
                                onChange={(e) => updateDeliverable(index, dIndex, "name", e.target.value)}
                                placeholder="Optional label (e.g. 'Edited highlight reel')"
                                className="bg-gray-700 border-gray-600 text-white h-9 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="text-sm text-gray-300 mb-2 block">Pricing Type</label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={tier.priceType === "fixed" ? "default" : "outline"}
                          size="sm"
                          onClick={() => updatePricingTier(index, "priceType", "fixed")}
                          className="flex-1"
                        >
                          Fixed Price
                        </Button>
                        <Button
                          type="button"
                          variant={tier.priceType === "range" ? "default" : "outline"}
                          size="sm"
                          onClick={() => updatePricingTier(index, "priceType", "range")}
                          className="flex-1"
                        >
                          Price Range
                        </Button>
                        <Button
                          type="button"
                          variant={tier.priceType === "quote" ? "default" : "outline"}
                          size="sm"
                          onClick={() => updatePricingTier(index, "priceType", "quote")}
                          className="flex-1"
                        >
                          Contact for Quote
                        </Button>
                      </div>
                    </div>

                    {tier.priceType === "fixed" && (
                      <div>
                        <label className="text-sm text-gray-300 mb-1 block">Price ($)</label>
                        <Input
                          type="number"
                          value={tier.price || ""}
                          onChange={(e) => updatePricingTier(index, "price", Number(e.target.value))}
                          placeholder="0"
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                    )}

                    {tier.priceType === "range" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm text-gray-300 mb-1 block">Min Price ($)</label>
                          <Input
                            type="number"
                            value={tier.minPrice || ""}
                            onChange={(e) => updatePricingTier(index, "minPrice", Number(e.target.value))}
                            placeholder="0"
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-300 mb-1 block">Max Price ($)</label>
                          <Input
                            type="number"
                            value={tier.maxPrice || ""}
                            onChange={(e) => updatePricingTier(index, "maxPrice", Number(e.target.value))}
                            placeholder="0"
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </div>
                      </div>
                    )}

                    {tier.priceType === "quote" && (
                      <div className="bg-yellow-900/20 border border-yellow-600/30 rounded p-3">
                        <p className="text-yellow-400 text-sm">
                          <Info className="h-4 w-4 inline mr-1" />
                          This tier will display "Contact for Quote" instead of a price
                        </p>
                      </div>
                    )}

                    <div
                      className="flex items-center justify-between rounded border border-amber-600/40 bg-amber-900/10 p-3 mt-3"
                      data-testid={`tier-popular-row-${index}`}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`tier-popular-${index}`}
                          checked={Boolean(tier.isPopular)}
                          onCheckedChange={(checked) =>
                            updatePricingTier(index, "isPopular", checked === true)
                          }
                          data-testid={`checkbox-tier-popular-${index}`}
                        />
                        <Label
                          htmlFor={`tier-popular-${index}`}
                          className="text-sm text-amber-200 cursor-pointer"
                        >
                          Show "Popular" badge on this package
                        </Label>
                      </div>
                    </div>

                    <div className="mt-3" data-testid={`tier-features-${index}`}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm text-gray-300 block">
                          Feature Bullets (shown under the package on the service page)
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addTierFeature(index)}
                          className="h-8"
                          data-testid={`button-add-tier-feature-${index}`}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Feature
                        </Button>
                      </div>

                      {(!tier.features || tier.features.length === 0) ? (
                        <div className="text-xs text-gray-500 bg-gray-800/40 border border-dashed border-gray-700 rounded p-3 text-center">
                          No feature bullets — add some to highlight what's included.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {tier.features.map((feature: string, fIndex: number) => (
                            <div
                              key={fIndex}
                              className="flex items-center gap-2"
                              data-testid={`tier-feature-row-${index}-${fIndex}`}
                            >
                              <Input
                                value={feature}
                                onChange={(e) => updateTierFeature(index, fIndex, e.target.value)}
                                placeholder="e.g. 4K aerial video"
                                className="bg-gray-700 border-gray-600 text-white h-9"
                                data-testid={`input-tier-feature-${index}-${fIndex}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => moveTierFeature(index, fIndex, fIndex - 1)}
                                disabled={fIndex === 0}
                                className="h-8 w-8 p-0"
                                data-testid={`button-move-tier-feature-up-${index}-${fIndex}`}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => moveTierFeature(index, fIndex, fIndex + 1)}
                                disabled={fIndex === tier.features.length - 1}
                                className="h-8 w-8 p-0"
                                data-testid={`button-move-tier-feature-down-${index}-${fIndex}`}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTierFeature(index, fIndex)}
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                                data-testid={`button-remove-tier-feature-${index}-${fIndex}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(!pricingTiers || pricingTiers.length === 0) && (
              <div className="text-center py-8 border-2 border-dashed border-gray-600 rounded-lg">
                <Package className="h-12 w-12 text-gold-light mx-auto mb-3" />
                <p className="text-gold-gradient mb-2">No packages defined</p>
                <p className="text-sm text-gray-500 mb-4">Add packages to create flexible pricing options</p>
                <Button
                  type="button"
                  onClick={addPricingTier}
                  className="bg-gold text-black hover:bg-gold/90"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Package
                </Button>
              </div>
            )}
          </div>
        )}

        <FormField
          control={form.control}
          name="featuredBadge"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-amber-600/40 p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base text-white">Southern Utah Featured Badge</FormLabel>
                <div className="text-sm text-gray-400">
                  Show a "Serving Southern Utah" badge on this service card to highlight local expertise
                </div>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hideFromServicesPage"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-600 p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base text-white">Visible to clients</FormLabel>
                <div className="text-sm text-gray-400">
                  When off, this service is hidden from the public services page, industry pages, the price calculator, and the booking flow. Admins still see it everywhere.
                </div>
              </div>
              <FormControl>
                <Switch
                  data-testid="switch-visible-to-clients"
                  checked={!field.value}
                  onCheckedChange={(visible) => field.onChange(!visible)}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isSubscription"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-600 p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base text-white">Subscription Service</FormLabel>
                <div className="text-sm text-gray-400">
                  Enable if this is a recurring subscription service
                </div>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch("isSubscription") && (
          <div className="space-y-6 rounded-lg border border-gray-600 p-4">
            <h3 className="text-lg font-semibold text-white">Subscription Pricing</h3>
            
            {/* Weekly Subscription */}
            <div className="space-y-4 rounded-lg border border-gray-500 p-4">
              <FormField
                control={form.control}
                name="weeklySubscriptionEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base text-white">Weekly Subscription</FormLabel>
                      <div className="text-sm text-gray-400">
                        Enable weekly subscription option
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("weeklySubscriptionEnabled") && (
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="weeklyPriceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Price Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-800 border-gray-600">
                            <SelectItem value="fixed">Fixed Price</SelectItem>
                            <SelectItem value="percentage">Percentage of Base Price</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("weeklyPriceType") === "fixed" ? (
                    <FormField
                      control={form.control}
                      name="weeklyPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Weekly Price ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="bg-gray-800 border-gray-600 text-white"
                              placeholder="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="weeklyPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Weekly Percentage (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="bg-gray-800 border-gray-600 text-white"
                              placeholder="0"
                              max="100"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Bi-Weekly Subscription */}
            <div className="space-y-4 rounded-lg border border-gray-500 p-4">
              <FormField
                control={form.control}
                name="biWeeklySubscriptionEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base text-white">Bi-Weekly Subscription</FormLabel>
                      <div className="text-sm text-gray-400">
                        Enable bi-weekly subscription option
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("biWeeklySubscriptionEnabled") && (
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="biWeeklyPriceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Price Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-800 border-gray-600">
                            <SelectItem value="fixed">Fixed Price</SelectItem>
                            <SelectItem value="percentage">Percentage of Base Price</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("biWeeklyPriceType") === "fixed" ? (
                    <FormField
                      control={form.control}
                      name="biWeeklyPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Bi-Weekly Price ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="bg-gray-800 border-gray-600 text-white"
                              placeholder="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="biWeeklyPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Bi-Weekly Percentage (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="bg-gray-800 border-gray-600 text-white"
                              placeholder="0"
                              max="100"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Monthly Subscription */}
            <div className="space-y-4 rounded-lg border border-gray-500 p-4">
              <FormField
                control={form.control}
                name="monthlySubscriptionEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base text-white">Monthly Subscription</FormLabel>
                      <div className="text-sm text-gray-400">
                        Enable monthly subscription option
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("monthlySubscriptionEnabled") && (
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="monthlyPriceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Price Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-800 border-gray-600">
                            <SelectItem value="fixed">Fixed Price</SelectItem>
                            <SelectItem value="percentage">Percentage of Base Price</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("monthlyPriceType") === "fixed" ? (
                    <FormField
                      control={form.control}
                      name="monthlyPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Monthly Price ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="bg-gray-800 border-gray-600 text-white"
                              placeholder="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="monthlyPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Monthly Percentage (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="bg-gray-800 border-gray-600 text-white"
                              placeholder="0"
                              max="100"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="billingFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Available Frequencies</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="weekly, biweekly, monthly"
                      />
                    </FormControl>
                    <div className="text-xs text-gray-400">
                      Comma-separated list of available billing frequencies
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequencyDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Frequency Details</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="e.g., 2 visits per month, weekly inspections"
                      />
                    </FormControl>
                    <div className="text-xs text-gray-400">
                      Description of what the frequency includes
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {/* Enhanced Bundle Pricing Management */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Bundle Pricing & Add-on Configuration</h3>
              <p className="text-sm text-gray-400">
                Configure advanced bundle pricing, discounts, and add-on service availability
              </p>
            </div>
          </div>

          {/* General Bundle Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="bundleDiscountPercentage"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel className="text-white">Default Bundle Discount (%)</FormLabel>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>The default percentage discount applied when this service is bundled with any other service. This can be overridden with service-specific configurations below.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      placeholder="0"
                      className="bg-gray-700 border-gray-600 text-white"
                      min="0"
                      max="100"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Add-on Selection Interface */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="text-white font-medium">Available Add-ons</h4>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Select which add-ons are available for this service. Customers will be able to add these to their service package.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {addons && addons.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {addons.map((addon: any) => {
                    const isEnabled = serviceAddons.some((sa: any) => sa.addonId === addon.id && sa.isEnabled);
                    const [localEnabled, setLocalEnabled] = useState(isEnabled);
                    const [isExpanded, setIsExpanded] = useState(false);
                    
                    // Update local state when server state changes
                    useEffect(() => {
                      setLocalEnabled(isEnabled);
                    }, [isEnabled]);
                    
                    return (
                      <div key={addon.id} className={`rounded-lg border border-gray-600 p-4 bg-gray-800 transition-all duration-200 ${isExpanded ? 'min-h-[120px]' : 'min-h-[60px]'}`}>
                        {/* Collapsed view - Name and Toggle */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => setIsExpanded(!isExpanded)}
                              className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                            >
                              {isExpanded ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                            </button>
                            <div className="font-medium text-white text-base truncate">{addon.name}</div>
                          </div>
                          
                          <div className="flex-shrink-0">
                            <button
                              type="button"
                              disabled={updateServiceAddonsMutation.isPending}
                              onClick={() => {
                                if (editingService?.id) {
                                  // Immediately update local state for instant visual feedback
                                  setLocalEnabled(!localEnabled);
                                  
                                  // Get the custom price from the input field (user enters dollars, store as cents)
                                  const priceInput = document.querySelector(`input[data-addon-id="${addon.id}"]`) as HTMLInputElement;
                                  const parsedInputPrice = (priceInput?.value !== '' && priceInput?.value != null) ? parseFloat(priceInput.value) : NaN;
                                  const priceInputValue = Number.isFinite(parsedInputPrice) ? Math.round(parsedInputPrice * 100) : null;
                                  
                                  // Build complete list of enabled addons including this change
                                  const updatedEnabledAddons = addons?.map((a: any) => {
                                    const currentlyEnabled = serviceAddons.some((sa: any) => sa.addonId === a.id && sa.isEnabled);
                                    const isThisAddon = a.id === addon.id;
                                    const willBeEnabled = isThisAddon ? !localEnabled : currentlyEnabled;
                                    
                                    const existingSa = serviceAddons.find((sa: any) => sa.addonId === a.id);
                                    // For the toggled addon, prefer the DOM input value; fall back to server state if input is blank
                                    const customPrice = isThisAddon ? (priceInputValue ?? existingSa?.customPrice ?? null) : (existingSa?.customPrice ?? null);
                                    return {
                                      addonId: a.id,
                                      isEnabled: willBeEnabled,
                                      customPrice,
                                    };
                                  }) || [];
                                  
                                  updateServiceAddonsMutation.mutate({
                                    serviceId: editingService.id,
                                    enabledAddons: updatedEnabledAddons,
                                  });
                                }
                              }}
                              className={`
                                relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500
                                ${localEnabled 
                                  ? 'bg-yellow-500 shadow-md' 
                                  : 'bg-gray-600'
                                }
                                ${!updateServiceAddonsMutation.isPending ? 'hover:scale-105' : ''}
                                ${updateServiceAddonsMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                              `}
                            >
                              <span
                                className={`
                                  inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out
                                  ${localEnabled ? 'translate-x-5' : 'translate-x-1'}
                                `}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Expanded view - Full details */}
                        {isExpanded && (
                          <div className="mt-4 space-y-3 border-t border-gray-700 pt-3">
                            <div className="text-sm text-gray-400 font-semibold">Default: ${(addon.price / 100).toFixed(2)}</div>
                            {addon.tooltipDescription && (
                              <div className="text-sm text-gray-300 leading-relaxed">{addon.tooltipDescription}</div>
                            )}
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Service-specific price override:</label>
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-400 text-sm">$</span>
                                <input
                                  type="number"
                                  placeholder={String((addon.price / 100).toFixed(2))}
                                  data-addon-id={addon.id}
                                  key={`addon-price-${addon.id}-${serviceAddons.find((sa: any) => sa.addonId === addon.id)?.customPrice ?? 'default'}`}
                                  className="w-24 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:border-yellow-500 focus:outline-none"
                                  defaultValue={(() => { const sa = serviceAddons.find((sa: any) => sa.addonId === addon.id); return sa?.customPrice != null ? (sa.customPrice / 100).toFixed(2) : ''; })()}
                                  onBlur={(e) => {
                                    const customPrice = e.target.value !== '' ? Math.round(parseFloat(e.target.value) * 100) : null;
                                    if (editingService?.id && localEnabled) {
                                      const updatedEnabledAddons = addons?.map((a: any) => {
                                        const currentlyEnabled = serviceAddons.some((sa: any) => sa.addonId === a.id && sa.isEnabled);
                                        const isThisAddon = a.id === addon.id;
                                        const existingSa = serviceAddons.find((sa: any) => sa.addonId === a.id);
                                        return {
                                          addonId: a.id,
                                          isEnabled: isThisAddon ? true : currentlyEnabled,
                                          customPrice: isThisAddon ? customPrice : (existingSa?.customPrice ?? null),
                                        };
                                      }) || [];
                                      updateServiceAddonsMutation.mutate({
                                        serviceId: editingService.id,
                                        enabledAddons: updatedEnabledAddons,
                                      });
                                    }
                                  }}
                                />
                                <span className="text-xs text-gray-500">(leave empty for default)</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-gray-400 text-sm p-4 border border-gray-600 rounded-lg">
                  No add-ons available. Create add-ons in the Add-ons Management section.
                </div>
              )}
            </div>

          </div>

          {/* Service-Specific Bundle Configurations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-white font-medium">Service-Specific Bundle Pricing</h4>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>Create custom pricing rules for when this service is bundled with specific other services. These override the default bundle discount and allow for targeted pricing strategies.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-gray-400">
                  Configure custom pricing and discounts when bundled with specific services
                </p>
              </div>
              <Button
                type="button"
                onClick={addBundleConfiguration}
                className="bg-gold text-black hover:bg-gold/90"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Bundle Config
              </Button>
            </div>

            {form.watch("bundleConfigurations") && form.watch("bundleConfigurations").length > 0 && (
              <div className="space-y-3">
                {form.watch("bundleConfigurations").map((config: any, index: number) => (
                  <Card key={index} className="bg-gray-800 border-gray-600">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h5 className="text-white font-medium">Bundle Configuration {index + 1}</h5>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBundleConfiguration(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <label className="text-sm text-gray-300">Target Service</label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-gray-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>The specific service that this pricing rule applies to when bundled together.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <select
                            value={config.serviceId || ""}
                            onChange={(e) => updateBundleConfiguration(index, "serviceId", Number(e.target.value))}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
                          >
                            <option value="">Select service...</option>
                            {services.filter(s => s.id !== form.getValues("id")).map((service) => (
                              <option key={service.id} value={service.id}>
                                {service.name} (${(service.price / 100).toFixed(0)})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <label className="text-sm text-gray-300">Discount (%)</label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-gray-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Percentage discount applied to this service when bundled with the target service. Overrides the default bundle discount.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Input
                            type="number"
                            value={config.discountPercentage || ""}
                            onChange={(e) => updateBundleConfiguration(index, "discountPercentage", Number(e.target.value))}
                            placeholder="0"
                            className="bg-gray-700 border-gray-600 text-white"
                            min="0"
                            max="100"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <label className="text-sm text-gray-300">Custom Price ($)</label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-gray-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Optional fixed price override. If set, this exact price will be used instead of applying the discount percentage to the original price.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Input
                            type="number"
                            value={config.customPrice || ""}
                            onChange={(e) => updateBundleConfiguration(index, "customPrice", Number(e.target.value))}
                            placeholder="Optional override"
                            className="bg-gray-700 border-gray-600 text-white"
                            min="0"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {(!form.watch("bundleConfigurations") || form.watch("bundleConfigurations").length === 0) && (
              <div className="text-center py-4 border-2 border-dashed border-gray-600 rounded-lg">
                <p className="text-gray-400">No bundle configurations</p>
                <p className="text-sm text-gray-500">Add configurations for service-specific pricing</p>
              </div>
            )}
          </div>


        </div>

        {/* Service Features Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Service Features</h3>
              <p className="text-sm text-gray-400">
                Add key features and capabilities of this service
              </p>
            </div>
            <Button
              type="button"
              onClick={addFeature}
              className="bg-gold text-black hover:bg-gold/90"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Feature
            </Button>
          </div>

          {form.watch("features") && form.watch("features").length > 0 && (
            <div className="space-y-2">
              {form.watch("features").map((feature: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    placeholder="Enter service feature"
                    className="bg-gray-700 border-gray-600 text-white flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFeature(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {(!form.watch("features") || form.watch("features").length === 0) && (
            <div className="text-center py-4 border-2 border-dashed border-gray-600 rounded-lg">
              <p className="text-gray-400">No features added</p>
              <p className="text-sm text-gray-500">Add key features and capabilities of this service</p>
            </div>
          )}
        </div>

        {/* What's Included Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">What's Included</h3>
              <p className="text-sm text-gray-400">
                Add items that are included with this service
              </p>
            </div>
            <Button
              type="button"
              onClick={addWhatsIncluded}
              className="bg-gold text-black hover:bg-gold/90"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {form.watch("whatsIncludedContent") && form.watch("whatsIncludedContent").length > 0 && (
            <div className="space-y-2">
              {form.watch("whatsIncludedContent").map((item: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={item}
                    onChange={(e) => updateWhatsIncluded(index, e.target.value)}
                    placeholder="Enter included item"
                    className="bg-gray-700 border-gray-600 text-white flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWhatsIncluded(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {(!form.watch("whatsIncludedContent") || form.watch("whatsIncludedContent").length === 0) && (
            <div className="text-center py-4 border-2 border-dashed border-gray-600 rounded-lg">
              <p className="text-gray-400">No items added</p>
              <p className="text-sm text-gray-500">Add items that are included with this service</p>
            </div>
          )}
        </div>

        {/* Possibilities Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Possibilities</h3>
              <p className="text-sm text-gray-400">
                Add possibilities that highlight benefits for different customer types
              </p>
            </div>
            <Button
              type="button"
              onClick={addPossibility}
              className="bg-gold text-black hover:bg-gold/90"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Possibility
            </Button>
          </div>

          {form.watch("possibilities") && form.watch("possibilities").length > 0 && (
            <div className="space-y-3">
              {form.watch("possibilities").map((possibility: any, index: number) => (
                <div key={index} className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-white font-medium">Possibility {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePossibility(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white text-sm mb-2 block">Title (e.g., "Contractors")</Label>
                      <Input
                        value={possibility.title || ""}
                        onChange={(e) => updatePossibility(index, "title", e.target.value)}
                        placeholder="Enter customer type or title"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                      {(form.formState.errors.possibilities as any)?.[index]?.title?.message && (
                        <p className="text-xs text-red-400 mt-1">
                          {(form.formState.errors.possibilities as any)[index].title.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-white text-sm mb-2 block">Description</Label>
                      <Textarea
                        value={possibility.description || ""}
                        onChange={(e) => updatePossibility(index, "description", e.target.value)}
                        placeholder="Describe the benefit for this customer type"
                        className="bg-gray-700 border-gray-600 text-white"
                        rows={2}
                      />
                      {(form.formState.errors.possibilities as any)?.[index]?.description?.message && (
                        <p className="text-xs text-red-400 mt-1">
                          {(form.formState.errors.possibilities as any)[index].description.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(!form.watch("possibilities") || form.watch("possibilities").length === 0) && (
            <div className="text-center py-4 border-2 border-dashed border-gray-600 rounded-lg">
              <p className="text-gray-400">No possibilities added</p>
              <p className="text-sm text-gray-500">Add possibilities to highlight benefits for different customer types</p>
            </div>
          )}
        </div>

        {/* Process Steps Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Process Steps</h3>
              <p className="text-sm text-gray-400">
                Define the steps in your service process
              </p>
            </div>
            <Button
              type="button"
              onClick={addProcessStep}
              className="bg-gold text-black hover:bg-gold/90"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </div>

          {form.watch("processSteps") && form.watch("processSteps").length > 0 && (
            <div className="space-y-3">
              {form.watch("processSteps").map((step: any, index: number) => (
                <div key={index} className="bg-gray-800 border border-gray-600 rounded-lg">
                  {/* Header - Always Visible */}
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-2 cursor-pointer flex-1"
                        onClick={() => toggleStepExpansion(index)}
                      >
                        <div className="flex-1">
                          <h4 className="text-white font-medium">Step {index + 1}: {step.title || "Untitled Step"}</h4>
                          <div className="text-xs text-gray-400">
                            {step.description ? step.description.substring(0, 80) + (step.description.length > 80 ? "..." : "") : "No description"}
                          </div>
                        </div>
                        {expandedSteps.has(index) ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeProcessStep(index);
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Collapsible Content */}
                  {expandedSteps.has(index) && (
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="text-sm text-gray-300 mb-1 block">Step Title</label>
                        <Input
                          value={step.title || ""}
                          onChange={(e) => updateProcessStep(index, "title", e.target.value)}
                          placeholder="Enter step title"
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                        {(form.formState.errors.processSteps as any)?.[index]?.title?.message && (
                          <p className="text-xs text-red-400 mt-1">
                            {(form.formState.errors.processSteps as any)[index].title.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm text-gray-300 mb-1 block">Step Description</label>
                        <Textarea
                          value={step.description || ""}
                          onChange={(e) => updateProcessStep(index, "description", e.target.value)}
                          placeholder="Describe this step in detail"
                          className="bg-gray-700 border-gray-600 text-white"
                          rows={3}
                        />
                        {(form.formState.errors.processSteps as any)?.[index]?.description?.message && (
                          <p className="text-xs text-red-400 mt-1">
                            {(form.formState.errors.processSteps as any)[index].description.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {(!form.watch("processSteps") || form.watch("processSteps").length === 0) && (
            <div className="text-center py-4 border-2 border-dashed border-gray-600 rounded-lg">
              <p className="text-gray-400">No process steps defined</p>
              <p className="text-sm text-gray-500">Add steps to describe your service process</p>
            </div>
          )}
        </div>



        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-gold text-black hover:bg-gold/90"

          >
            {isLoading ? "Saving..." : editingService ? "Save Changes" : "Create Service"}
          </Button>
        </div>
      </form>
    </Form>
    </TooltipProvider>
  );
}