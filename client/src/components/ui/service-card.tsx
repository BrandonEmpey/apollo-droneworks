import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Service } from "@shared/schema";
import droneIcon from "@assets/Icon_25_px_1767371102776.png";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  // Format price helper - input must be in dollars (prices from DB are in cents, divide by 100 first)
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getPricingDisplay = () => {
    switch (service.pricingType) {
      case "tiered":
        if (service.pricingTiers && service.pricingTiers.length > 0) {
          const firstTier = service.pricingTiers[0];
          if (firstTier.priceType === "range" && firstTier.minPrice && firstTier.maxPrice) {
            return `${formatPrice(firstTier.minPrice / 100)} - ${formatPrice(firstTier.maxPrice / 100)}`;
          }
          return `From ${formatPrice((firstTier.price || 0) / 100)}`;
        }
        break;
      
      case "per_unit":
        return `${formatPrice(service.price / 100)} per ${service.unitType || 'unit'}`;
      
      case "range_based":
        if (service.priceRanges && service.priceRanges.length > 0) {
          const firstRange = service.priceRanges[0];
          const lastRange = service.priceRanges[service.priceRanges.length - 1];
          const overallMax = lastRange.maxPrice ?? lastRange.minPrice;
          if (overallMax && overallMax !== firstRange.minPrice) {
            return `${formatPrice(firstRange.minPrice / 100)} – ${formatPrice(overallMax / 100)}`;
          }
          return `From ${formatPrice(firstRange.minPrice / 100)}`;
        }
        break;
      
      case "flat":
      default:
        return `From ${formatPrice(service.price / 100)}`;
    }
    
    // Fallback to base price if no specific pricing is configured
    return `From ${formatPrice(service.price / 100)}`;
  };

  // Helper to process image URLs 
  const getProcessedImageUrl = (url: string): string => {
    if (!url) {
      console.error('Empty service image URL');
      return '';
    }
    
    // Handle uploaded files first - these should always take priority
    if (url.startsWith('/uploads/')) {
      console.log('Service card using uploaded image:', url);
      return url;
    }
    
    // Handle base64 data
    if (url.startsWith('data:image/')) {
      console.log('Service card using base64 image data');
      return url;
    }
    
    // For external URLs like Unsplash, use them as fallbacks only
    if (url.includes('unsplash.com')) {
      console.log('Service card using Unsplash image:', url);
    }
    
    // If we've gotten here, output URL we're processing for debugging
    console.log('Processing URL:', url.substring(0, 20) + '...');
    
    return url;
  };

  // Use slug for URL if available, fallback to ID
  const serviceUrl = service.slug ? `/services/${service.slug}` : `/services/${service.id}`;
  
  return (
    <Card className={`interactive-card ${service.classification === "Overhead Reduction" ? "bg-[#132642]" : "bg-[#132641]"} rounded-lg overflow-hidden shadow-lg`}>
      <Link href={serviceUrl}>
        <div className="h-48 overflow-hidden cursor-pointer relative">
          <img
            src={getProcessedImageUrl(service.imageUrl)}
            alt={service.name}
            className="w-full h-full object-cover transition-transform hover:scale-110"
            onError={(e) => {
              console.error(`Failed to load image for service: ${service.name}`);
              // Set a fallback color instead of a broken image
              const target = e.target as HTMLImageElement;
              target.style.backgroundColor = '#080d17';
            }}
          />
          {service.featuredBadge && (
            <div className="absolute bottom-2 left-2">
              <Badge className="bg-amber-500/90 text-black text-xs font-semibold px-2 py-0.5 shadow-md backdrop-blur-sm">
                Serving Southern Utah
              </Badge>
            </div>
          )}
        </div>
      </Link>
      <CardContent className="p-6 flex flex-col min-h-[280px]">
        <div className="flex-1">
          <Link href={serviceUrl}>
            <h3 className="text-xl font-semibold font-montserrat text-gold-gradient mb-2 cursor-pointer hover:opacity-80">
              {service.name}
            </h3>
          </Link>
          <p className="text-offwhite/80 line-clamp-3">
            {service.description}
          </p>
        </div>
        
        <div className="flex justify-between items-center mt-auto pt-4">
          <span className="text-gold-gradient font-montserrat font-semibold">
            {getPricingDisplay()}
          </span>
          <Link href={`/booking?service=${service.id}`}>
            <Button variant="outline" className="border-gold hover:bg-gold hover:text-gold-gradient">
              Book Service
            </Button>
          </Link>
        </div>
        <div className="flex justify-center mt-4">
          <img src={droneIcon} alt="" className="h-5 w-5 opacity-70" />
        </div>
      </CardContent>
    </Card>
  );
}

export default ServiceCard;
