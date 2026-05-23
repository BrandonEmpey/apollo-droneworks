import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAdCampaigns, type CreateCampaignData, type GenerateContentData } from "@/hooks/use-ad-campaigns";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Trash2, RefreshCw, Image, Hash, BarChart, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Campaign form schema
const campaignFormSchema = z.object({
  name: z.string().min(2, { message: "Campaign name must be at least 2 characters." }),
  platform: z.string().min(1, { message: "Platform is required" }),
  objectives: z.string().min(5, { message: "Objectives must be at least 5 characters." }),
  targetAudience: z.object({
    ageRange: z.string().optional(),
    interests: z.array(z.string()).optional(),
    location: z.string().optional(),
    gender: z.string().optional(),
  }),
  budget: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Content generation form schema
const contentGenerationSchema = z.object({
  prompt: z.string().min(10, { message: "Prompt must be at least 10 characters." }),
  adType: z.string().min(1, { message: "Ad type is required" }),
});

export default function SocialMediaAdPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    campaigns,
    isLoadingCampaigns,
    campaignDetails,
    isLoadingCampaignDetails,
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
  } = useAdCampaigns();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isGenerateContentDialogOpen, setIsGenerateContentDialogOpen] = useState(false);
  const [interestInput, setInterestInput] = useState("");
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Form for creating a new campaign
  const campaignForm = useForm<z.infer<typeof campaignFormSchema>>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      platform: "",
      objectives: "",
      targetAudience: {
        ageRange: "",
        interests: [],
        location: "",
        gender: "",
      },
      budget: "",
      startDate: "",
      endDate: "",
    },
  });

  // Form for generating content
  const contentForm = useForm<z.infer<typeof contentGenerationSchema>>({
    resolver: zodResolver(contentGenerationSchema),
    defaultValues: {
      prompt: "",
      adType: "image",
    },
  });

  const onSubmitCampaignForm = (values: z.infer<typeof campaignFormSchema>) => {
    createCampaignMutation.mutate(values as CreateCampaignData, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        campaignForm.reset();
      },
    });
  };

  const onSubmitContentForm = (values: z.infer<typeof contentGenerationSchema>) => {
    if (!selectedCampaign) return;

    const data: GenerateContentData = {
      campaignId: selectedCampaign.id,
      prompt: values.prompt,
      adType: values.adType,
    };

    generateContentMutation.mutate(data, {
      onSuccess: () => {
        setIsGenerateContentDialogOpen(false);
        contentForm.reset();
      },
    });
  };

  const handleDeleteCampaign = (id: number) => {
    if (window.confirm("Are you sure you want to delete this campaign?")) {
      deleteCampaignMutation.mutate(id);
    }
  };

  const handleGenerateImage = (contentId: number, customPrompt?: string) => {
    generateImageMutation.mutate({ contentId, customPrompt });
  };
  
  const openRegenerateDialog = (contentId: number, existingPrompt?: string) => {
    setCurrentContentId(contentId);
    setCustomImagePrompt(existingPrompt || "");
    setIsRegenerateImageDialogOpen(true);
  };

  const handleGenerateHashtags = (contentId: number) => {
    generateHashtagsMutation.mutate({ contentId });
  };

  const handleAnalyzeAd = (contentId: number) => {
    analyzeAdMutation.mutate(
      { contentId },
      {
        onSuccess: (data) => {
          setAnalysisResult(data.analysis);
        },
      }
    );
  };

  const handleGeneratePlatformPreviews = (contentId: number, platforms?: string[]) => {
    generatePlatformPreviewsMutation.mutate(
      { contentId, platforms },
      {
        onSuccess: (data) => {
          toast({
            title: "Previews Generated",
            description: `Generated ${data.previews.length} platform-specific previews.`,
          });
        },
      }
    );
  };

  const [isCreateTemplateDialogOpen, setIsCreateTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("general");
  const [isRegenerateImageDialogOpen, setIsRegenerateImageDialogOpen] = useState(false);
  const [currentContentId, setCurrentContentId] = useState<number | null>(null);
  const [customImagePrompt, setCustomImagePrompt] = useState("");

  const handleCreateTemplate = (contentId: number) => {
    if (!templateName) {
      toast({
        title: "Template Name Required",
        description: "Please provide a name for your template.",
        variant: "destructive",
      });
      return;
    }

    createTemplateMutation.mutate(
      { 
        contentId, 
        name: templateName, 
        category: templateCategory 
      },
      {
        onSuccess: () => {
          setIsCreateTemplateDialogOpen(false);
          setTemplateName("");
          setTemplateCategory("general");
        },
      }
    );
  };

  const addInterest = () => {
    if (!interestInput.trim()) return;
    
    const currentInterests = campaignForm.getValues().targetAudience.interests || [];
    campaignForm.setValue("targetAudience.interests", [...currentInterests, interestInput]);
    setInterestInput("");
  };

  const removeInterest = (index: number) => {
    const currentInterests = campaignForm.getValues().targetAudience.interests || [];
    campaignForm.setValue(
      "targetAudience.interests",
      currentInterests.filter((_, i) => i !== index)
    );
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need to be logged in to access the ad campaign manager.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-4xl font-bold mb-6">AI-Powered Ad Campaign Manager</h1>
      {/* Image Regeneration Dialog */}
      <Dialog open={isRegenerateImageDialogOpen} onOpenChange={setIsRegenerateImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize Image Generation</DialogTitle>
            <DialogDescription>
              Modify the prompt to generate a different image that better fits your needs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customPrompt">Image Generation Prompt</Label>
              <Textarea
                id="customPrompt"
                placeholder="Describe the image you want to generate"
                value={customImagePrompt}
                onChange={(e) => setCustomImagePrompt(e.target.value)}
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Tip: Be specific about the style, colors, composition, lighting, and key elements you want in the image.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRegenerateImageDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => currentContentId && handleGenerateImage(currentContentId, customImagePrompt)}
              disabled={generateImageMutation.isPending || !customImagePrompt.trim()}
            >
              {generateImageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate New Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Your Campaigns</CardTitle>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> New Campaign
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Ad Campaign</DialogTitle>
                    <DialogDescription>
                      Set up your campaign details here. You can create tailored ad content for this campaign later.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...campaignForm}>
                    <form onSubmit={campaignForm.handleSubmit(onSubmitCampaignForm)} className="space-y-6">
                      <FormField
                        control={campaignForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Campaign Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Summer Promotion 2025" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={campaignForm.control}
                        name="platform"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Platform</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select platform" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="facebook">Facebook</SelectItem>
                                <SelectItem value="instagram">Instagram</SelectItem>
                                <SelectItem value="twitter">X (Twitter)</SelectItem>
                                <SelectItem value="linkedin">LinkedIn</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={campaignForm.control}
                        name="objectives"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Campaign Objectives</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe the goals of your campaign"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Target Audience</h3>
                        <FormField
                          control={campaignForm.control}
                          name="targetAudience.ageRange"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Age Range</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 25-45" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={campaignForm.control}
                          name="targetAudience.location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., New York, USA" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={campaignForm.control}
                          name="targetAudience.gender"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gender (Optional)</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="all">All</SelectItem>
                                  <SelectItem value="male">Male</SelectItem>
                                  <SelectItem value="female">Female</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={campaignForm.control}
                          name="targetAudience.interests"
                          render={() => (
                            <FormItem>
                              <FormLabel>Interests</FormLabel>
                              <div className="flex mb-2">
                                <Input
                                  placeholder="e.g., Photography"
                                  value={interestInput}
                                  onChange={(e) => setInterestInput(e.target.value)}
                                  className="mr-2"
                                />
                                <Button type="button" onClick={addInterest}>Add</Button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {campaignForm.watch("targetAudience.interests")?.map((interest, index) => (
                                  <div
                                    key={index}
                                    className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full flex items-center"
                                  >
                                    {interest}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="h-4 w-4 p-0 ml-2 text-secondary-foreground"
                                      onClick={() => removeInterest(index)}
                                    >
                                      ×
                                    </Button>
                                  </div>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={campaignForm.control}
                        name="budget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Budget (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., $500" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={campaignForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date (Optional)</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={campaignForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date (Optional)</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createCampaignMutation.isPending}
                        >
                          {createCampaignMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Create Campaign
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            <CardDescription>
              Manage your social media ad campaigns here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCampaigns ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No campaigns yet. Create your first campaign to get started!</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <Card
                      key={campaign.id}
                      className={`cursor-pointer hover:bg-secondary/50 ${
                        selectedCampaign?.id === campaign.id ? "border-primary" : ""
                      }`}
                      onClick={() => setSelectedCampaign(campaign)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{campaign.name}</CardTitle>
                            <CardDescription className="capitalize">
                              Platform: {campaign.platform}
                            </CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCampaign(campaign.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Status: <span className="capitalize">{campaign.status || "Draft"}</span>
                        </div>
                        {campaign.startDate && (
                          <div className="text-sm text-muted-foreground">
                            Starts: {format(new Date(campaign.startDate), "MMM dd, yyyy")}
                          </div>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Campaign Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedCampaign ? selectedCampaign.name : "Campaign Details"}
            </CardTitle>
            <CardDescription>
              {selectedCampaign
                ? `Manage content for your ${selectedCampaign.platform} campaign`
                : "Select a campaign to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedCampaign ? (
              <div className="py-10 text-center text-muted-foreground">
                <p>Please select a campaign from the list to view its details.</p>
              </div>
            ) : isLoadingCampaignDetails ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <Tabs defaultValue="details">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">Campaign Details</TabsTrigger>
                  <TabsTrigger value="content">Ad Content</TabsTrigger>
                  <TabsTrigger value="previews">Previews</TabsTrigger>
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2">Platform</h3>
                      <p className="capitalize">{campaignDetails?.platform}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Status</h3>
                      <p className="capitalize">{campaignDetails?.status || "Draft"}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Budget</h3>
                      <p>{campaignDetails?.budget || "Not specified"}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Date Range</h3>
                      <p>
                        {campaignDetails?.startDate
                          ? format(new Date(campaignDetails.startDate), "MMM dd, yyyy")
                          : "Not set"}{" "}
                        —{" "}
                        {campaignDetails?.endDate
                          ? format(new Date(campaignDetails.endDate), "MMM dd, yyyy")
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Objectives</h3>
                    <p>{campaignDetails?.objectives || "No objectives specified"}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Target Audience</h3>
                    {campaignDetails?.targetAudience ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-muted-foreground">Age Range:</span>
                          <p>{campaignDetails.targetAudience.ageRange || "Not specified"}</p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Location:</span>
                          <p>{campaignDetails.targetAudience.location || "Not specified"}</p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Gender:</span>
                          <p className="capitalize">{campaignDetails.targetAudience.gender || "All"}</p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Interests:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {campaignDetails.targetAudience.interests?.length ? (
                              campaignDetails.targetAudience.interests.map((interest, i) => (
                                <span
                                  key={i}
                                  className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full"
                                >
                                  {interest}
                                </span>
                              ))
                            ) : (
                              <p>No interests specified</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p>No target audience specified</p>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="content" className="py-4">
                  <div className="flex justify-between mb-6">
                    <h3 className="text-lg font-semibold">Ad Content</h3>
                    <Dialog open={isGenerateContentDialogOpen} onOpenChange={setIsGenerateContentDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" /> Generate New Content
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Generate Ad Content</DialogTitle>
                          <DialogDescription>
                            Our AI will create compelling ad content based on your prompt.
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...contentForm}>
                          <form onSubmit={contentForm.handleSubmit(onSubmitContentForm)} className="space-y-6">
                            <FormField
                              control={contentForm.control}
                              name="prompt"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Prompt</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Describe what kind of ad content you want to generate..."
                                      rows={4}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Be specific about the tone, style, and key messages for best results.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={contentForm.control}
                              name="adType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ad Type</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select ad type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="image">Image Ad</SelectItem>
                                      <SelectItem value="carousel">Carousel Ad</SelectItem>
                                      <SelectItem value="video">Video Ad</SelectItem>
                                      <SelectItem value="text">Text-only Ad</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <DialogFooter>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsGenerateContentDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={generateContentMutation.isPending}
                              >
                                {generateContentMutation.isPending && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Generate Content
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {!campaignDetails?.contents || campaignDetails.contents.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <p>No ad content yet. Generate your first ad content to get started!</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {campaignDetails.contents.map((content) => (
                        <Card key={content.id} className="overflow-hidden">
                          <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-md">{content.headline || "Untitled Ad"}</CardTitle>
                            <CardDescription>{format(new Date(content.createdAt), "MMM dd, yyyy")}</CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 space-y-4">
                            {content.imageUrl && (
                              <div className="rounded-md overflow-hidden relative group">
                                <img
                                  src={content.imageUrl}
                                  alt={content.headline || "Ad image"}
                                  className="w-full h-auto max-h-[300px] object-cover"
                                />
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-black/70 text-white border-white/50 hover:bg-black/90"
                                    onClick={() => openRegenerateDialog(content.id, content.aiPrompt)}
                                    disabled={generateImageMutation.isPending}
                                  >
                                    {generateImageMutation.isPending && (
                                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    )}
                                    <RefreshCw className="mr-1 h-3 w-3" /> Regenerate Image
                                  </Button>
                                </div>
                              </div>
                            )}
                            <div>
                              <h4 className="font-semibold text-sm mb-1">Ad Copy</h4>
                              <p className="text-sm">{content.description || "No ad copy available"}</p>
                            </div>
                            {content.callToAction && (
                              <div>
                                <h4 className="font-semibold text-sm mb-1">Call to Action</h4>
                                <p className="text-sm">{content.callToAction}</p>
                              </div>
                            )}
                            {content.hashtags && content.hashtags.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-sm mb-1">Hashtags</h4>
                                <div className="flex flex-wrap gap-1">
                                  {content.hashtags.map((tag, i) => (
                                    <span
                                      key={i}
                                      className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2 pt-2">
                              {!content.imageUrl && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleGenerateImage(content.id)}
                                  disabled={generateImageMutation.isPending}
                                >
                                  {generateImageMutation.isPending && (
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  )}
                                  <Image className="mr-1 h-3 w-3" /> Generate Image
                                </Button>
                              )}
                              {(!content.hashtags || content.hashtags.length === 0) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleGenerateHashtags(content.id)}
                                  disabled={generateHashtagsMutation.isPending}
                                >
                                  {generateHashtagsMutation.isPending && (
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  )}
                                  <Hash className="mr-1 h-3 w-3" /> Generate Hashtags
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedContent(content);
                                  handleAnalyzeAd(content.id);
                                }}
                                disabled={analyzeAdMutation.isPending}
                              >
                                {analyzeAdMutation.isPending && (
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                )}
                                <BarChart className="mr-1 h-3 w-3" /> Analyze
                              </Button>
                              {content.imageUrl && (
                                <Button
                                  size="sm"
                                  variant="default"
                                >
                                  <Send className="mr-1 h-3 w-3" /> Publish
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="previews" className="py-4">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Platform-Specific Ad Previews</h3>
                    <p className="text-muted-foreground">
                      Generate and view platform-specific ad previews before publishing to ensure optimal appearance across platforms.
                    </p>
                  </div>
                  
                  {selectedContent ? (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-md">{selectedContent.headline || "Untitled Ad"}</CardTitle>
                          <CardDescription>{format(new Date(selectedContent.createdAt), "MMM dd, yyyy")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-col space-y-4">
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => handleGeneratePlatformPreviews(selectedContent.id)}
                                disabled={generatePlatformPreviewsMutation?.isPending}
                              >
                                {generatePlatformPreviewsMutation?.isPending && (
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                )}
                                Generate Previews for All Platforms
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => refetchContentWithPreviews()}
                                disabled={isLoadingContentPreviews}
                              >
                                {isLoadingContentPreviews ? (
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="mr-2 h-3 w-3" />
                                )}
                                Refresh Previews
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsCreateTemplateDialogOpen(true)}
                              >
                                Save as Template
                              </Button>
                            </div>
                            
                            <Separator className="my-4" />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {isLoadingContentPreviews ? (
                                <div className="col-span-2 py-8 text-center">
                                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                  <p>Loading previews...</p>
                                </div>
                              ) : contentWithPreviews?.platformPreviews?.length > 0 ? (
                                contentWithPreviews.platformPreviews.map((preview, index) => (
                                  <Card key={index} className="overflow-hidden">
                                    <CardHeader className="p-3 bg-secondary">
                                      <CardTitle className="text-sm capitalize">{preview.platform} Preview</CardTitle>
                                      <CardDescription className="text-xs">
                                        {preview.dimensions}
                                      </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                      {preview.imageUrl && (
                                        <img 
                                          src={preview.imageUrl} 
                                          alt={`${preview.platform} preview`}
                                          className="w-full h-auto" 
                                        />
                                      )}
                                      <div className="p-4">
                                        <h4 className="text-sm font-medium mb-1">{contentWithPreviews.headline || selectedContent?.headline}</h4>
                                        <p className="text-xs text-muted-foreground">
                                          {(contentWithPreviews.description || selectedContent?.description)?.substring(0, 100)}
                                          {(contentWithPreviews.description || selectedContent?.description)?.length > 100 ? "..." : ""}
                                        </p>
                                        {(contentWithPreviews.callToAction || selectedContent?.callToAction) && (
                                          <div className="mt-2">
                                            <span className="inline-block bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                                              {contentWithPreviews.callToAction || selectedContent?.callToAction}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))
                              ) : (
                                <div className="col-span-2 py-8 text-center text-muted-foreground">
                                  <p>No platform previews generated yet. Click "Generate Previews" to create platform-specific versions of your ad.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-6">
                        <div className="text-center text-muted-foreground">
                          <p>Select an ad content from the "Ad Content" tab to generate platform-specific previews.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Dialog open={isCreateTemplateDialogOpen} onOpenChange={setIsCreateTemplateDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save as Template</DialogTitle>
                        <DialogDescription>
                          Create a reusable template from this ad content.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="templateName">Template Name</Label>
                          <Input
                            id="templateName"
                            placeholder="E.g., Summer Promotion Template"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="templateCategory">Category</Label>
                          <Select
                            value={templateCategory}
                            onValueChange={setTemplateCategory}
                          >
                            <SelectTrigger id="templateCategory">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="seasonal">Seasonal</SelectItem>
                              <SelectItem value="promotional">Promotional</SelectItem>
                              <SelectItem value="product">Product</SelectItem>
                              <SelectItem value="event">Event</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateTemplateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleCreateTemplate(selectedContent.id)}
                          disabled={createTemplateMutation?.isPending}
                        >
                          {createTemplateMutation?.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Template
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TabsContent>
                
                <TabsContent value="analysis" className="py-4">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Ad Content Analysis</h3>
                    <p className="text-muted-foreground">
                      AI-powered analysis of your ad content for effectiveness and engagement potential.
                    </p>
                  </div>
                  
                  {selectedContent ? (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-md">{selectedContent.headline || "Untitled Ad"}</CardTitle>
                          <CardDescription>{format(new Date(selectedContent.createdAt), "MMM dd, yyyy")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-start gap-4">
                            {selectedContent.imageUrl && (
                              <img
                                src={selectedContent.imageUrl}
                                alt={selectedContent.headline || "Ad image"}
                                className="w-1/3 rounded-md"
                              />
                            )}
                            <div className="space-y-2">
                              <p>{selectedContent.description || "No ad copy available"}</p>
                              {selectedContent.callToAction && (
                                <p className="font-medium">{selectedContent.callToAction}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {analyzeAdMutation.isPending ? (
                        <div className="py-8 flex justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <span className="ml-2">Analyzing content...</span>
                        </div>
                      ) : analysisResult ? (
                        <Card>
                          <CardHeader>
                            <CardTitle>Analysis Results</CardTitle>
                          </CardHeader>
                          <CardContent className="prose prose-sm max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: analysisResult.replace(/\n/g, '<br/>') }} />
                          </CardContent>
                          <div className="p-4 pt-0 flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAnalyzeAd(selectedContent.id)}
                            >
                              <RefreshCw className="mr-2 h-3 w-3" /> Refresh Analysis
                            </Button>
                          </div>
                        </Card>
                      ) : (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <p className="text-muted-foreground">
                              Click "Analyze" on an ad to see AI-powered analysis of its effectiveness.
                            </p>
                            <Button 
                              className="mt-4"
                              onClick={() => handleAnalyzeAd(selectedContent.id)}
                              disabled={analyzeAdMutation.isPending}
                            >
                              {analyzeAdMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Analyze This Ad
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">
                          Select an ad content from the "Ad Content" tab to view its analysis.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}