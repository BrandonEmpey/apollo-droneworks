import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { BookingCalendar } from "@/components/ui/booking-calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Loader2, Info, Check, Calendar, Clock, ShoppingCart, User } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type BundleDiscount = {
  id: number;
  primaryServiceId: number;
  secondaryServiceId: number;
  discountPercentage: number;
};

type AppliedBundle = {
  primaryServiceId: number;
  secondaryServiceId: number;
  discountPercentage: number;
  savings: number;
  primaryServiceName: string;
  secondaryServiceName: string;
};

export function BookingSection() {
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const timeSlots = ["9:00 AM", "10:30 AM", "1:00 PM", "2:30 PM", "4:00 PM"];

  const {
    data: services,
    isLoading,
    error,
  } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const {
    data: bundleDiscounts,
  } = useQuery<BundleDiscount[]>({
    queryKey: ["/api/service-bundle-discounts"],
  });

  const handleServiceToggle = (serviceId: number) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  // Build adjacency map for bundleable services
  const bundleAdjacencyMap = useMemo(() => {
    const adjacencyMap = new Map<number, Set<number>>();
    
    if (!bundleDiscounts) return adjacencyMap;
    
    for (const bundle of bundleDiscounts) {
      // Add both directions for easy lookup
      if (!adjacencyMap.has(bundle.primaryServiceId)) {
        adjacencyMap.set(bundle.primaryServiceId, new Set());
      }
      if (!adjacencyMap.has(bundle.secondaryServiceId)) {
        adjacencyMap.set(bundle.secondaryServiceId, new Set());
      }
      adjacencyMap.get(bundle.primaryServiceId)!.add(bundle.secondaryServiceId);
      adjacencyMap.get(bundle.secondaryServiceId)!.add(bundle.primaryServiceId);
    }
    
    return adjacencyMap;
  }, [bundleDiscounts]);

  // Determine which services are bundleable with currently selected services
  // Track discount percentage AND which selected service they pair with
  type BundleableInfo = {
    discountPercentage: number;
    pairedWithServiceId: number;
    pairedWithServiceName: string;
  };
  
  const bundleableServicesWithDiscount = useMemo(() => {
    const bundleableMap = new Map<number, BundleableInfo>(); // serviceId -> bundle info
    
    if (!bundleDiscounts || !services) return bundleableMap;
    
    // Find services that are already part of a completed bundle (both services selected)
    const servicesInCompletedBundles = new Set<number>();
    bundleDiscounts.forEach(bundle => {
      if (selectedServices.includes(bundle.primaryServiceId) && 
          selectedServices.includes(bundle.secondaryServiceId)) {
        servicesInCompletedBundles.add(bundle.primaryServiceId);
        servicesInCompletedBundles.add(bundle.secondaryServiceId);
      }
    });
    
    // Only look for new bundles from selected services NOT already in a completed bundle
    selectedServices.forEach(selectedId => {
      // Skip if this service is already part of a completed bundle
      if (servicesInCompletedBundles.has(selectedId)) return;
      
      const selectedService = services.find(s => s.id === selectedId);
      if (!selectedService) return;
      
      // Find all bundles where the selected service is primary or secondary
      bundleDiscounts.forEach(bundle => {
        let targetServiceId: number | null = null;
        
        if (bundle.primaryServiceId === selectedId) {
          targetServiceId = bundle.secondaryServiceId;
        } else if (bundle.secondaryServiceId === selectedId) {
          targetServiceId = bundle.primaryServiceId;
        }
        
        if (targetServiceId && !selectedServices.includes(targetServiceId)) {
          // Store the best (highest) discount for this service
          const current = bundleableMap.get(targetServiceId);
          if (!current || bundle.discountPercentage > current.discountPercentage) {
            bundleableMap.set(targetServiceId, {
              discountPercentage: bundle.discountPercentage,
              pairedWithServiceId: selectedId,
              pairedWithServiceName: selectedService.name,
            });
          }
        }
      });
    });
    
    return bundleableMap;
  }, [selectedServices, bundleDiscounts, services]);

  // For backward compatibility - set of bundleable service IDs
  const bundleableServiceIds = useMemo(() => {
    return new Set(bundleableServicesWithDiscount.keys());
  }, [bundleableServicesWithDiscount]);

  const { totalPrice, appliedBundles, subtotal, totalSavings } = useMemo(() => {
    if (!services || selectedServices.length === 0) {
      return { totalPrice: 0, appliedBundles: [], subtotal: 0, totalSavings: 0 };
    }

    const subtotal = selectedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);

    if (!bundleDiscounts || bundleDiscounts.length === 0 || selectedServices.length < 2) {
      return { totalPrice: subtotal, appliedBundles: [], subtotal, totalSavings: 0 };
    }

    // Build list of applicable bundles with their savings and bitmask indices
    const serviceIdToIndex = new Map<number, number>();
    selectedServices.forEach((id, idx) => serviceIdToIndex.set(id, idx));

    type BundleWithMask = BundleDiscount & { savings: number; mask: number };
    const applicableBundles: BundleWithMask[] = [];
    
    for (const bundle of bundleDiscounts) {
      const primaryIdx = serviceIdToIndex.get(bundle.primaryServiceId);
      const secondaryIdx = serviceIdToIndex.get(bundle.secondaryServiceId);
      
      if (primaryIdx !== undefined && secondaryIdx !== undefined) {
        const secondaryService = services.find(s => s.id === bundle.secondaryServiceId);
        if (secondaryService) {
          const savings = (secondaryService.price * bundle.discountPercentage) / 100;
          const mask = (1 << primaryIdx) | (1 << secondaryIdx);
          applicableBundles.push({ ...bundle, savings, mask });
        }
      }
    }

    if (applicableBundles.length === 0) {
      return { totalPrice: subtotal, appliedBundles: [], subtotal, totalSavings: 0 };
    }

    // Use bitmask DP to find optimal set of non-overlapping bundles
    const n = selectedServices.length;
    const fullMask = (1 << n) - 1;
    
    // dp[mask] = { maxSavings, bundleIndices }
    const dp: Array<{ maxSavings: number; bundleIndices: number[] }> = 
      Array.from({ length: fullMask + 1 }, () => ({ maxSavings: 0, bundleIndices: [] }));

    // For each subset of services, try adding each applicable bundle
    for (let mask = 0; mask <= fullMask; mask++) {
      for (let i = 0; i < applicableBundles.length; i++) {
        const bundle = applicableBundles[i];
        // Check if bundle's services don't overlap with current mask
        if ((mask & bundle.mask) === 0) {
          const newMask = mask | bundle.mask;
          const newSavings = dp[mask].maxSavings + bundle.savings;
          if (newSavings > dp[newMask].maxSavings) {
            dp[newMask] = {
              maxSavings: newSavings,
              bundleIndices: [...dp[mask].bundleIndices, i]
            };
          }
        }
      }
    }

    // Find the best result (mask that gives maximum savings)
    let bestMask = 0;
    for (let mask = 0; mask <= fullMask; mask++) {
      if (dp[mask].maxSavings > dp[bestMask].maxSavings) {
        bestMask = mask;
      }
    }

    // Build the applied bundles list from the DP result
    const appliedBundles: AppliedBundle[] = dp[bestMask].bundleIndices.map(idx => {
      const bundle = applicableBundles[idx];
      const primaryService = services.find(s => s.id === bundle.primaryServiceId);
      const secondaryService = services.find(s => s.id === bundle.secondaryServiceId);
      
      return {
        primaryServiceId: bundle.primaryServiceId,
        secondaryServiceId: bundle.secondaryServiceId,
        discountPercentage: bundle.discountPercentage,
        savings: bundle.savings,
        primaryServiceName: primaryService?.name || '',
        secondaryServiceName: secondaryService?.name || '',
      };
    });

    const totalSavings = dp[bestMask].maxSavings;
    const totalPrice = subtotal - totalSavings;

    return { totalPrice, appliedBundles, subtotal, totalSavings };
  }, [services, selectedServices, bundleDiscounts]);

  const handleProceedToPayment = () => {
    if (selectedServices.length === 0 || !selectedDate || !selectedTime) {
      toast({
        title: "Incomplete booking",
        description: "Please select at least one service, date, and time",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to complete your booking",
        variant: "destructive",
      });
      setLocation("/auth?redirect=/booking");
      return;
    }

    setLocation(`/booking?services=${selectedServices.join(',')}&date=${selectedDate?.toISOString()}&time=${selectedTime}`);
  };

  const steps = [
    { id: 1, label: "Select Date", icon: Calendar, completed: !!selectedDate },
    { id: 2, label: "Choose Time", icon: Clock, completed: !!selectedTime },
    { id: 3, label: "Pick Services", icon: ShoppingCart, completed: selectedServices.length > 0 },
    { id: 4, label: "Your Info", icon: User, completed: false },
  ];

  const currentStep = !selectedDate ? 1 : !selectedTime ? 2 : selectedServices.length === 0 ? 3 : 4;

  if (isLoading) {
    return (
      <section id="booking" className="py-20 bg-[#0b111f]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold font-montserrat text-gold-gradient mb-4">Book Your Service</h2>
          <p className="text-offwhite max-w-2xl mx-auto mb-10">
            Schedule a drone shoot and let us elevate your project
          </p>
          <div className="flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-gold-gradient" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="booking" className="py-20 bg-[#0b111f]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold font-montserrat text-gold-gradient mb-4">Book Your Service</h2>
          <p className="text-offwhite max-w-2xl mx-auto">
            Schedule a drone shoot and let us elevate your project
          </p>
        </div>

        <div className="bg-[#142642] p-6 rounded-lg border border-gold-dark/30">
          {/* Top Row - Calendar and Contact Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Left - Calendar */}
            <div>
              <h3 className="text-xl font-semibold font-montserrat text-gold-gradient mb-4">Select Date & Time</h3>
              
              <BookingCalendar
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
              
              {selectedDate && (
                <div className="mt-6">
                  <h4 className="font-montserrat text-offwhite mb-3">
                    Available Time Slots for {selectedDate.toLocaleDateString()}
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        className={`py-2 px-3 text-sm border rounded hover:border-gold transition-colors ${
                          selectedTime === time
                            ? "border-gold bg-gold/10 text-gold"
                            : "border-offwhite/20 text-offwhite"
                        }`}
                        onClick={() => handleTimeSelect(time)}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right - Contact Details and Step Indicator */}
            <div>
              <h3 className="text-xl font-semibold font-montserrat text-gold-gradient mb-4">Your Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-offwhite/80">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    className="bg-[#0b111f] border-offwhite/20 text-offwhite"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-offwhite/80">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    className="bg-[#0b111f] border-offwhite/20 text-offwhite"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-offwhite/80">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    className="bg-[#0b111f] border-offwhite/20 text-offwhite"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-offwhite/80">Project Address</Label>
                  <Input
                    id="address"
                    type="text"
                    className="bg-[#0b111f] border-offwhite/20 text-offwhite"
                  />
                </div>
              </div>

              {/* Step Indicator */}
              <div className="bg-[#0b111f] rounded-lg p-4">
                <div className="flex justify-between items-center">
                  {steps.map((step, index) => {
                    const StepIcon = step.icon;
                    const isCompleted = step.completed;
                    const isNext = step.id === currentStep;
                    
                    const goldGradient = 'linear-gradient(135deg, #a8860c, #d4a91a, #f0c940)';
                    
                    return (
                      <div key={step.id} className="flex flex-col items-center flex-1">
                        <div className="flex items-center w-full">
                          {index > 0 && (
                            <div 
                              className="flex-1 h-0.5"
                              style={{ background: steps[index - 1].completed ? goldGradient : 'rgba(255,255,255,0.2)' }}
                            />
                          )}
                          <div
                            className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                              !isCompleted && !isNext ? 'bg-offwhite/10 border border-offwhite/20' : ''
                            }`}
                            style={
                              isCompleted 
                                ? { background: goldGradient }
                                : isNext 
                                ? { 
                                    background: 'transparent',
                                    border: '2px solid',
                                    borderColor: '#d4a91a'
                                  }
                                : undefined
                            }
                          >
                            {isCompleted ? (
                              <Check className="w-5 h-5 text-[#0b111f]" />
                            ) : (
                              <StepIcon className={`w-5 h-5 ${isNext ? 'text-gold' : 'text-offwhite/50'}`} />
                            )}
                          </div>
                          {index < steps.length - 1 && (
                            <div 
                              className="flex-1 h-0.5"
                              style={{ background: step.completed ? goldGradient : 'rgba(255,255,255,0.2)' }}
                            />
                          )}
                        </div>
                        <span className={`mt-2 text-xs font-montserrat text-center ${
                          isCompleted ? 'text-gold' : isNext ? 'text-gold' : 'text-offwhite/50'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row - Services */}
          <div className="border-t border-gold-dark/20 pt-6">
            <h3 className="text-xl font-semibold font-montserrat text-gold-gradient mb-4">Select Services</h3>
            
            <TooltipProvider>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
                {services?.filter((service) => !service.hideFromServicesPage).map((service) => {
                  const isSelected = selectedServices.includes(service.id);
                  const isBundleable = bundleableServiceIds.has(service.id);
                  const bundleInfo = bundleableServicesWithDiscount.get(service.id);
                  return (
                    <div
                      key={service.id}
                      className={`service-select-card relative flex items-center justify-between rounded-lg p-3 ${
                        isSelected
                          ? "selected"
                          : isBundleable
                          ? "bundleable"
                          : ""
                      }`}
                      data-testid={`service-card-${service.id}`}
                      onClick={() => handleServiceToggle(service.id)}
                    >
                      {/* Bundle & Save Badge */}
                      {isBundleable && bundleInfo && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="absolute -top-2 -right-2 z-10 cursor-help">
                              <div className="bg-gradient-to-r from-[#C7AE6A] via-[#E2D68B] to-[#8A6A2F] text-[#0b111f] text-xs font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap">
                                Save {bundleInfo.discountPercentage}%
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            className="bg-[#0b111f] border-gold/30 text-offwhite text-xs"
                          >
                            <p>Bundle with <span className="text-gold font-semibold">{bundleInfo.pairedWithServiceName}</span></p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Checkbox
                          id={`service-${service.id}`}
                          checked={isSelected}
                          className="border-gold data-[state=checked]:border-gold flex-shrink-0 pointer-events-none"
                        />
                        <label
                          htmlFor={`service-${service.id}`}
                          className="font-montserrat text-offwhite text-sm cursor-pointer truncate"
                        >
                          {service.name}
                        </label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              className="text-offwhite/50 hover:text-gold transition-colors flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            className="max-w-xs bg-[#0b111f] border-gold/30 text-offwhite"
                          >
                            <p>{service.tooltipDescription || service.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-gold-gradient font-semibold text-sm ml-2 flex-shrink-0">
                        ${Math.round(service.price / 100).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </TooltipProvider>

            {/* Total and Submit */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-gold-dark/20 gap-4">
              <div className="flex-1">
                {selectedServices.length > 0 && (
                  <div className="space-y-2">
                    {appliedBundles.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-offwhite/70 text-sm">
                          Subtotal: ${Math.round(subtotal / 100).toLocaleString()}
                        </p>
                        {appliedBundles.map((bundle, index) => (
                          <p key={index} className="text-green-400 text-sm flex items-center gap-1">
                            <Check className="h-4 w-4" />
                            Bundle: {bundle.primaryServiceName} + {bundle.secondaryServiceName} 
                            <span className="font-semibold">(-${Math.round(bundle.savings / 100).toLocaleString()})</span>
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="text-offwhite">
                      <span className="text-offwhite/70">Total: </span>
                      <span className="text-gold-gradient font-bold text-xl">
                        ${Math.round(totalPrice / 100).toLocaleString()}
                      </span>
                      {totalSavings > 0 && (
                        <span className="text-green-400 text-sm ml-2">
                          You save ${Math.round(totalSavings / 100).toLocaleString()}!
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Link href="/services">
                  <Button
                    variant="outline"
                    className="border-gold text-offwhite hover:bg-gold/10"
                  >
                    View All Services
                  </Button>
                </Link>
                <Button
                  onClick={handleProceedToPayment}
                  disabled={selectedServices.length === 0 || !selectedDate || !selectedTime}
                  className="bg-gold border-2 border-gold text-black hover:bg-gold-light transition-all"
                >
                  Proceed to Payment
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BookingSection;
