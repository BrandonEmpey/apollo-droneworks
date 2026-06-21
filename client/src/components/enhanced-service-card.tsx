import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Edit, Trash2 } from "lucide-react";
import { useState, useEffect, Fragment } from "react";
import { DigitalTwinTerm } from "@/components/digital-twin-term";

function renderWithDigitalTwin(text: string) {
  const TERM = "Digital Twin";
  const parts = text.split(TERM);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && (i === 0 ? <DigitalTwinTerm /> : TERM)}
    </Fragment>
  ));
}

interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  pricingType: string;
  unitType?: string;
  pricingTiers?: Array<{
    name: string;
    minQuantity?: number;
    maxQuantity?: number;
    exactQuantity?: number;
    quantityType?: "range" | "exact";
    price: number;
    priceType: string;
    minPrice?: number;
    maxPrice?: number;
    quantityUnit?: string;
    description: string;
    deliverables?: Array<{
      name?: string;
      quantityType?: "range" | "exact";
      exactQuantity?: number;
      minQuantity?: number;
      maxQuantity?: number;
      quantityUnit?: string;
    }>;
  }>;
  isAvailableAsAddon: boolean;
  imageUrl?: string;
}

type DeliverableShape = {
  name?: string;
  quantityType?: "range" | "exact";
  exactQuantity?: number;
  minQuantity?: number;
  maxQuantity?: number;
  quantityUnit?: string;
};

export function formatDeliverable(d: DeliverableShape): string {
  const unit = d.quantityUnit || "items";
  const name = d.name?.trim();
  let qty = "";
  if (d.quantityType === "range") {
    if (d.minQuantity != null && d.maxQuantity != null && d.maxQuantity !== d.minQuantity) {
      qty = `${d.minQuantity}-${d.maxQuantity} ${unit}`;
    } else if (d.minQuantity != null && (d.maxQuantity == null || d.maxQuantity === d.minQuantity)) {
      qty = d.maxQuantity == null ? `${d.minQuantity}+ ${unit}` : `${d.minQuantity} ${unit}`;
    } else {
      qty = unit;
    }
  } else {
    if (d.exactQuantity != null) {
      qty = `${d.exactQuantity} ${unit}`;
    } else if (d.minQuantity != null) {
      qty = `${d.minQuantity} ${unit}`;
    } else {
      qty = unit;
    }
  }
  return name ? `${qty} (${name})` : qty;
}

export function formatLegacyTierQuantity(tier: {
  minQuantity?: number;
  maxQuantity?: number;
  exactQuantity?: number;
  quantityType?: "range" | "exact";
  quantityUnit?: string;
}): string {
  // Preserve the original enhanced-service-card legacy display semantics so untouched
  // tiers render exactly as before (no behavior change for legacy data).
  const unit = tier.quantityUnit || "items";
  if (tier.maxQuantity && tier.maxQuantity !== tier.minQuantity) {
    return `${tier.minQuantity}-${tier.maxQuantity} ${unit}`;
  }
  if (tier.minQuantity === 1 && !tier.maxQuantity) {
    return unit;
  }
  if (tier.maxQuantity) {
    return `${tier.minQuantity} ${unit}`;
  }
  return `${tier.minQuantity}+ ${unit}`;
}

interface ServiceAddon {
  id: number;
  serviceId: number;
  addonId: number;
  isEnabled: boolean;
}

interface Addon {
  id: number;
  name: string;
  description?: string;
}

interface EnhancedServiceCardProps {
  service: Service;
  addons: Addon[];
  serviceAddons: ServiceAddon[];
  onEdit: (service: Service) => void;
  onDelete: (id: number) => void;
}

export function EnhancedServiceCard({ 
  service, 
  addons, 
  serviceAddons, 
  onEdit, 
  onDelete 
}: EnhancedServiceCardProps) {
  const [enabledAddons, setEnabledAddons] = useState<Addon[]>([]);

  useEffect(() => {
    const enabled = serviceAddons
      .filter(sa => sa.serviceId === service.id && sa.isEnabled)
      .map(sa => addons.find(addon => addon.id === sa.addonId))
      .filter(Boolean) as Addon[];
    
    setEnabledAddons(enabled);
  }, [serviceAddons, addons, service.id]);

  // Format price helper - input must be in dollars (prices from DB are in cents, divide by 100 first)
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const renderPricingInfo = () => {
    if (service.pricingType === "tiered" && service.pricingTiers && service.pricingTiers.length > 0) {
      return (
        <div className="space-y-3">
          <div className="text-lg font-medium text-gold-gradient mb-3">Packages:</div>
          {service.pricingTiers.map((tier, index) => (
            <div 
              key={index} 
              className="p-4 rounded-lg border-2 transition-all cursor-pointer relative overflow-hidden bg-offwhite/5 hover:bg-offwhite/10 border-gold-gradient"
              style={{
                borderImage: 'linear-gradient(90deg, var(--gold-start), var(--gold-middle), var(--gold-end)) 1'
              }}
            >
              {/* Package Name - Centered */}
              <div className="text-center text-gold-gradient font-medium text-lg mb-2">
                {tier.name}
              </div>
              
              {/* Deliverables (or legacy single-line summary) and Price */}
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="text-sm text-gold-gradient flex-1">
                  {Array.isArray(tier.deliverables) ? (
                    tier.deliverables.length > 0 ? (
                      <ul className="space-y-0.5">
                        {tier.deliverables.map((d, i) => (
                          <li key={i}>{formatDeliverable(d)}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs opacity-70">Contact for details</span>
                    )
                  ) : (
                    formatLegacyTierQuantity(tier)
                  )}
                </div>
                <div className="text-gold-gradient font-montserrat font-semibold whitespace-nowrap">
                  {tier.priceType === "range" && tier.minPrice && tier.maxPrice 
                    ? `${formatPrice(tier.minPrice / 100)} - ${formatPrice(tier.maxPrice / 100)}`
                    : formatPrice((tier.price || 0) / 100)
                  }
                </div>
              </div>
              
              {/* Description - Centered */}
              {tier.description && (
                <div className="text-center text-xs text-gold-gradient mt-2">
                  {tier.description}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (service.pricingType === "per_unit" && service.unitType) {
      return (
        <div className="text-sm">
          <span className="font-medium text-gold-gradient">Per Unit: </span>
          <span className="text-gold-gradient">{formatPrice(service.price / 100)} per {service.unitType}</span>
        </div>
      );
    }

    return (
      <div className="text-2xl font-bold text-gold-gradient">
        From {formatPrice(service.price / 100)}
      </div>
    );
  };

  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{renderWithDigitalTwin(service.name)}</CardTitle>
          {service.isAvailableAsAddon && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              Addon Available
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {service.imageUrl && (
          <img 
            src={service.imageUrl} 
            alt={service.name}
            className="w-full h-32 object-cover rounded"
          />
        )}
        
        {service.description && (
          <p className="text-gray-600 text-sm line-clamp-3">
            {service.description}
          </p>
        )}
        
        {renderPricingInfo()}
        
        {enabledAddons.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-green-600">Active Add-ons:</div>
            <div className="flex flex-wrap gap-1">
              {enabledAddons.map((addon) => (
                <Badge 
                  key={addon.id} 
                  variant="default" 
                  className="bg-green-500 hover:bg-green-600 text-white text-xs"
                >
                  <Check className="w-3 h-3 mr-1" />
                  {addon.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(service)}
          className="flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(service.id)}
          className="flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}