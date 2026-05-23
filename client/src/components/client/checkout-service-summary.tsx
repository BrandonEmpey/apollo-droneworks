import { Badge } from "@/components/ui/badge";
import type { Service } from "@shared/schema";

export function CheckoutServiceSummary({
  primaryService,
  selectedServices,
  totalAmount,
  projectName,
}: {
  primaryService: Service | undefined;
  selectedServices: Service[];
  totalAmount: string;
  projectName?: string | null;
}) {
  return (
    <div className="space-y-4 text-sm">
      {projectName && (
        <div className="border-b border-gold-dark/20 pb-2 mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gold-light font-medium">Project Name:</span>
          </div>
          <div className="text-offwhite font-medium">{projectName}</div>
        </div>
      )}

      {/* Primary Service */}
      <div className="border-b border-gold-dark/20 pb-2 mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-gold-light font-medium">Primary Service:</span>
          <Badge variant="outline" className="bg-gold/10 text-gold border-gold/30 py-1">
            Primary
          </Badge>
        </div>
        <div className="text-offwhite font-medium">{primaryService?.name}</div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-offwhite/70">Price:</span>
          <span className="text-gold-gradient font-medium">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format((primaryService?.price || 0) / 100)}
          </span>
        </div>
        {primaryService?.disclaimer && primaryService.disclaimer.trim().length > 0 && (
          <div
            className="mt-2 rounded border border-gold-dark/20 bg-[#080d17]/50 p-3"
            data-testid={`checkout-line-disclaimer-${primaryService.id}`}
          >
            <div className="text-xs font-semibold text-gold mb-1">Disclaimer</div>
            <p className="text-xs text-offwhite/70 leading-relaxed whitespace-pre-line">
              {primaryService.disclaimer.trim()}
            </p>
          </div>
        )}
      </div>

      {/* Additional Selected Services */}
      {selectedServices.length > 0 && (
        <div>
          <div className="text-gold-gradient font-medium mb-2">Additional Services:</div>
          <div className="space-y-3">
            {selectedServices.map((service) => (
              <div key={service.id} className="border-b border-gold-dark/10 pb-2">
                <div className="text-offwhite font-medium">{service.name}</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-offwhite/70">Price:</span>
                  <span className="text-gold-gradient">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(service.price / 100)}
                  </span>
                </div>
                {service.disclaimer && service.disclaimer.trim().length > 0 && (
                  <div
                    className="mt-2 rounded border border-gold-dark/20 bg-[#080d17]/50 p-3"
                    data-testid={`checkout-line-disclaimer-${service.id}`}
                  >
                    <div className="text-xs font-semibold text-gold mb-1">Disclaimer</div>
                    <p className="text-xs text-offwhite/70 leading-relaxed whitespace-pre-line">
                      {service.disclaimer.trim()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total Price */}
      <div className="flex justify-between items-center pt-2 border-t border-gold-dark/20 mt-2">
        <span className="text-offwhite font-medium">Total Price:</span>
        <Badge
          variant="outline"
          className="bg-gold/10 text-gold border-gold/30 py-1 font-medium"
        >
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(parseFloat(totalAmount || "0"))}
        </Badge>
      </div>

      {(() => {
        const allSvcs = [
          ...(primaryService ? [primaryService] : []),
          ...selectedServices,
        ];
        const hasAnyDisclaimer = allSvcs.some(
          (s) => s.disclaimer && s.disclaimer.trim().length > 0,
        );
        if (!hasAnyDisclaimer) return null;
        return (
          <p
            className="text-[11px] text-offwhite/50 pt-3 mt-3 border-t border-gold-dark/20"
            data-testid="checkout-disclaimers"
          >
            By continuing with payment you acknowledge the service disclaimer(s) above.
          </p>
        );
      })()}
    </div>
  );
}
