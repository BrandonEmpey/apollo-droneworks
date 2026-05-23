import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Calculator, 
  MapPin, 
  Clock, 
  DollarSign, 
  Download, 
  Send,
  Plus,
  Minus,
  Zap,
  Calendar,
  AlertCircle
} from "lucide-react";

interface Service {
  id: number;
  name: string;
  description: string;
  price: string;
  features: string[];
}

interface Addon {
  id: number;
  name: string;
  description: string;
  price: string;
  category: string;
}

interface QuoteItem {
  serviceId: number;
  serviceName: string;
  quantity: number;
  basePrice: number;
  addons: number[];
  isRush: boolean;
}

interface QuoteCalculation {
  totalPrice: number;
  breakdown: Array<{
    serviceId: number | null;
    serviceName: string;
    quantity: number;
    basePrice: number;
    finalPrice: number;
    isRush: boolean;
  }>;
  zone: string;
  currency: string;
}

export default function QuoteBuilder() {
  const { toast } = useToast();
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [clientInfo, setClientInfo] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    location: "",
    zipCode: ""
  });
  const [projectDetails, setProjectDetails] = useState({
    projectName: "",
    description: "",
    timeline: "",
    rushDelivery: false
  });
  const [calculation, setCalculation] = useState<QuoteCalculation | null>(null);

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    retry: false
  });

  const { data: addons = [] } = useQuery<Addon[]>({
    queryKey: ["/api/addons"],
    retry: false
  });

  const calculatePricingMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/pricing/calculate", "POST", data),
    onSuccess: (result) => {
      setCalculation(result);
    },
    onError: () => {
      toast({
        title: "Calculation Error",
        description: "Unable to calculate pricing",
        variant: "destructive"
      });
    }
  });

  const generateQuoteMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/quotes/generate", "POST", data),
    onSuccess: () => {
      toast({
        title: "Quote Generated",
        description: "Quote has been generated and sent to client"
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Unable to generate quote",
        variant: "destructive"
      });
    }
  });

  const addService = (serviceId: number) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const existingItem = quoteItems.find(item => item.serviceId === serviceId);
    if (existingItem) {
      setQuoteItems(items =>
        items.map(item =>
          item.serviceId === serviceId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setQuoteItems(items => [
        ...items,
        {
          serviceId,
          serviceName: service.name,
          quantity: 1,
          basePrice: parseFloat(service.price) / 100,
          addons: [],
          isRush: false
        }
      ]);
    }
  };

  const removeService = (serviceId: number) => {
    setQuoteItems(items => items.filter(item => item.serviceId !== serviceId));
  };

  const updateQuantity = (serviceId: number, quantity: number) => {
    if (quantity <= 0) {
      removeService(serviceId);
      return;
    }
    
    setQuoteItems(items =>
      items.map(item =>
        item.serviceId === serviceId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const toggleRush = (serviceId: number) => {
    setQuoteItems(items =>
      items.map(item =>
        item.serviceId === serviceId
          ? { ...item, isRush: !item.isRush }
          : item
      )
    );
  };

  // Sends selected services to the server for price calculation.
  // This is distinct from the shared calculateTotal utility (client/src/lib/quote-utils.ts),
  // which totals individual line-item fields locally inside QuoteManager.
  const requestServerPricing = () => {
    if (quoteItems.length === 0) return;

    const serviceIds = quoteItems.map(item => item.serviceId);
    const quantities = quoteItems.map(item => item.quantity);
    const hasRush = quoteItems.some(item => item.isRush);

    calculatePricingMutation.mutate({
      serviceIds,
      quantities,
      location: clientInfo.location,
      zipCode: clientInfo.zipCode,
      isRush: hasRush || projectDetails.rushDelivery
    });
  };

  const generateQuote = () => {
    if (!calculation || quoteItems.length === 0) return;

    const quoteData = {
      clientInfo,
      projectDetails,
      items: quoteItems,
      calculation,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };

    generateQuoteMutation.mutate(quoteData);
  };

  useEffect(() => {
    if (quoteItems.length > 0 && (clientInfo.location || clientInfo.zipCode)) {
      requestServerPricing();
    }
  }, [quoteItems, clientInfo.location, clientInfo.zipCode, projectDetails.rushDelivery]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Interactive Quote Builder</h1>
        <p className="text-muted-foreground">
          Create professional quotes with real-time pricing calculations
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Service Selection */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Services</CardTitle>
              <CardDescription>Choose the services you need for your project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {services.map(service => (
                  <div key={service.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{service.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {service.description}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <DollarSign className="w-4 h-4" />
                          Starting at {formatCurrency(parseFloat(service.price) / 100)}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addService(service.id)}
                        variant="outline"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    {service.features && service.features.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {service.features.slice(0, 3).map((feature, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {service.features.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{service.features.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
              <CardDescription>Enter client details for accurate pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={clientInfo.name}
                    onChange={(e) => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter client name"
                  />
                </div>
                <div>
                  <Label htmlFor="clientEmail">Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={clientInfo.email}
                    onChange={(e) => setClientInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="client@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientPhone">Phone</Label>
                  <Input
                    id="clientPhone"
                    value={clientInfo.phone}
                    onChange={(e) => setClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="clientCompany">Company</Label>
                  <Input
                    id="clientCompany"
                    value={clientInfo.company}
                    onChange={(e) => setClientInfo(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Project Location</Label>
                  <Input
                    id="location"
                    value={clientInfo.location}
                    onChange={(e) => setClientInfo(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="City, State"
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={clientInfo.zipCode}
                    onChange={(e) => setClientInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                    placeholder="12345"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Provide additional project information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={projectDetails.projectName}
                  onChange={(e) => setProjectDetails(prev => ({ ...prev, projectName: e.target.value }))}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="w-full border rounded-md p-2 h-20"
                  value={projectDetails.description}
                  onChange={(e) => setProjectDetails(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your project requirements"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rushDelivery"
                  checked={projectDetails.rushDelivery}
                  onCheckedChange={(checked) => 
                    setProjectDetails(prev => ({ ...prev, rushDelivery: checked as boolean }))
                  }
                />
                <Label htmlFor="rushDelivery" className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  Rush Delivery (Additional fees may apply)
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quote Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Quote Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quoteItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Add services to see pricing</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quoteItems.map(item => (
                    <div key={item.serviceId} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.serviceName}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatCurrency(item.basePrice)} each</span>
                            {item.isRush && (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                <Zap className="w-3 h-3 mr-1" />
                                Rush
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeService(item.serviceId)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.serviceId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="px-3 py-1 border rounded text-center min-w-[50px]">
                          {item.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.serviceId, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant={item.isRush ? "default" : "outline"}
                          onClick={() => toggleRush(item.serviceId)}
                          className={item.isRush ? "bg-orange-500 hover:bg-orange-600" : ""}
                        >
                          <Zap className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Separator />

                  {calculation && (
                    <div className="space-y-3">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(calculation.totalPrice / 100)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Zone: {calculation.zone}
                          </span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total:</span>
                        <span>{formatCurrency(calculation.totalPrice / 100)}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-4">
                    <Button 
                      className="w-full" 
                      onClick={requestServerPricing}
                      disabled={calculatePricingMutation.isPending}
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      {calculatePricingMutation.isPending ? "Calculating..." : "Recalculate"}
                    </Button>
                    
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={generateQuote}
                      disabled={!calculation || generateQuoteMutation.isPending || !clientInfo.email}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {generateQuoteMutation.isPending ? "Generating..." : "Send Quote"}
                    </Button>

                    {!clientInfo.email && (
                      <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                        <AlertCircle className="w-3 h-3" />
                        Email required to send quote
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {calculation && calculation.breakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pricing Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {calculation.breakdown.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="flex-1">
                        {item.serviceName}
                        {item.quantity > 1 && ` (×${item.quantity})`}
                        {item.isRush && <span className="text-orange-600"> + Rush</span>}
                      </span>
                      <span>{formatCurrency(item.finalPrice / 100)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}