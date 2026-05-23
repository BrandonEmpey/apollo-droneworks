import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Brain, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Calendar,
  Clock,
  Settings,
  Search,
  Download,
  Edit,
  Eye
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface PricingSuggestion {
  id: number;
  serviceId: number;
  serviceName: string;
  currentPrice: string;
  suggestedPrice: string;
  confidence: string;
  reasoning: string;
  marketFactors: {
    competition: number;
    demand: number;
    seasonality: number;
    location: string;
  };
  isApplied: boolean;
  createdAt: string;
}

interface ExpeditedAvailability {
  availableSlots: Array<{
    weekStarting: string;
    weekEnding: string;
    available: boolean;
    reason: string;
  }>;
  currentExpeditedJobs: number;
  maxExpeditedJobs: number;
  blockedWeekends: string[];
}

interface CompetitorPrice {
  competitor: string;
  price: number;
  service: string;
  location: string;
}

interface ServiceCompetitorAnalysis {
  serviceId: number;
  serviceName: string;
  currentPrice: number;
  competitors: CompetitorPrice[];
  avgPrice: number;
  lowPrice: number;
  highPrice: number;
  suggestedPrice: number;
}

export default function PricingOptimizationNew() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [manualPrices, setManualPrices] = useState<Record<number, string>>({});
  const [selectedWeekend, setSelectedWeekend] = useState("");
  const [competitorAnalysis, setCompetitorAnalysis] = useState<ServiceCompetitorAnalysis[]>([]);
  const [editingPrice, setEditingPrice] = useState<{ serviceId: number; price: string } | null>(null);
  const [viewingCompetitors, setViewingCompetitors] = useState<ServiceCompetitorAnalysis | null>(null);
  const [pricingPercentage, setPricingPercentage] = useState<number>(95);

  // Fetch AI pricing suggestions
  const { data: pricingSuggestions = [], isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ["/api/pricing/suggestions"]
  });

  // Fetch expedited availability
  const { data: expeditedAvailability, isLoading: isLoadingAvailability } = useQuery({
    queryKey: ["/api/scheduling/expedited-availability"]
  });

  // Apply manual pricing mutation
  const applyManualPricingMutation = useMutation({
    mutationFn: async ({ serviceId, manualPrice, suggestionId }: { serviceId: number; manualPrice: string; suggestionId: number }) => {
      return apiRequest("POST", "/api/pricing/apply-manual", {
        serviceId,
        manualPrice,
        suggestionId
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Manual pricing applied successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing/suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply manual pricing",
        variant: "destructive"
      });
    }
  });

  // Block weekend mutation
  const blockWeekendMutation = useMutation({
    mutationFn: async ({ weekendDate, block }: { weekendDate: string; block: boolean }) => {
      return apiRequest("POST", "/api/scheduling/block-weekend", {
        weekendDate,
        block
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: data.message
      });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/expedited-availability"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update weekend block",
        variant: "destructive"
      });
    }
  });

  const handleApplyManualPrice = (suggestion: PricingSuggestion) => {
    const manualPrice = manualPrices[suggestion.id];
    if (!manualPrice) {
      toast({
        title: "Error",
        description: "Please enter a manual price",
        variant: "destructive"
      });
      return;
    }

    applyManualPricingMutation.mutate({
      serviceId: suggestion.serviceId,
      manualPrice,
      suggestionId: suggestion.id
    });
  };

  const handleBlockWeekend = (weekendDate: string, block: boolean) => {
    blockWeekendMutation.mutate({ weekendDate, block });
  };

  // Import current prices mutation
  const importCurrentPricesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/pricing/import-current", {});
      return response.json();
    },
    onSuccess: (data: any) => {
      setCompetitorAnalysis(data.map((service: any) => ({
        serviceId: service.id,
        serviceName: service.name,
        currentPrice: parseFloat(service.price),
        competitors: [],
        avgPrice: 0,
        lowPrice: 0,
        highPrice: 0,
        suggestedPrice: parseFloat(service.price)
      })));
      toast({
        title: "Prices Imported",
        description: `Imported prices for ${data.length} services`
      });
    }
  });

  // Fetch competitor prices mutation
  const fetchCompetitorPricesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/pricing/competitor-analysis", { 
        zipCode: "84780",
        percentage: pricingPercentage
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      setCompetitorAnalysis(data);
      toast({
        title: "Competitor Analysis Complete",
        description: `Fetched competitor prices for ${data.length} services`
      });
    },
    onError: () => {
      toast({
        title: "Analysis Failed",
        description: "Unable to fetch competitor prices",
        variant: "destructive"
      });
    }
  });

  // Update service price mutation
  const updateServicePriceMutation = useMutation({
    mutationFn: async ({ serviceId, newPrice }: { serviceId: number; newPrice: string }) => {
      console.log("Updating service", serviceId, "to price:", newPrice);
      const response = await apiRequest("PATCH", `/api/services/${serviceId}`, { price: parseInt(newPrice) });
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setEditingPrice(null);
      
      // Update local competitor analysis state with new price
      setCompetitorAnalysis(prev => prev.map(service => 
        service.serviceId === variables.serviceId 
          ? { ...service, currentPrice: parseFloat(variables.newPrice) / 100 }
          : service
      ));
      
      toast({
        title: "Price Updated",
        description: "Service price updated successfully"
      });
    },
    onError: (error: any) => {
      console.error("Error updating price:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update price",
        variant: "destructive"
      });
    }
  });

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case "high": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(price));
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revenue Optimization</h1>
          <p className="text-muted-foreground">
            AI-powered pricing suggestions with manual override and expedited scheduling management
          </p>
        </div>
      </div>

      <Tabs defaultValue="pricing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pricing">AI Pricing Suggestions</TabsTrigger>
          <TabsTrigger value="competitor">Competitor Analysis</TabsTrigger>
          <TabsTrigger value="expedited">Expedited Scheduling</TabsTrigger>
          <TabsTrigger value="analytics">Pricing Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Pricing Suggestions
              </CardTitle>
              <CardDescription>
                Review AI-generated pricing recommendations. You maintain full control over final pricing decisions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSuggestions ? (
                <div className="text-center py-8">Loading pricing suggestions...</div>
              ) : (
                <div className="space-y-6">
                  {(pricingSuggestions as PricingSuggestion[]).map((suggestion) => (
                    <Card key={suggestion.id} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{suggestion.serviceName}</CardTitle>
                          <Badge className={getConfidenceColor(suggestion.confidence)}>
                            {suggestion.confidence} Confidence
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Current Price:</span>
                              <span className="text-lg font-semibold">{formatPrice(suggestion.currentPrice)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">AI Suggested Price:</span>
                              <span className="text-lg font-semibold text-green-600">{formatPrice(suggestion.suggestedPrice)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Potential Increase:</span>
                              <span className="text-lg font-semibold text-blue-600">
                                {formatPrice((parseFloat(suggestion.suggestedPrice) - parseFloat(suggestion.currentPrice)).toString())}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor={`manual-price-${suggestion.id}`}>Manual Price Override</Label>
                              <div className="flex gap-2 mt-1">
                                <Input
                                  id={`manual-price-${suggestion.id}`}
                                  type="number"
                                  step="0.01"
                                  placeholder="Enter your price"
                                  value={manualPrices[suggestion.id] || ""}
                                  onChange={(e) => setManualPrices(prev => ({
                                    ...prev,
                                    [suggestion.id]: e.target.value
                                  }))}
                                />
                                <Button
                                  onClick={() => handleApplyManualPrice(suggestion)}
                                  disabled={applyManualPricingMutation.isPending}
                                >
                                  Apply
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-semibold mb-2">AI Reasoning:</h4>
                          <p className="text-sm text-gray-700">{suggestion.reasoning}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div className="text-center">
                              <div className="text-lg font-semibold">{suggestion.marketFactors.competition}%</div>
                              <div className="text-xs text-muted-foreground">Competition</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold">{suggestion.marketFactors.demand}%</div>
                              <div className="text-xs text-muted-foreground">Demand</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold">{suggestion.marketFactors.seasonality}%</div>
                              <div className="text-xs text-muted-foreground">Seasonality</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-semibold">{suggestion.marketFactors.location}</div>
                              <div className="text-xs text-muted-foreground">Location</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Competitor Pricing Analysis
              </CardTitle>
              <CardDescription>
                Compare your prices against 10 competitors within 45 miles of 84780
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 items-center flex-wrap">
                <Button
                  onClick={() => importCurrentPricesMutation.mutate()}
                  disabled={importCurrentPricesMutation.isPending}
                  data-testid="button-import-prices"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {importCurrentPricesMutation.isPending ? "Importing..." : "Import Current Prices"}
                </Button>
                <Button
                  onClick={() => fetchCompetitorPricesMutation.mutate()}
                  disabled={fetchCompetitorPricesMutation.isPending || competitorAnalysis.length === 0}
                  variant="secondary"
                  data-testid="button-fetch-competitors"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {fetchCompetitorPricesMutation.isPending ? "Fetching..." : "Fetch Competitor Prices"}
                </Button>
                <div className="flex items-center gap-2 ml-auto">
                  <Label htmlFor="pricing-percentage" className="whitespace-nowrap">
                    Pricing %:
                  </Label>
                  <Input
                    id="pricing-percentage"
                    type="number"
                    min="50"
                    max="100"
                    value={pricingPercentage}
                    onChange={(e) => setPricingPercentage(parseInt(e.target.value) || 95)}
                    className="w-20"
                    data-testid="input-pricing-percentage"
                  />
                </div>
              </div>

              {competitorAnalysis.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Your Price</TableHead>
                        <TableHead>Low</TableHead>
                        <TableHead>Average</TableHead>
                        <TableHead>High</TableHead>
                        <TableHead>Suggested ({pricingPercentage}% of Avg)</TableHead>
                        <TableHead>Competitor Details</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {competitorAnalysis.map((service) => (
                        <TableRow key={service.serviceId} data-testid={`row-service-${service.serviceId}`}>
                          <TableCell className="font-medium">{service.serviceName}</TableCell>
                          <TableCell>
                            {editingPrice?.serviceId === service.serviceId ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex gap-2">
                                  <Input
                                    type="number"
                                    value={editingPrice.price}
                                    onChange={(e) => setEditingPrice({ ...editingPrice, price: e.target.value })}
                                    className={`w-24 ${editingPrice.price.trim() !== '' && (isNaN(parseFloat(editingPrice.price)) || parseFloat(editingPrice.price) < 0) ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    data-testid={`input-edit-price-${service.serviceId}`}
                                  />
                                  <Button
                                    size="sm"
                                    disabled={editingPrice.price.trim() === '' || isNaN(parseFloat(editingPrice.price)) || parseFloat(editingPrice.price) < 0}
                                    onClick={() => updateServicePriceMutation.mutate({
                                      serviceId: service.serviceId,
                                      newPrice: Math.round(parseFloat(editingPrice.price) * 100).toString()
                                    })}
                                    data-testid={`button-save-price-${service.serviceId}`}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                </div>
                                {(editingPrice.price.trim() === '' || isNaN(parseFloat(editingPrice.price)) || parseFloat(editingPrice.price) < 0) && (
                                  <p className="text-xs text-red-500" data-testid={`error-price-${service.serviceId}`}>
                                    Please enter a valid price
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span 
                                  className={service.suggestedPrice > 0 ? (service.currentPrice < service.suggestedPrice ? "text-green-600 font-medium" : "text-orange-600 font-medium") : ""}
                                  data-testid={`text-current-price-${service.serviceId}`}
                                >
                                  ${service.currentPrice.toFixed(2)}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingPrice({ serviceId: service.serviceId, price: service.currentPrice.toString() })}
                                  data-testid={`button-edit-price-${service.serviceId}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell data-testid={`text-low-price-${service.serviceId}`}>
                            {service.lowPrice > 0 ? `$${service.lowPrice.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell data-testid={`text-avg-price-${service.serviceId}`}>
                            {service.avgPrice > 0 ? `$${service.avgPrice.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell data-testid={`text-high-price-${service.serviceId}`}>
                            {service.highPrice > 0 ? `$${service.highPrice.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell data-testid={`text-suggested-price-${service.serviceId}`}>
                            {service.suggestedPrice > 0 ? `$${service.suggestedPrice.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell>
                            {service.competitors.length > 0 ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    data-testid={`button-view-competitors-${service.serviceId}`}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View {service.competitors.length}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh]">
                                  <DialogHeader>
                                    <DialogTitle>Competitor Prices for {service.serviceName}</DialogTitle>
                                    <DialogDescription>
                                      Prices from {service.competitors.length} competitors within 45 miles of 84780
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="mt-4 overflow-y-auto max-h-[60vh]">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Competitor</TableHead>
                                          <TableHead>Location</TableHead>
                                          <TableHead className="text-right">Price</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {service.competitors.map((comp, idx) => (
                                          <TableRow key={idx} data-testid={`competitor-row-${idx}`}>
                                            <TableCell className="font-medium">{comp.competitor}</TableCell>
                                            <TableCell>{comp.location}</TableCell>
                                            <TableCell className="text-right">${comp.price.toFixed(2)}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                    <div className="mt-4 p-4 bg-muted rounded-lg">
                                      <h4 className="font-semibold mb-2">Analysis Summary</h4>
                                      <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                          <div className="text-muted-foreground">Lowest Price</div>
                                          <div className="font-semibold">${service.lowPrice.toFixed(2)}</div>
                                        </div>
                                        <div>
                                          <div className="text-muted-foreground">Average Price</div>
                                          <div className="font-semibold">${service.avgPrice.toFixed(2)}</div>
                                        </div>
                                        <div>
                                          <div className="text-muted-foreground">Highest Price</div>
                                          <div className="font-semibold">${service.highPrice.toFixed(2)}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            {service.suggestedPrice > 0 && service.currentPrice !== service.suggestedPrice && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateServicePriceMutation.mutate({
                                  serviceId: service.serviceId,
                                  newPrice: Math.round(service.suggestedPrice * 100).toString()
                                })}
                                data-testid={`button-apply-suggested-${service.serviceId}`}
                              >
                                Apply
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {competitorAnalysis.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Click "Import Current Prices" to begin competitor analysis
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expedited" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Expedited Scheduling Management
              </CardTitle>
              <CardDescription>
                Manage expedited job scheduling with weekend blocking. Maximum one expedited job at a time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAvailability ? (
                <div className="text-center py-8">Loading availability...</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Current Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {(expeditedAvailability as ExpeditedAvailability)?.currentExpeditedJobs || 0}/
                          {(expeditedAvailability as ExpeditedAvailability)?.maxExpeditedJobs || 1}
                        </div>
                        <div className="text-xs text-muted-foreground">Expedited Jobs</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Blocked Weekends</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {(expeditedAvailability as ExpeditedAvailability)?.blockedWeekends?.length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Weekends Blocked</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Available Slots</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {(expeditedAvailability as ExpeditedAvailability)?.availableSlots?.filter(slot => slot.available).length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Open Weeks</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Weekend Availability</h4>
                    <div className="grid gap-4">
                      {(expeditedAvailability as ExpeditedAvailability)?.availableSlots?.map((slot, index) => (
                        <Card key={index} className={`border-l-4 ${slot.available ? 'border-l-green-500' : 'border-l-red-500'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold">
                                  {new Date(slot.weekStarting).toLocaleDateString()} - {new Date(slot.weekEnding).toLocaleDateString()}
                                </div>
                                <div className="text-sm text-muted-foreground">{slot.reason}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={slot.available ? "default" : "secondary"}>
                                  {slot.available ? "Available" : "Blocked"}
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleBlockWeekend(slot.weekStarting, !slot.available)}
                                  disabled={blockWeekendMutation.isPending}
                                >
                                  {slot.available ? "Block" : "Unblock"}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Performance Analytics</CardTitle>
              <CardDescription>
                Track the impact of pricing changes on revenue and booking rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Pricing analytics dashboard coming soon. This will show revenue impact, conversion rates, and competitor analysis.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}