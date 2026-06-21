import { useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { ServiceCard } from "@/components/ui/service-card";
import { Loader2 } from "lucide-react";

const CATEGORY_ORDER = [
  "Real Estate & Marketing",
  "Property Inspections",
  "Mapping & Site Data",
  "Construction Lifecycle & 3D Digital Twins",
];

export function ServicesSection() {
  const {
    data: services,
    isLoading,
    error,
  } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  if (isLoading) {
    return (
      <section id="services" className="py-20 bg-[#132641]/25">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-gold-gradient" />
          </div>
        </div>
      </section>
    );
  }

  if (error || !services) {
    return (
      <section id="services" className="py-20 bg-[#132641]/25">
        <div className="container mx-auto px-4 text-center">
          <p className="text-red-500">
            {error ? `Error loading services: ${error.message}` : "No services available at the moment."}
          </p>
        </div>
      </section>
    );
  }

  const visibleServices = services.filter(service => !service.hideFromServicesPage);

  const grouped: Record<string, Service[]> = {};
  for (const cat of CATEGORY_ORDER) grouped[cat] = [];
  for (const svc of visibleServices) {
    const cat = svc.category ?? "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(svc);
  }
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
  }

  const categories = CATEGORY_ORDER.filter(cat => (grouped[cat]?.length ?? 0) > 0);

  return (
    <section id="services" className="py-20 bg-[#132641]/25">
      <div className="container mx-auto px-4 space-y-16">
        {categories.map(cat => (
          <div key={cat}>
            <div className="mb-8 text-center">
              <h3 className="text-2xl font-bold text-foreground">{cat}</h3>
              <div className="mt-2 mx-auto h-0.5 w-16 bg-primary/60 rounded-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {grouped[cat].map(service => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ServicesSection;
