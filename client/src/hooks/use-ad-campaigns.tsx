import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AdCampaign, AdContent } from "@shared/schema";

export type CreateCampaignData = {
  name: string;
  platform: string;
  objectives: string;
  targetAudience: {
    ageRange: string;
    interests: string[];
    location: string;
    gender?: string;
  };
  budget?: string;
  startDate?: string;
  endDate?: string;
};

export type GenerateContentData = {
  campaignId: number;
  prompt: string;
  adType: string;
};

export function useAdCampaigns() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);
  const [selectedContent, setSelectedContent] = useState<AdContent | null>(null);

  // Fetch all campaigns
  const {
    data: campaigns = [],
    isLoading: isLoadingCampaigns,
    error: campaignsError,
  } = useQuery({
    queryKey: ["/api/ads/campaigns"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/ads/campaigns");
      return response.json();
    },
  });

  // Fetch campaign by ID with its content
  const {
    data: campaignDetails,
    isLoading: isLoadingCampaignDetails,
    error: campaignDetailsError,
    refetch: refetchCampaignDetails,
  } = useQuery({
    queryKey: ["/api/ads/campaigns", selectedCampaign?.id],
    queryFn: async () => {
      if (!selectedCampaign?.id) return null;
      const response = await apiRequest("GET", `/api/ads/campaigns/${selectedCampaign.id}`);
      return response.json();
    },
    enabled: !!selectedCampaign?.id,
  });

  // Create a new campaign
  const createCampaignMutation = useMutation({
    mutationFn: async (data: CreateCampaignData) => {
      const response = await apiRequest("POST", "/api/ads/campaigns", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ads/campaigns"] });
      toast({
        title: "Campaign Created",
        description: "Your ad campaign has been created successfully.",
      });
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update a campaign
  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateCampaignData> }) => {
      const response = await apiRequest("PATCH", `/api/ads/campaigns/${id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ads/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ads/campaigns", data.id] });
      toast({
        title: "Campaign Updated",
        description: "Your ad campaign has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete a campaign
  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/ads/campaigns/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ads/campaigns"] });
      if (selectedCampaign?.id === id) {
        setSelectedCampaign(null);
      }
      toast({
        title: "Campaign Deleted",
        description: "Your ad campaign has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Delete Campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate ad content
  const generateContentMutation = useMutation({
    mutationFn: async (data: GenerateContentData) => {
      const response = await apiRequest(
        "POST",
        `/api/ads/campaigns/${data.campaignId}/generate-content`,
        data
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ads/campaigns", data.campaignId] });
      toast({
        title: "Content Generated",
        description: "Your ad content has been generated successfully.",
      });
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Generate Content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate image for ad content
  const generateImageMutation = useMutation({
    mutationFn: async ({ contentId, customPrompt }: { contentId: number, customPrompt?: string }) => {
      const response = await apiRequest("POST", `/api/ads/contents/${contentId}/generate-image`, 
        customPrompt ? { customPrompt } : undefined
      );
      return response.json();
    },
    onSuccess: (data) => {
      if (selectedCampaign?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/ads/campaigns", selectedCampaign.id] });
      }
      toast({
        title: "Image Generated",
        description: "Image for your ad content has been generated successfully.",
      });
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Generate Image",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Analyze ad effectiveness
  const analyzeAdMutation = useMutation({
    mutationFn: async ({ contentId }: { contentId: number }) => {
      const response = await apiRequest("POST", `/api/ads/contents/${contentId}/analyze`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Analysis Complete",
        description: "Your ad content has been analyzed for effectiveness.",
      });
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Analyze Ad",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate hashtags for ad content
  const generateHashtagsMutation = useMutation({
    mutationFn: async ({ contentId }: { contentId: number }) => {
      const response = await apiRequest("POST", `/api/ads/contents/${contentId}/generate-hashtags`);
      return response.json();
    },
    onSuccess: (data) => {
      if (selectedCampaign?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/ads/campaigns", selectedCampaign.id] });
      }
      toast({
        title: "Hashtags Generated",
        description: "Hashtags for your ad content have been generated successfully.",
      });
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Generate Hashtags",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate platform-specific previews for ad content
  const generatePlatformPreviewsMutation = useMutation({
    mutationFn: async ({ contentId, platforms }: { contentId: number; platforms?: string[] }) => {
      const response = await apiRequest("POST", `/api/ads/contents/${contentId}/generate-previews`, { platforms });
      return response.json();
    },
    onSuccess: (data) => {
      if (selectedCampaign?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/ads/campaigns", selectedCampaign.id] });
      }
      toast({
        title: "Previews Generated",
        description: "Platform-specific previews for your ad have been generated successfully.",
      });
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Generate Previews",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create ad template from existing content
  const createTemplateMutation = useMutation({
    mutationFn: async ({ contentId, name, category }: { contentId: number; name: string; category: string }) => {
      const response = await apiRequest("POST", `/api/ads/contents/${contentId}/create-template`, {
        name,
        category
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ads/templates"] });
      toast({
        title: "Template Created",
        description: "A new ad template has been created from your content.",
      });
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch ad content with platform previews
  const {
    data: contentWithPreviews,
    isLoading: isLoadingContentPreviews,
    refetch: refetchContentWithPreviews
  } = useQuery({
    queryKey: ["/api/ads/contents", selectedContent?.id],
    queryFn: async () => {
      if (!selectedContent?.id) return null;
      const response = await apiRequest("GET", `/api/ads/contents/${selectedContent.id}`);
      return response.json();
    },
    enabled: !!selectedContent?.id,
  });

  // Fetch all ad templates
  const {
    data: adTemplates = [],
    isLoading: isLoadingTemplates,
  } = useQuery({
    queryKey: ["/api/ads/templates"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/ads/templates");
      return response.json();
    },
  });

  return {
    campaigns,
    isLoadingCampaigns,
    campaignsError,
    
    campaignDetails,
    isLoadingCampaignDetails,
    campaignDetailsError,
    refetchCampaignDetails,
    
    selectedCampaign,
    setSelectedCampaign,
    
    selectedContent,
    setSelectedContent,
    
    contentWithPreviews,
    isLoadingContentPreviews,
    refetchContentWithPreviews,
    
    createCampaignMutation,
    updateCampaignMutation,
    deleteCampaignMutation,
    
    generateContentMutation,
    generateImageMutation,
    analyzeAdMutation,
    generateHashtagsMutation,
    generatePlatformPreviewsMutation,
    createTemplateMutation,
    
    adTemplates,
    isLoadingTemplates,
  };
}