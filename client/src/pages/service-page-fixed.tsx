import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { serviceSchema, SITE_URL, OG_IMAGE, BUSINESS_NAME } from "@/lib/structured-data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Service, BeforeAfterImage } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Check, ArrowLeft, ArrowRight, Upload, FileUpIcon as FileUp, XIcon as X, Eye, Box as Cube, LogIn, Info, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDeliverable } from "@/components/enhanced-service-card";
import { DigitalTwinTerm } from "@/components/digital-twin-term";


// Service Media Carousel Component
function ServiceMediaCarousel({ service }: { service: Service }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Create media items array from the new images and videos arrays
  const mediaItems = useMemo(() => {
    const items = [];
    
    // Add all images from the images array
    if (service.images && service.images.length > 0) {
      service.images.forEach(imageUrl => {
        items.push({ type: 'image', url: imageUrl });
      });
    } else if (service.imageUrl) {
      // Fallback to single imageUrl for backward compatibility
      items.push({ type: 'image', url: service.imageUrl });
    }
    
    // Add all videos from the videos array
    if (service.videos && service.videos.length > 0) {
      service.videos.forEach(videoUrl => {
        items.push({ type: 'video', url: videoUrl });
      });
    } else if (service.videoUrl) {
      // Fallback to single videoUrl for backward compatibility
      items.push({ type: 'video', url: service.videoUrl });
    }
    
    return items;
  }, [service.images, service.videos, service.imageUrl, service.videoUrl]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % mediaItems.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  if (mediaItems.length === 0) return null;

  return (
    <div className="relative bg-black-light rounded-lg overflow-hidden border border-white/50">
      <div className="aspect-video w-full overflow-hidden">
        {mediaItems[currentSlide].type === 'video' ? (
          <video
            key={mediaItems[currentSlide].url}
            src={mediaItems[currentSlide].url}
            controls
            className="w-full h-full object-cover"
            poster={service.imageUrl}
            onError={(e) => {
              console.error(`Failed to load video for service: ${service.name}`);
            }}
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <img
            src={mediaItems[currentSlide].url}
            alt={service.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error(`Failed to load image for service: ${service.name}`);
              const target = e.target as HTMLImageElement;
              target.style.backgroundColor = '#080d17';
              target.style.display = 'none';
            }}
          />
        )}
      </div>

      {/* Carousel Controls - only show if multiple items */}
      {mediaItems.length > 1 && (
        <>
          <div className="absolute inset-x-0 top-1/2 flex justify-between px-4 sm:px-6 lg:px-8 transition-all duration-300">
            <button
              onClick={prevSlide}
              className="carousel-nav-button border-2 border-gold hover:border-gold-light transition-all"
              aria-label="Previous media"
            >
              <ChevronLeft size={24} className="text-gold drop-shadow-lg" />
            </button>
            <button
              onClick={nextSlide}
              className="carousel-nav-button border-2 border-gold hover:border-gold-light transition-all"
              aria-label="Next media"
            >
              <ChevronRight size={24} className="text-gold drop-shadow-lg" />
            </button>
          </div>

          {/* Carousel indicators/dots */}
          <div className="absolute bottom-6 inset-x-0 flex justify-center">
            <div className="carousel-dots-container flex gap-3">
              {mediaItems.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`carousel-page-marker border-2 border-gold transition-all ${
                    index === currentSlide
                      ? "bg-gold-gradient shadow-lg shadow-gold/50"
                      : "bg-transparent hover:bg-gold/20"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ServicePage() {
  // Use useParams to get route params directly from the parent Route component
  const params = useParams<{ id: string }>();
  const serviceIdOrSlug = params?.id || null; // Can be ID or slug
  
  console.log("ServicePage - Params:", params);
  console.log("ServicePage - Service ID/Slug:", serviceIdOrSlug);

  // Fetch service details - supports both ID and slug
  const {
    data: service,
    isLoading,
    error
  } = useQuery<Service>({
    queryKey: [`/api/services/${serviceIdOrSlug}`],
    enabled: !!serviceIdOrSlug,
    retry: (failureCount, error) => {
      console.error("Service query error:", error);
      return failureCount < 2;
    },
  });
  
  // Fetch related services
  const {
    data: services,
    isLoading: isLoadingServices,
  } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });
  
  // Fetch the admin-configurable bundle discount (public endpoint, no auth required)
  const { data: bundleConfig } = useQuery<{ bundleDiscountPercentage: number }>({
    queryKey: ["/api/public/bundle-discount"],
    staleTime: 5 * 60 * 1000,
  });
  const BUNDLE_DISC = bundleConfig?.bundleDiscountPercentage ?? 25;

  // Fetch service add-ons for the current service (use service.id once loaded)
  const {
    data: serviceAddons,
    isLoading: isLoadingAddons,
  } = useQuery<any[]>({
    queryKey: [`/api/services/${service?.id}/addons`],
    enabled: !!service?.id,
  });
  
  // Fetch before/after images
  const {
    data: beforeAfterImages,
    isLoading: isLoadingBeforeAfter,
  } = useQuery<BeforeAfterImage[]>({
    queryKey: ["/api/before-after"],
  });
  
  // Select which Before/After images to display based on service ID
  const displayBeforeAfterImages: any[] = beforeAfterImages?.filter(img => img.serviceId === service?.id) ?? [];

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State with immutable objects to ensure React detects changes
  const [selectedBundles, setSelectedBundles] = useState<number[]>([]);
  const [selectedPricingTier, setSelectedPricingTier] = useState<number | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<number[]>([]);
  const [selectedSubscription, setSelectedSubscription] = useState<'weekly' | 'biWeekly' | 'monthly' | null>(null);
  const [flightQuantity, setFlightQuantity] = useState<number>(1);

  // 3D Digital Twin: Indoor/Outdoor checkbox state
  const [dtIndoor, setDtIndoor] = useState<'under3k' | 'over3k' | null>(null);
  const [dtOutdoor, setDtOutdoor] = useState<'standard' | 'premium' | null>(null);

  // Foundation to Finish: start-phase state
  const [f2fStartPhase, setF2fStartPhase] = useState<number | null>(null); // 1=phase1, 2=phase2b, 3=phase3, 4=phase4

  // Construction Monitoring: style + tier
  const [cmStyle, setCmStyle] = useState<'progress' | 'timelapse' | null>(null);
  const [cmTier, setCmTier] = useState<'standard' | 'premium'>('standard');
  
  // Refs for pricing tiers and bundle areas to handle click outside
  const pricingTiersRef = useRef<HTMLDivElement>(null);
  const bundleAreaRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside pricing tiers to deselect (but not when clicking bundles)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsidePricingTiers = pricingTiersRef.current && !pricingTiersRef.current.contains(target);
      const isOutsideBundleArea = bundleAreaRef.current && !bundleAreaRef.current.contains(target);
      
      // Only deselect pricing tier if click is outside both pricing tiers and bundle area
      if (isOutsidePricingTiers && isOutsideBundleArea) {
        setSelectedPricingTier(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Aerial Mapping explicit savings in cents — component scope so it's accessible
  // both inside useMemo and in JSX bundle card rendering.
  // For Real Estate Listings (range_based), the savings apply to Aerial Mapping itself
  // (srcDiscount), keeping Real Estate at its full price range ($119–$329).
  const AERIAL_MAPPING_SAVINGS_CENTS: Record<string, number> = {
    "Real Estate Listings": 2000,
    "Property Tours": 5000,
    "Promotional Content": 5000,
    "Roof Inspections": 3000,
    "Property & Site Evaluation": 5000,
    "Infrastructure & Structure Inspections": 5000,
    "Construction Planning & Monitoring": 10000,
    "3D Modeling": 10000,
    "Timelapse Creation": 10000,
  };

  // Pricing calculations using array-based state
  const bundlePricing = useMemo(() => {
    if (!service || !services || selectedBundles.length === 0) {
      return { totalDiscount: 0, bundleServices: [], mainServiceDiscount: 0 };
    }

    let totalDiscount = 0;
    let mainServiceDiscount = 0;
    const bundleServices: any[] = [];

    selectedBundles.forEach(bundleServiceId => {
      const targetService = services.find(s => s.id === bundleServiceId);
      if (!targetService) return;

      // Config on current service pointing to target → discount applied to target
      const currentToTargetConfig = service.bundleConfigurations?.find(config => config.serviceId === bundleServiceId);
      // Config on target service pointing to current → discount applied to current service
      const targetToCurrentConfig = targetService.bundleConfigurations?.find(config => config.serviceId === service.id);

      let targetDiscount = 0;
      let srcDiscount = 0;

      if (currentToTargetConfig) {
        if (currentToTargetConfig.customPrice) {
          targetDiscount = targetService.price - currentToTargetConfig.customPrice;
        } else if (currentToTargetConfig.discountPercentage) {
          targetDiscount = Math.round(targetService.price * (currentToTargetConfig.discountPercentage / 100));
        }
      } else if (targetToCurrentConfig) {
        // e.g., Aerial Mapping (target) has config for current service → current service gets discount
        if (targetToCurrentConfig.customPrice) {
          srcDiscount = service.price - targetToCurrentConfig.customPrice;
        } else if (targetToCurrentConfig.discountPercentage) {
          srcDiscount = Math.round(service.price * (targetToCurrentConfig.discountPercentage / 100));
        }
      } else {
        // Fallback: explicit Aerial Mapping savings by service name
        if (targetService.name === "Aerial Mapping" && AERIAL_MAPPING_SAVINGS_CENTS[service.name]) {
          srcDiscount = AERIAL_MAPPING_SAVINGS_CENTS[service.name];
        } else if (service.name === "Aerial Mapping" && AERIAL_MAPPING_SAVINGS_CENTS[targetService.name]) {
          // For range-based partners (e.g., Real Estate Listings), discount Aerial Mapping itself
          // so the partner keeps its full price range ($119–$329) and bundle total = $349–$559
          if (targetService.pricingType === "range_based") {
            srcDiscount = AERIAL_MAPPING_SAVINGS_CENTS[targetService.name];
          } else {
            targetDiscount = AERIAL_MAPPING_SAVINGS_CENTS[targetService.name];
          }
        } else {
          targetDiscount = Math.round(targetService.price * 0.10);
        }
      }

      totalDiscount += targetDiscount + srcDiscount;
      mainServiceDiscount += srcDiscount;

      bundleServices.push({
        service: targetService,
        originalPrice: targetService.price,
        bundlePrice: targetService.price - targetDiscount,
        discount: targetDiscount,
        mainServiceDiscount: srcDiscount,
        config: currentToTargetConfig || targetToCurrentConfig || { discountPercentage: 10 },
      });
    });

    return { totalDiscount, bundleServices, mainServiceDiscount };
  }, [service, services, selectedBundles.length, selectedBundles.join(',')]);

  const totalPrice = useMemo(() => {
    // All DB prices are stored in cents; convert to dollars throughout for consistent display
    let basePrice = (service?.price || 0) / 100;
    
    // Handle different pricing types
    if (selectedPricingTier !== null && service) {
      if (service.priceRanges && service.priceRanges[selectedPricingTier]) {
        basePrice = service.priceRanges[selectedPricingTier].minPrice / 100;
      } else if (service.pricingTiers && service.pricingTiers[selectedPricingTier]) {
        const tier = service.pricingTiers[selectedPricingTier];
        const tierPriceCents = tier.price ? tier.price : (tier.minPrice ? tier.minPrice : service.price);
        basePrice = tierPriceCents / 100;
      }
    }
    
    // Apply subscription pricing if both tier and subscription are selected
    if (selectedSubscription && selectedPricingTier !== null && service) {
      // Get the subscription price per flight based on frequency (all values in cents)
      let pricePerFlightCents = 0;
      const currentTierPriceCents = selectedPricingTier !== null && service.pricingTiers && service.pricingTiers[selectedPricingTier] 
        ? (() => {
            const tier = service.pricingTiers[selectedPricingTier];
            return tier.price ? tier.price : (tier.minPrice ? tier.minPrice : service.price);
          })()
        : service.price;
      
      if (selectedSubscription === 'weekly') {
        pricePerFlightCents = (service as any).weeklyPriceType === "percentage" 
          ? Math.round(currentTierPriceCents * ((service as any).weeklyPercentage / 100))
          : ((service as any).weeklyPrice || 0);
      } else if (selectedSubscription === 'biWeekly') {
        pricePerFlightCents = (service as any).biWeeklyPriceType === "percentage" 
          ? Math.round(currentTierPriceCents * ((service as any).biWeeklyPercentage / 100))
          : ((service as any).biWeeklyPrice || 0);
      } else if (selectedSubscription === 'monthly') {
        pricePerFlightCents = (service as any).monthlyPriceType === "percentage" 
          ? Math.round(currentTierPriceCents * ((service as any).monthlyPercentage / 100))
          : ((service as any).monthlyPrice || 0);
      }
      
      basePrice = (pricePerFlightCents * flightQuantity) / 100;
    }
    
    // bundlePrice values are in cents (targetService.price - discount); convert to dollars
    const bundleServicesTotal = bundlePricing.bundleServices.reduce((sum, bundle) => sum + bundle.bundlePrice / 100, 0);
    // Discount applied to the current (page) service when Aerial Mapping is bundled
    const mainDiscount = (bundlePricing.mainServiceDiscount || 0) / 100;
    
    // Calculate add-ons total — all in dollars for consistency
    const addOnsTotal = selectedAddOns.reduce((total, addonId) => {
      const serviceAddon = serviceAddons?.find(sa => sa.addon.id === addonId);
      if (!serviceAddon) return total;
      
      const addon = serviceAddon.addon;
      // For percentage addons, use the current tier base price in dollars
      const currentTierPriceDollars = service?.pricingTiers && service.pricingTiers.length > 0 && selectedPricingTier !== null
        ? (() => {
            const tier = service.pricingTiers[selectedPricingTier];
            const priceCents = tier.price ? tier.price : (tier.minPrice ? tier.minPrice : service.price);
            return priceCents / 100;
          })()
        : (service?.price || 0) / 100;
      
      const addonPrice = addon.pricingType === 'percentage' 
        ? Math.round(currentTierPriceDollars * (addon.percentage / 100))
        : (addon.price / 100);
      
      return total + addonPrice;
    }, 0);
    
    return basePrice - mainDiscount + bundleServicesTotal + addOnsTotal;
  }, [service, bundlePricing, selectedPricingTier, selectedSubscription, flightQuantity, selectedAddOns, serviceAddons]);

  // Stable handlers to eliminate race conditions
  const handleBundleToggle = useCallback((serviceId: number) => {
    setSelectedBundles(prev => {
      const newState = prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId];
      return newState;
    });
  }, []);

  const handlePricingTierSelect = useCallback((index: number) => {
    setSelectedPricingTier(prev => prev === index ? null : index);
  }, []);

  const handleSubscriptionSelect = useCallback((type: 'weekly' | 'biWeekly' | 'monthly') => {
    setSelectedSubscription(prev => prev === type ? null : type);
  }, []);

  const handleAddonToggle = useCallback((addonId: number) => {
    setSelectedAddOns(prev => {
      const newState = prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId];
      return newState;
    });
  }, []);

  // Format price helper - displays whole dollars (prices stored in dollars)
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Get current selected tier price
  const getCurrentPrice = () => {
    if (!service) return 0;
    
    if (service.pricingTiers && service.pricingTiers.length > 0 && selectedPricingTier !== null) {
      const tier = service.pricingTiers[selectedPricingTier];
      return tier.price ? tier.price : (tier.minPrice ? tier.minPrice : service.price);
    }
    
    return service.price;
  };



  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Service page error:", error);
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gold mb-4">Service Error</h1>
            <p className="text-offwhite/70 mb-2">Error loading service: {error.message || 'Unknown error'}</p>
            <p className="text-offwhite/50 mb-6">Service: {serviceIdOrSlug}</p>
            <Link href="/services">
              <Button className="bg-gold hover:bg-gold/90 text-black">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Services
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!service && !isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gold mb-4">Service Not Found</h1>
            <p className="text-offwhite/70 mb-2">The service you're looking for doesn't exist or has been removed.</p>
            <p className="text-offwhite/50 mb-6">Service: {serviceIdOrSlug}</p>
            <Link href="/services">
              <Button className="bg-gold hover:bg-gold/90 text-black">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Services
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
      <Helmet>
        <title>{service.name} | Apollo DroneWorks — Southern Utah Drone Services</title>
        <meta name="description" content={service.description} />
        <link rel="canonical" href={`${SITE_URL}/services/${service.id}`} />
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={BUSINESS_NAME} />
        <meta property="og:title" content={`${service.name} | Apollo DroneWorks`} />
        <meta property="og:description" content={service.description} />
        <meta property="og:url" content={`${SITE_URL}/services/${service.id}`} />
        <meta property="og:image" content={(service as any).imageUrl || OG_IMAGE} />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${service.name} | Apollo DroneWorks`} />
        <meta name="twitter:description" content={service.description} />
        <meta name="twitter:image" content={(service as any).imageUrl || OG_IMAGE} />
        {/* Structured data */}
        <script type="application/ld+json">{JSON.stringify(serviceSchema({ id: service.id, name: service.name, description: service.description, price: (service as any).price, imageUrl: (service as any).imageUrl }))}</script>
      </Helmet>
      
      <div className="container mx-auto px-4 py-8 flex-1">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link href="/services">
            <Button variant="ghost" className="text-gold hover:text-gold/80 hover:bg-gold/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Services
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Service Header */}
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold text-gold-gradient">{service.name}</h1>
              {service.featuredBadge && (
                <div className="mt-3 flex justify-center">
                  <Badge
                    className="bg-amber-500/90 text-black text-xs font-semibold px-2 py-0.5 shadow-md backdrop-blur-sm"
                    data-testid="badge-southern-utah"
                  >
                    Serving Southern Utah
                  </Badge>
                </div>
              )}
            </div>

            {/* Service Media Carousel */}
            {(service.imageUrl || service.videoUrl) && (
              <div className="mb-8">
                <ServiceMediaCarousel service={service} />
              </div>
            )}

            {/* Service Description */}
            <div className="mb-8">
              <p className="text-lg text-offwhite/80 leading-relaxed">{service.description}</p>
            </div>

            {/* Service Disclaimer */}
            {service.disclaimer && service.disclaimer.trim().length > 0 && (
              <div
                className="mb-8 rounded border border-gold-dark/20 bg-[#080d17]/50 p-3"
                data-testid="service-disclaimer"
              >
                <div className="text-xs font-semibold text-gold mb-1">Disclaimer</div>
                <p className="text-xs text-offwhite/70 leading-relaxed whitespace-pre-line">
                  {service.disclaimer.trim()}
                </p>
              </div>
            )}

            {/* Service Features */}
            {(() => {
              const selectedTier = service.pricingTiers && service.pricingTiers.length > 0 && selectedPricingTier !== null
                ? service.pricingTiers[selectedPricingTier]
                : null;
              
              const baseFeatures = service.features || [];
              const packageFeatures = selectedTier?.features && selectedTier.features.length > 0 
                ? selectedTier.features.filter((f: string) => !baseFeatures.includes(f))
                : [];
              
              const packageName = selectedTier?.name 
                ? selectedTier.name.replace(/Bundle/gi, 'Package')
                : null;
              
              return (baseFeatures.length > 0 || packageFeatures.length > 0) && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gold-gradient mb-6">Service Features</h2>
                <div className="bg-black-light rounded-lg p-6 border border-white/50">
                  {/* Row 1: Base Service + Selected Package side by side */}
                  <div className={`grid gap-6 ${packageFeatures.length > 0 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                    {/* Base Service Features Column */}
                    <div>
                      <h3 className="text-lg font-semibold text-gold mb-4">{service.name}</h3>
                      <div className="space-y-3">
                        {baseFeatures.map((feature: string, index: number) => (
                          <div key={index} className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-[var(--gold-start)] via-[var(--gold-middle)] to-[var(--gold-end)] flex items-center justify-center">
                              <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-offwhite leading-relaxed flex-1">{feature.trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Selected Package Features Column */}
                    {packageFeatures.length > 0 && (
                      <div className="md:border-l md:border-gold/30 md:pl-6">
                        <h3 className="text-lg font-semibold text-gold mb-4">{packageName}</h3>
                        <div className="space-y-3">
                          {packageFeatures.map((feature: string, index: number) => (
                            <div key={`pkg-${index}`} className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-[var(--gold-start)] via-[var(--gold-middle)] to-[var(--gold-end)] flex items-center justify-center">
                                <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <span className="text-offwhite leading-relaxed flex-1">{feature.trim()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Row 2: Bundled Services - Silver gradient checkmarks */}
                  {selectedBundles.length > 0 && services && (
                    <div className="mt-6 pt-6 border-t border-gray-500/30">
                      <div className={`grid gap-6 grid-cols-1 ${selectedBundles.length > 1 ? 'md:grid-cols-2' : ''} ${selectedBundles.length > 2 ? 'lg:grid-cols-3' : ''}`}>
                        {selectedBundles.map((bundleId, bundleIndex) => {
                          const bundledService = services.find(s => s.id === bundleId);
                          if (!bundledService || !bundledService.features || bundledService.features.length === 0) return null;
                          
                          return (
                            <div key={bundleId} className={bundleIndex > 0 ? 'md:border-l md:border-gray-500/30 md:pl-6' : ''}>
                              <h3 className="text-lg font-semibold text-gray-300 mb-4">{bundledService.name}</h3>
                              <div className="space-y-3">
                                {bundledService.features.map((feature: string, index: number) => (
                                  <div key={index} className="flex items-center gap-3">
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-[#D1D5DB] via-[#9CA3AF] to-[#6B7280] flex items-center justify-center">
                                      <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <span className="text-offwhite leading-relaxed flex-1">{feature.trim()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
            })()}

            {/* Recommended Bundles - Moved from sidebar */}
            {services && service && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gold-gradient mb-6">Recommended Bundles</h2>
                <div className="bg-black-light rounded-lg p-6 border border-white/50">
                  <p className="text-gray-400 mb-4">Save more when you bundle services together:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(() => {
                      // Aerial Mapping explicit bundle savings (by service name)
                      const AERIAL_MAPPING_SAVINGS: Record<string, number> = {
                        "Real Estate Listings": 20,
                        "Property Tours": 50,
                        "Promotional Content": 50,
                        "Roof Inspections": 30,
                        "Property & Site Evaluation": 50,
                        "Infrastructure & Structure Inspections": 50,
                        "Construction Planning & Monitoring": 100,
                        "3D Modeling": 100,
                        "Timelapse Creation": 100,
                      };
                      const isAerialMapping = service.name === "Aerial Mapping";

                      const recommendations = services.filter(s => {
                        if (s.id === service.id) return false;
                        const currentServiceName = service.name.toLowerCase();
                        const otherServiceName = s.name.toLowerCase();

                        // Aerial Mapping pairs with all other services
                        if (isAerialMapping) return AERIAL_MAPPING_SAVINGS[s.name] !== undefined;
                        // Any other service pairs with Aerial Mapping
                        if (s.name === "Aerial Mapping") return AERIAL_MAPPING_SAVINGS[service.name] !== undefined;

                        if (currentServiceName.includes('visual') && 
                            (otherServiceName.includes('construction') || otherServiceName.includes('monitoring'))) {
                          return true;
                        }
                        if (currentServiceName.includes('construction') && 
                            (otherServiceName.includes('visual') || otherServiceName.includes('media'))) {
                          return true;
                        }
                        if (currentServiceName.includes('3d') && 
                            (otherServiceName.includes('photography') || otherServiceName.includes('real estate'))) {
                          return true;
                        }
                        return services.indexOf(s) < 3;
                      }).slice(0, 3);
                      
                      if (recommendations.length === 0) {
                        return (
                          <div className="col-span-full text-center py-4">
                            <span className="text-offwhite/60 text-sm">No recommendations available at this time.</span>
                          </div>
                        );
                      }
                      
                      return recommendations.map((recommendedService) => {
                        const isAlreadySelected = selectedBundles.includes(recommendedService.id);
                        // Use Aerial Mapping explicit savings when applicable
                        let savings: number;
                        let savingsLabel: string;
                        if (isAerialMapping && AERIAL_MAPPING_SAVINGS[recommendedService.name]) {
                          savings = AERIAL_MAPPING_SAVINGS[recommendedService.name];
                          // Range-based partners (e.g., Real Estate Listings) have multiple price
                          // tiers; show savings as a range ($20–$40) since actual savings depends
                          // on the tier selected at checkout.
                          savingsLabel = recommendedService.pricingType === "range_based"
                            ? `Save $${savings}–$${savings * 2} when bundled`
                            : `Save $${savings} when bundled`;
                        } else if (recommendedService.name === "Aerial Mapping" && AERIAL_MAPPING_SAVINGS[service.name]) {
                          savings = AERIAL_MAPPING_SAVINGS[service.name];
                          savingsLabel = service.pricingType === "range_based"
                            ? `Save $${savings}–$${savings * 2} when bundled`
                            : `Save $${savings} when bundled`;
                        } else {
                          const discountPercentage = 10;
                          const originalPrice = recommendedService.price / 100;
                          savings = Math.round(originalPrice * discountPercentage / 100);
                          savingsLabel = `${discountPercentage}% off when bundled`;
                        }
                        
                        return (
                          <div 
                            key={recommendedService.id} 
                            className={`
                              p-[1px] rounded-xl transition-all duration-300 relative overflow-hidden cursor-pointer
                              ${isAlreadySelected 
                                ? 'shadow-lg shadow-gold/30' 
                                : 'hover:shadow-md hover:shadow-gold/20'
                              }
                            `}
                            style={{
                              background: 'linear-gradient(90deg, var(--gold-start), var(--gold-middle), var(--gold-end))'
                            }}
                            onClick={() => handleBundleToggle(recommendedService.id)}
                          >
                            <div className={`p-4 rounded-[11px] w-full h-full transition-all duration-300 ${
                              isAlreadySelected ? 'bg-gold/20' : 'bg-[#080d17] hover:bg-offwhite/5'
                            }`}>
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={isAlreadySelected}
                                  onCheckedChange={() => handleBundleToggle(recommendedService.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className={`font-medium ${isAlreadySelected ? 'text-black' : 'text-offwhite'}`}>
                                    + {recommendedService.name}
                                  </div>
                                  <div className={`text-sm mt-1 ${isAlreadySelected ? 'text-black/70' : 'text-offwhite/60'}`}>
                                    {savingsLabel}
                                  </div>
                                  {(recommendedService.tooltipDescription || recommendedService.description) && (
                                    <div className={`text-xs mt-2 ${isAlreadySelected ? 'text-black/60' : 'text-offwhite/50'}`}>
                                      {recommendedService.tooltipDescription || recommendedService.description}
                                    </div>
                                  )}
                                  <div className={`mt-3 ${isAlreadySelected ? 'text-black' : 'text-gold'}`}>
                                    <span className="font-semibold">{formatPrice((recommendedService.price / 100) - savings)}</span>
                                    <span className="text-xs line-through opacity-60 ml-2">{formatPrice(recommendedService.price / 100)}</span>
                                    <div className="text-xs text-green-400 mt-1">Save {formatPrice(savings)}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* What's Included */}
            {service.whatsIncludedContent && service.whatsIncludedContent.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gold-gradient mb-6">What's Included</h2>
                <div className="bg-black-light rounded-lg p-6 border border-white/50">
                  <div className="space-y-4">
                    {service.whatsIncludedContent.map((item: string, index: number) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-[var(--gold-start)] via-[var(--gold-middle)] to-[var(--gold-end)] flex items-center justify-center">
                          <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-offwhite leading-relaxed flex-1">{item.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Possibilities */}
            {service.possibilities && service.possibilities.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gold-gradient mb-6">Possibilities</h2>
                <div className="bg-black-light rounded-lg p-6 border border-white/50">
                  <div className="space-y-4">
                    {service.possibilities.map((possibility: {title: string, description: string}, index: number) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-[var(--gold-start)] via-[var(--gold-middle)] to-[var(--gold-end)] flex items-center justify-center mt-0.5">
                          <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-offwhite leading-relaxed flex-1">
                          <span className="font-semibold text-gold-gradient">{possibility.title}:</span> {possibility.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Packages & Pricing Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-black-light rounded-lg p-6 border border-white/50 mb-6">
              <h3 className="text-xl font-semibold font-montserrat text-gold-gradient mb-4 text-center">
                Packages & Pricing
              </h3>
              <div className="space-y-4 mb-6" ref={pricingTiersRef}>

                {/* ── 3D Digital Twin: Indoor/Outdoor selector ───────────── */}
                {service.name === "3D Digital Twin" && (() => {
                  const tiers: any[] = service.pricingTiers ?? [];
                  const indoorUnder = tiers.find((t: any) => t.scope === "indoor");
                  const indoorOver  = tiers.find((t: any) => t.scope === "indoor_large");
                  const outdoorStd  = tiers.find((t: any) => t.scope === "outdoor_standard");
                  const outdoorPrem = tiers.find((t: any) => t.scope === "outdoor_premium");
                  const fmtRange = (t: any) => t ? `$${Math.round(t.minPrice/100).toLocaleString()}–$${Math.round(t.maxPrice/100).toLocaleString()}` : '';
                  const both = dtIndoor !== null && dtOutdoor !== null;
                  const indoorTier  = dtIndoor === 'under3k' ? indoorUnder : indoorOver;
                  const outdoorTier = dtOutdoor === 'standard' ? outdoorStd  : outdoorPrem;
                  const indoorMid  = indoorTier  ? (indoorTier.minPrice  + indoorTier.maxPrice)  / 2 : 0;
                  const outdoorMid = outdoorTier ? (outdoorTier.minPrice + outdoorTier.maxPrice) / 2 : 0;
                  const totalMid   = both ? Math.round((indoorMid + outdoorMid) * (1 - BUNDLE_DISC / 100)) : null;
                  return (
                    <div className="mb-4 rounded-lg border border-gold/20 bg-[#080d17]/60 p-4 space-y-4">
                      <p className="text-sm text-offwhite/80">Select what you'd like captured — pick Indoor, Outdoor, or both.</p>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-gold mb-2">Indoor — navigable 3D walkthrough</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[{ val: 'under3k' as const, label: 'Under 3,000 sq ft', tier: indoorUnder },
                              { val: 'over3k'  as const, label: '3,000–6,000 sq ft',  tier: indoorOver }].map(opt => (
                              <button key={opt.val}
                                onClick={() => setDtIndoor(dtIndoor === opt.val ? null : opt.val)}
                                className={`text-left p-3 rounded-md border transition-all text-xs ${dtIndoor === opt.val ? 'border-gold bg-gold/10 text-gold' : 'border-white/20 text-offwhite/70 hover:border-gold/40'}`}>
                                <span className="block font-medium">{opt.label}</span>
                                <span className="text-gold/80">{fmtRange(opt.tier)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gold mb-2">Outdoor — exterior Digital Twin of structure &amp; lot</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[{ val: 'standard' as const, label: 'Standard (single lot)', tier: outdoorStd },
                              { val: 'premium'  as const, label: 'Premium (larger/multi)', tier: outdoorPrem }].map(opt => (
                              <button key={opt.val}
                                onClick={() => setDtOutdoor(dtOutdoor === opt.val ? null : opt.val)}
                                className={`text-left p-3 rounded-md border transition-all text-xs ${dtOutdoor === opt.val ? 'border-gold bg-gold/10 text-gold' : 'border-white/20 text-offwhite/70 hover:border-gold/40'}`}>
                                <span className="block font-medium">{opt.label}</span>
                                <span className="text-gold/80">{fmtRange(opt.tier)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      {(dtIndoor || dtOutdoor) && (
                        <div className="pt-2 border-t border-gold/20 text-sm">
                          {both && (
                            <p className="text-emerald-400 text-xs mb-1">{BUNDLE_DISC}% bundle discount applied — both Indoor + Outdoor selected</p>
                          )}
                          <p className="text-gold font-semibold">
                            {totalMid
                              ? `Estimated total: ~$${Math.round(totalMid/100).toLocaleString()}`
                              : dtIndoor
                                ? `Indoor: ${fmtRange(indoorTier)}`
                                : `Outdoor: ${fmtRange(outdoorTier)}`
                            }
                          </p>
                          <p className="text-offwhite/50 text-xs mt-0.5">Price shown is midpoint estimate — final quote provided after booking</p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Foundation to Finish: entry-point selector ───────────── */}
                {service.name === "Foundation to Finish" && (() => {
                  const tiers: any[] = service.pricingTiers ?? [];
                  const DISC = BUNDLE_DISC;
                  const entryPoints = [
                    { phase: 1,  label: "From the beginning", desc: "Phase 1 through completion", phases: [1, '2b', 3, 4, 5, 6] },
                    { phase: '2b', label: "Pre-drywall stage",  desc: "Phase 2B through completion", phases: ['2b', 3, 4, 5, 6] },
                    { phase: 3,  label: "Near completion",    desc: "Phase 3 through completion",  phases: [3, 4, 5, 6] },
                    { phase: 4,  label: "Already done",       desc: "Digital Twin of finished property", phases: [4, 5, 6] },
                  ];
                  const sumPhases = (phases: (number | string)[]) => {
                    return phases.reduce((sum, p) => {
                      const t = tiers.find((t: any) => String(t.phase) === String(p));
                      return sum + (t?.price ?? 0);
                    }, 0);
                  };
                  return (
                    <div className="mb-4 rounded-lg border border-gold/20 bg-[#080d17]/60 p-4 space-y-3">
                      <p className="text-sm text-offwhite/80">Already under construction? We step in wherever you are.</p>
                      <div className="space-y-2">
                        {entryPoints.map((ep, i) => {
                          const subtotal = sumPhases(ep.phases);
                          const discounted = Math.round(subtotal * (1 - DISC / 100));
                          const isSelected = f2fStartPhase === i;
                          return (
                            <button key={i} onClick={() => setF2fStartPhase(isSelected ? null : i)}
                              className={`w-full text-left p-3 rounded-md border transition-all ${isSelected ? 'border-gold bg-gold/10' : 'border-white/20 hover:border-gold/40'}`}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className={`text-sm font-semibold ${isSelected ? 'text-gold' : 'text-offwhite'}`}>{ep.label}</span>
                                  <p className="text-xs text-offwhite/60 mt-0.5">{ep.desc}</p>
                                </div>
                                <div className="text-right shrink-0 ml-3">
                                  <p className="text-sm font-bold text-gold">${Math.round(discounted/100).toLocaleString()}</p>
                                  <p className="text-xs text-offwhite/40 line-through">${Math.round(subtotal/100).toLocaleString()}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-emerald-400">{BUNDLE_DISC}% bundle discount applied to all phases. Prices shown are Standard tier.</p>
                    </div>
                  );
                })()}

                {/* ── Construction Monitoring / Timelapse: style + tier ─────── */}
                {service.name === "Construction Monitoring / Timelapse" && (() => {
                  const tiers: any[] = service.pricingTiers ?? [];
                  const selected = tiers.find((t: any) => t.style === (cmStyle ?? 'progress') && t.tier === cmTier);
                  return (
                    <div className="mb-4 rounded-lg border border-gold/20 bg-[#080d17]/60 p-4 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gold mb-2">Choose your style</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[{ val: 'progress' as const, label: 'Progress Documentation', desc: 'Timestamped site record per visit' },
                            { val: 'timelapse' as const, label: 'Cinematic Timelapse', desc: 'Polished marketing video (min 8 visits)' }].map(opt => (
                            <button key={opt.val} onClick={() => setCmStyle(opt.val)}
                              className={`text-left p-3 rounded-md border transition-all text-xs ${cmStyle === opt.val ? 'border-gold bg-gold/10 text-gold' : 'border-white/20 text-offwhite/70 hover:border-gold/40'}`}>
                              <span className="block font-medium">{opt.label}</span>
                              <span className="text-offwhite/50">{opt.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gold mb-2">Choose your tier</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(['standard', 'premium'] as const).map(t => (
                            <button key={t} onClick={() => setCmTier(t)}
                              className={`p-3 rounded-md border capitalize text-xs transition-all ${cmTier === t ? 'border-gold bg-gold/10 text-gold' : 'border-white/20 text-offwhite/70 hover:border-gold/40'}`}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      {cmStyle && selected && (
                        <div className="pt-2 border-t border-gold/20">
                          <p className="text-gold font-semibold text-sm">${Math.round(selected.price/100).toLocaleString()} per visit</p>
                          {selected.minRecommendedVisits && (
                            <p className="text-xs text-offwhite/50 mt-0.5">Min {selected.minRecommendedVisits} visits recommended for best result</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Property Tours: composite price display ───────────────── */}
                {service.pricingType === "composite" && (
                  <div className="mb-4 rounded-lg border border-gold/20 bg-[#080d17]/60 p-4 text-sm text-offwhite/80">
                    <p className="font-semibold text-gold mb-1">How pricing works</p>
                    <p>Property Tours combines an Indoor <DigitalTwinTerm /> (indoor walkthrough) with your choice of Aerial Cinematic Video or an Outdoor <DigitalTwinTerm />. The total is the sum of the component services you choose — no separate Property Tours price.</p>
                    <p className="mt-2 text-offwhite/60 text-xs">Book the component services individually: start with Real Estate Listings for the aerial video, then add a 3D Digital Twin for the indoor or outdoor twin.</p>
                  </div>
                )}

                {/* Pricing Tiers as Cards */}
                {service.pricingType !== "composite" && service.pricingTiers && service.pricingTiers.length > 0 ? (
                  <div className="space-y-4">
                    {service.pricingTiers.map((tier: any, index: number) => {
                      const isPopular = tier.isPopular;
                      const isSelected = selectedPricingTier === index;
                      
                      return (
                        <div
                          key={tier.id || index}
                          className={`
                            relative overflow-visible rounded-lg cursor-pointer transition-all
                            ${isSelected 
                              ? 'p-[2px] shadow-lg shadow-gold/30' 
                              : 'p-[1px] hover:shadow-md hover:shadow-gold/20'
                            }
                          `}
                          style={{
                            background: isSelected 
                              ? 'linear-gradient(90deg, var(--gold-start), var(--gold-middle), var(--gold-end))'
                              : 'linear-gradient(90deg, rgba(199,174,106,0.3), rgba(226,214,139,0.3), rgba(138,106,47,0.3))'
                          }}
                          data-testid={`package-card-${tier.id || index}`}
                          onClick={() => handlePricingTierSelect(index)}
                        >
                          <Card className="package-card relative overflow-visible rounded-[6px] bg-[#080d17] border-0">
                            {isPopular && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                                <span className="popular-badge inline-flex items-center whitespace-nowrap text-xs px-2 py-0.5">
                                  <Star className="w-2.5 h-2.5 mr-1 fill-current" />
                                  Popular
                                </span>
                              </div>
                            )}
                            
                            <CardHeader className="pb-1 pt-4 px-4">
                              <CardTitle className="text-base font-montserrat text-gold-gradient text-center">
                                {tier.name.replace(/Bundle/gi, 'Package')}
                              </CardTitle>
                            </CardHeader>
                            
                            <CardContent className="pt-2 pb-4 px-4">
                              <div className="mb-3 text-center">
                              {tier.priceType === 'quote' ? (
                                <p className="text-lg font-bold text-gold-gradient">Contact for Quote</p>
                              ) : tier.maxPrice ? (
                                <p className="text-lg font-bold text-gold-gradient">
                                  ${Math.round(tier.minPrice / 100).toLocaleString()} - ${Math.round(tier.maxPrice / 100).toLocaleString()}
                                </p>
                              ) : tier.price ? (
                                <p className="text-xl font-bold">
                                  <span className="text-gold-gradient">${Math.round(tier.price / 100).toLocaleString()}</span>
                                </p>
                              ) : (
                                <p className="text-xl font-bold">
                                  <span className="text-gold-gradient">${Math.round(tier.minPrice / 100).toLocaleString()}</span>
                                </p>
                              )}
                              {tier.description && (
                                <p className="text-gray-400 text-xs mt-1">{tier.description}</p>
                              )}
                            </div>

                            {(() => {
                              const hasExplicitDeliverables = Array.isArray(tier.deliverables);
                              let deliverables: any[] | null = null;
                              if (hasExplicitDeliverables) {
                                deliverables = tier.deliverables;
                              } else if (tier.exactQuantity != null || tier.minQuantity != null || tier.maxQuantity != null) {
                                deliverables = [{
                                  quantityType: tier.quantityType || "range",
                                  exactQuantity: tier.exactQuantity,
                                  minQuantity: tier.minQuantity,
                                  maxQuantity: tier.maxQuantity,
                                  quantityUnit: tier.quantityUnit,
                                }];
                              }
                              if (!deliverables) return null;
                              if (deliverables.length === 0) {
                                return (
                                  <div className="mb-3" data-testid={`tier-deliverables-${tier.id || index}`}>
                                    <p className="text-xs text-gray-400 italic">Contact for details</p>
                                  </div>
                                );
                              }
                              return (
                                <div className="mb-3" data-testid={`tier-deliverables-${tier.id || index}`}>
                                  <p className="text-xs text-gold-gradient font-medium mb-1">Includes:</p>
                                  <ul className="space-y-0.5">
                                    {deliverables.map((d, i) => (
                                      <li key={i} className="text-xs text-gray-300">
                                        · {formatDeliverable(d)}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })()}

                            {tier.features && tier.features.length > 0 && (
                              <ul className="space-y-1.5 mb-3">
                                {tier.features.slice(0, 4).map((feature: string, i: number) => (
                                  <li key={i} className="flex items-start gap-1.5 text-xs">
                                    <svg className="w-3 h-3 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="url(#goldGradientTierSidebar)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <defs>
                                        <linearGradient id="goldGradientTierSidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                                          <stop offset="0%" stopColor="#C7AE6A" />
                                          <stop offset="50%" stopColor="#E2D68B" />
                                          <stop offset="100%" stopColor="#8A6A2F" />
                                        </linearGradient>
                                      </defs>
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span className="text-gray-300">{feature}</span>
                                  </li>
                                ))}
                                {tier.features.length > 4 && (
                                  <li className="text-xs text-gray-400 text-center">
                                    +{tier.features.length - 4} more features
                                  </li>
                                )}
                              </ul>
                            )}

                            <Link 
                              href={`/contact?package=${encodeURIComponent(tier.name)}&price=${encodeURIComponent(tier.priceType === 'quote' ? 'Contact for Quote' : tier.maxPrice ? `$${Math.round(tier.minPrice / 100).toLocaleString()} - $${Math.round(tier.maxPrice / 100).toLocaleString()}` : tier.price ? `$${Math.round(tier.price / 100).toLocaleString()}` : `$${Math.round(tier.minPrice / 100).toLocaleString()}`)}&service=${encodeURIComponent(service.name)}`} 
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button 
                                className="w-full bg-transparent border border-gold text-gold hover:bg-gold hover:text-black transition-all text-sm py-2"
                                data-testid={`button-select-package-${tier.id || index}`}
                              >
                                Get Started
                              </Button>
                              </Link>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                    <p className="text-center text-gray-400 text-xs">
                      Custom packages available — <Link href="/contact" className="text-gold hover:underline">contact for quote</Link>
                    </p>
                  </div>
                ) : (
                  <div className="flex justify-between items-center border-b border-offwhite/10 pb-2">
                    <span className="text-offwhite/70">
                      {service.isSubscription ? "One-time Price" : "Starting Price"}
                    </span>
                    <span className="text-gold-gradient font-montserrat font-semibold text-xl">
                      {formatPrice(service.price / 100)}
                    </span>
                  </div>
                )}

                {/* Subscription Pricing Options */}
                {service && service.isSubscription && (
                  <div className="mt-4 pt-4 border-t border-offwhite/10">
                    <h4 className="text-lg font-medium text-gold-gradient mb-3">Subscription Options:</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {(service as any).weeklySubscriptionEnabled && (
                        <div 
                          className={`
                            p-[1px] rounded-xl transition-all duration-300 cursor-pointer relative overflow-hidden
                            ${selectedSubscription === 'weekly' 
                              ? 'shadow-lg shadow-gold/30' 
                              : 'hover:shadow-md hover:shadow-gold/20'
                            }
                          `}
                          style={{
                            background: 'linear-gradient(90deg, var(--gold-start), var(--gold-middle), var(--gold-end))'
                          }}
                          onClick={() => handleSubscriptionSelect('weekly')}
                        >
                          <div className={`p-4 rounded-[11px] transition-all duration-300 ${
                            selectedSubscription === 'weekly' 
                              ? 'bg-gold text-black' 
                              : 'bg-[#080d17] text-offwhite hover:bg-offwhite/5'
                          }`}>
                            <div className="flex justify-between items-center">
                              <span className={`font-medium ${
                                selectedSubscription === 'weekly' ? 'text-black' : 'text-offwhite/70'
                              }`}>
                                Weekly
                              </span>
                              <span className={`font-montserrat font-semibold ${
                                selectedSubscription === 'weekly' ? 'text-black' : 'text-gold-gradient'
                              }`}>
                                {(() => {
                                  const currentPrice = service.pricingTiers && service.pricingTiers.length > 0 && selectedPricingTier !== null
                                    ? (() => {
                                        const tier = service.pricingTiers[selectedPricingTier];
                                        return tier.price ? tier.price / 100 : (tier.minPrice ? tier.minPrice / 100 : service.price / 100);
                                      })()
                                    : service.price / 100;
                                  
                                  return (service as any).weeklyPriceType === "percentage" 
                                    ? formatPrice(Math.round(currentPrice * ((service as any).weeklyPercentage / 100)))
                                    : formatPrice(((service as any).weeklyPrice || 0) / 100);
                                })()} / Flight
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {(service as any).biWeeklySubscriptionEnabled && (
                        <div 
                          className={`
                            p-[1px] rounded-xl transition-all duration-300 cursor-pointer relative overflow-hidden
                            ${selectedSubscription === 'biWeekly' 
                              ? 'shadow-lg shadow-gold/30' 
                              : 'hover:shadow-md hover:shadow-gold/20'
                            }
                          `}
                          style={{
                            background: 'linear-gradient(90deg, var(--gold-start), var(--gold-middle), var(--gold-end))'
                          }}
                          onClick={() => handleSubscriptionSelect('biWeekly')}
                        >
                          <div className={`p-4 rounded-[11px] transition-all duration-300 ${
                            selectedSubscription === 'biWeekly' 
                              ? 'bg-gold text-black' 
                              : 'bg-[#080d17] text-offwhite hover:bg-offwhite/5'
                          }`}>
                            <div className="flex justify-between items-center">
                              <span className={`font-medium ${
                                selectedSubscription === 'biWeekly' ? 'text-black' : 'text-offwhite/70'
                              }`}>
                                Bi-Weekly
                              </span>
                              <span className={`font-montserrat font-semibold ${
                                selectedSubscription === 'biWeekly' ? 'text-black' : 'text-gold-gradient'
                              }`}>
                                {(() => {
                                  const currentPrice = service.pricingTiers && service.pricingTiers.length > 0 && selectedPricingTier !== null
                                    ? (() => {
                                        const tier = service.pricingTiers[selectedPricingTier];
                                        return tier.price ? tier.price / 100 : (tier.minPrice ? tier.minPrice / 100 : service.price / 100);
                                      })()
                                    : service.price / 100;
                                  
                                  return (service as any).biWeeklyPriceType === "percentage" 
                                    ? formatPrice(Math.round(currentPrice * ((service as any).biWeeklyPercentage / 100)))
                                    : formatPrice(((service as any).biWeeklyPrice || 0) / 100);
                                })()} / Flight
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {(service as any).monthlySubscriptionEnabled && (
                        <div 
                          className={`
                            p-[1px] rounded-xl transition-all duration-300 cursor-pointer relative overflow-hidden
                            ${selectedSubscription === 'monthly' 
                              ? 'shadow-lg shadow-gold/30' 
                              : 'hover:shadow-md hover:shadow-gold/20'
                            }
                          `}
                          style={{
                            background: 'linear-gradient(90deg, var(--gold-start), var(--gold-middle), var(--gold-end))'
                          }}
                          onClick={() => handleSubscriptionSelect('monthly')}
                        >
                          <div className={`p-4 rounded-[11px] transition-all duration-300 ${
                            selectedSubscription === 'monthly' 
                              ? 'bg-gold text-black' 
                              : 'bg-[#080d17] text-offwhite hover:bg-offwhite/5'
                          }`}>
                            <div className="flex justify-between items-center">
                              <span className={`font-medium ${
                                selectedSubscription === 'monthly' ? 'text-black' : 'text-offwhite/70'
                              }`}>
                                Monthly
                              </span>
                              <span className={`font-montserrat font-semibold ${
                                selectedSubscription === 'monthly' ? 'text-black' : 'text-gold-gradient'
                              }`}>
                                {(() => {
                                  const currentPrice = service.pricingTiers && service.pricingTiers.length > 0 && selectedPricingTier !== null
                                    ? (() => {
                                        const tier = service.pricingTiers[selectedPricingTier];
                                        return tier.price ? tier.price / 100 : (tier.minPrice ? tier.minPrice / 100 : service.price / 100);
                                      })()
                                    : service.price / 100;
                                  
                                  return (service as any).monthlyPriceType === "percentage" 
                                    ? formatPrice(Math.round(currentPrice * ((service as any).monthlyPercentage / 100)))
                                    : formatPrice(((service as any).monthlyPrice || 0) / 100);
                                })()} / Flight
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Flight Quantity Selector - Only show when both tier and subscription are selected */}
                    {selectedPricingTier !== null && selectedSubscription && (
                      <div className="mt-4 p-4 bg-offwhite/5 rounded-lg border border-gold/20">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium text-gold-gradient">
                            Flights:
                          </label>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setFlightQuantity(prev => Math.max(1, prev - 1))}
                              className="w-8 h-8 flex items-center justify-center rounded-md bg-gold/20 hover:bg-gold/30 text-white font-bold transition-colors"
                            >
                              -
                            </button>
                            <div className="relative w-20 h-10">
                              <div className="absolute inset-0 rounded-md p-[2px]" style={{
                                background: 'linear-gradient(90deg, var(--gold-start), var(--gold-middle), var(--gold-end))'
                              }}>
                                <div className="w-full h-full rounded-md bg-[#080d17]"></div>
                              </div>
                              <input
                                type="number"
                                value={flightQuantity}
                                onChange={(e) => setFlightQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className="absolute inset-[2px] rounded-md text-center bg-[#080d17] text-white font-medium focus:outline-none px-2 py-1"
                                min="1"
                                style={{ color: 'white' }}
                              />
                            </div>
                            <button
                              onClick={() => setFlightQuantity(prev => prev + 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-md bg-gold/20 hover:bg-gold/30 text-white font-bold transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-offwhite/60">
                          Total flights for your {selectedSubscription} subscription
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* Bundle Packages Section - Inside Service Details */}
                {service.bundleConfigurations && service.bundleConfigurations.length > 0 && services && (
                  <div ref={bundleAreaRef} className="mt-6 pt-4 border-t border-offwhite/10">
                    <h4 className="text-lg font-medium text-gold-gradient mb-3">Bundle Add-ons:</h4>
                    <div className="space-y-3">
                      {service.bundleConfigurations.map((config, index) => {
                        const targetService = services.find(s => s.id === config.serviceId);
                        if (!targetService) return null;
                        
                        const isSelected = selectedBundles.includes(config.serviceId);
                        
                        return (
                          <div 
                            key={index} 
                            className={`
                              p-[1px] rounded-xl transition-all duration-300 relative overflow-hidden
                              ${isSelected 
                                ? '' 
                                : 'hover:shadow-md hover:shadow-gold/20'
                              }
                            `}
                            style={{
                              background: 'linear-gradient(90deg, var(--gold-start), var(--gold-middle), var(--gold-end))'
                            }}
                          >
                            <div className={`p-3 rounded-[11px] w-full transition-all duration-300 ${
                              isSelected ? 'bg-gold/20' : 'bg-[#080d17] hover:bg-offwhite/5'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => handleBundleToggle(config.serviceId)}
                                  />
                                  <div className="flex-1">
                                    <div className={`font-medium text-sm ${isSelected ? 'text-black' : 'text-offwhite'}`}>
                                      + {targetService.name}
                                    </div>
                                    <div className={`text-xs ${isSelected ? 'text-black/70' : 'text-offwhite/60'}`}>
                                      {targetService.pricingType === "range_based" && targetService.priceRanges?.length
                                        ? `Save $${Math.round((AERIAL_MAPPING_SAVINGS_CENTS[targetService.name] ?? 2000) / 100)} on ${service.name} when bundled`
                                        : config.customPrice 
                                          ? `Bundle price: ${formatPrice(config.customPrice / 100)}`
                                          : config.discountPercentage 
                                            ? `${config.discountPercentage}% off when bundled`
                                            : 'Bundle discount applied'
                                      }
                                    </div>
                                  </div>
                                </div>
                                <div className={`text-right ${isSelected ? 'text-black' : 'text-gold'}`}>
                                  <div className="font-semibold text-sm">
                                    {targetService.pricingType === "range_based" && targetService.priceRanges?.length
                                      ? `${formatPrice(targetService.priceRanges[0].minPrice / 100)}–${formatPrice(targetService.priceRanges[0].maxPrice / 100)}`
                                      : config.customPrice 
                                        ? formatPrice(config.customPrice / 100)
                                        : config.discountPercentage
                                          ? formatPrice(targetService.price * (1 - config.discountPercentage / 100) / 100)
                                          : formatPrice(targetService.price / 100)
                                    }
                                  </div>
                                  {config.discountPercentage && targetService.pricingType !== "range_based" && (
                                    <div className="text-xs line-through opacity-60">
                                      {formatPrice(targetService.price / 100)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add-ons Section */}
                {serviceAddons && serviceAddons.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-offwhite/10">
                    <h4 className="text-lg font-medium text-gold-gradient mb-3">Available Add-ons:</h4>
                    <div className="space-y-3">
                      {serviceAddons.map((serviceAddon) => {
                        const addon = serviceAddon.addon;
                        const isSelected = selectedAddOns.includes(addon.id);
                        
                        // Calculate the actual add-on price based on the selected tier
                        // tier.price and service.price are stored in cents; divide by 100 for dollars
                        const currentTierPrice = service.pricingTiers && service.pricingTiers.length > 0 && selectedPricingTier !== null
                          ? (() => {
                              const tier = service.pricingTiers[selectedPricingTier];
                              return tier.price ? tier.price : (tier.minPrice ? tier.minPrice : service.price);
                            })()
                          : service.price;
                        
                        const addonPrice = addon.pricingType === 'percentage' 
                          ? Math.round((currentTierPrice / 100) * (addon.percentage / 100))
                          : (addon.price / 100);
                        
                        return (
                          <div 
                            key={addon.id} 
                            className={`
                              p-[1px] rounded-xl transition-all duration-300 relative overflow-hidden cursor-pointer
                              ${isSelected 
                                ? 'shadow-lg shadow-gold/30' 
                                : 'hover:shadow-md hover:shadow-gold/20'
                              }
                            `}
                            style={{
                              background: 'linear-gradient(90deg, var(--gold-start), var(--gold-middle), var(--gold-end))'
                            }}
                            onClick={() => handleAddonToggle(addon.id)}
                          >
                            <div className={`p-3 rounded-[11px] w-full transition-all duration-300 ${
                              isSelected ? 'bg-gold/20' : 'bg-[#080d17] hover:bg-offwhite/5'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => handleAddonToggle(addon.id)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="flex-1">
                                    <div className={`font-medium text-sm ${isSelected ? 'text-black' : 'text-offwhite'}`}>
                                      {addon.name}
                                    </div>
                                    {addon.description && (
                                      <div className={`text-xs ${isSelected ? 'text-black/70' : 'text-offwhite/60'}`}>
                                        {addon.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className={`text-right ${isSelected ? 'text-black' : 'text-gold'}`}>
                                  <div className="font-semibold text-sm">
                                    +{formatPrice(addonPrice)}
                                  </div>
                                  {addon.pricingType === 'percentage' && (
                                    <div className="text-xs opacity-60">
                                      {addon.percentage}% of tier
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* Total Price Display */}
              {(selectedBundles.length > 0 || selectedPricingTier !== null || totalPrice !== (service?.price || 0)) && (
                <div className="border-t border-offwhite/10 pt-4">
                  {/* Subscription pricing breakdown */}
                  {selectedPricingTier !== null && selectedSubscription && (
                    <div className="mb-3 p-3 bg-offwhite/5 rounded-lg">
                      <div className="text-sm text-offwhite/70 mb-2">Subscription Pricing:</div>
                      <div className="flex justify-between items-center text-sm">
                        <span>Price per flight:</span>
                        <span className="text-gold-gradient">
                          {(() => {
                            if (!selectedSubscription || selectedPricingTier === null || !service) return formatPrice(0);
                            
                            const currentTierPrice = service.pricingTiers && service.pricingTiers[selectedPricingTier] 
                              ? (() => {
                                  const tier = service.pricingTiers[selectedPricingTier];
                                  return tier.price ? tier.price / 100 : (tier.minPrice ? tier.minPrice / 100 : service.price / 100);
                                })()
                              : service.price / 100;
                            
                            let pricePerFlight = 0;
                            if (selectedSubscription === 'weekly') {
                              pricePerFlight = (service as any).weeklyPriceType === "percentage" 
                                ? Math.round(currentTierPrice * ((service as any).weeklyPercentage / 100))
                                : ((service as any).weeklyPrice || 0) / 100;
                            } else if (selectedSubscription === 'biWeekly') {
                              pricePerFlight = (service as any).biWeeklyPriceType === "percentage" 
                                ? Math.round(currentTierPrice * ((service as any).biWeeklyPercentage / 100))
                                : ((service as any).biWeeklyPrice || 0) / 100;
                            } else if (selectedSubscription === 'monthly') {
                              pricePerFlight = (service as any).monthlyPriceType === "percentage" 
                                ? Math.round(currentTierPrice * ((service as any).monthlyPercentage / 100))
                                : ((service as any).monthlyPrice || 0) / 100;
                            }
                            
                            return formatPrice(pricePerFlight);
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>Number of flights:</span>
                        <span className="text-gold-gradient">{flightQuantity}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>Frequency:</span>
                        <span className="text-gold-gradient capitalize">{selectedSubscription}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>Estimated End Date:</span>
                        <span className="text-gold-gradient">
                          {(() => {
                            if (!selectedSubscription || !flightQuantity) return 'N/A';
                            
                            const currentDate = new Date();
                            let daysPerFlight = 0;
                            
                            if (selectedSubscription === 'weekly') {
                              daysPerFlight = 7;
                            } else if (selectedSubscription === 'biWeekly') {
                              daysPerFlight = 14;
                            } else if (selectedSubscription === 'monthly') {
                              daysPerFlight = 30;
                            }
                            
                            // First flight within 5 days, then calculate remaining flights
                            const firstFlightDays = 5;
                            const totalDays = firstFlightDays + (flightQuantity - 1) * daysPerFlight;
                            
                            // Calculate range (±3 days for estimation)
                            const earliestEnd = new Date(currentDate.getTime() + (totalDays - 3) * 24 * 60 * 60 * 1000);
                            const latestEnd = new Date(currentDate.getTime() + (totalDays + 3) * 24 * 60 * 60 * 1000);
                            
                            const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric'
                            });
                            
                            return `${formatDate(earliestEnd)} - ${formatDate(latestEnd)}`;
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gold-gradient">Total:</span>
                    <span className="text-xl font-bold text-gold-gradient">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                  {bundlePricing.totalDiscount > 0 && (
                    <div className="text-center mt-2">
                      <span className="text-green-400 text-sm font-medium">
                        You save {formatPrice(bundlePricing.totalDiscount / 100)} with bundles!
                      </span>
                    </div>
                  )}
                  {selectedBundles.length > 0 && (
                    <div className="text-center mt-1">
                      <span className="text-offwhite/70 text-xs">
                        Bundle packages: {selectedBundles.length} selected
                      </span>
                    </div>
                  )}
                  {selectedAddOns.length > 0 && (
                    <div className="text-center mt-1">
                      <span className="text-offwhite/70 text-xs">
                        Add-ons: {selectedAddOns.length} selected
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Button 
                className="w-full bg-gold hover:bg-gold/90 text-black font-medium mt-6"
                onClick={() => {
                  if (!user) {
                    toast({
                      title: "Login Required",
                      description: "Please log in to book a service.",
                      variant: "destructive",
                    });
                    return;
                  }

                  // Collect booking details
                  const bookingDetails = {
                    serviceId: service?.id,
                    serviceName: service?.name,
                    selectedTier: selectedPricingTier !== null && service?.pricingTiers ? service.pricingTiers[selectedPricingTier] : null,
                    selectedSubscription: selectedSubscription,
                    flightQuantity: flightQuantity,
                    selectedBundles: selectedBundles,
                    selectedAddOns: selectedAddOns,
                    totalPrice: totalPrice,
                  };

                  console.log('Booking details:', bookingDetails);
                  
                  toast({
                    title: "Booking Initiated",
                    description: `Starting booking process for ${service?.name}. You will be redirected to the booking form.`,
                  });

                  // Navigate to booking page with service details including the calculated dollar total
                  setTimeout(() => {
                    window.location.href = `/booking?service=${service?.id}&tier=${selectedPricingTier}&subscription=${selectedSubscription}&totalPrice=${totalPrice}`;
                  }, 1000);
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Book Service
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}