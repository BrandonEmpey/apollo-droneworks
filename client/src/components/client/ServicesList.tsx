import { useQuery } from '@tanstack/react-query';
import { Service } from '@shared/schema';
import { Camera, Video, Layers, Box, Star } from 'lucide-react';

interface ServicesListProps {
  serviceIds: number[];
  primaryServiceId?: number;
}

const ProjectServicesList = ({ serviceIds, primaryServiceId }: ServicesListProps) => {
  // Fetch all services data
  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    staleTime: 300000, // 5 minutes
  });

  if (isLoading) {
    return <div className="text-offwhite/60 text-sm">Loading services...</div>;
  }

  if (!services || services.length === 0) {
    return <div className="text-offwhite/60 text-sm">No services found</div>;
  }

  // Get the service objects based on serviceIds
  const selectedServices = serviceIds
    .map(id => services.find(service => service.id === id))
    .filter(service => service !== undefined) as Service[];

  if (!selectedServices.length) {
    return <div className="text-offwhite/60 text-sm">No selected services</div>;
  }

  // Get service icon based on service name/category
  const getServiceIcon = (service: Service) => {
    const name = service.name.toLowerCase();
    
    if (name.includes('photo') || name.includes('image')) {
      return <Camera className="h-3.5 w-3.5 text-gold-light shrink-0" />;
    }
    if (name.includes('video')) {
      return <Video className="h-3.5 w-3.5 text-gold-light shrink-0" />;
    }
    if (name.includes('map') || name.includes('3d') || name.includes('model')) {
      return <Layers className="h-3.5 w-3.5 text-gold-light shrink-0" />;
    }
    if (name.includes('inspect') || name.includes('roof')) {
      return <Box className="h-3.5 w-3.5 text-gold-light shrink-0" />;
    }
    
    return <Box className="h-3.5 w-3.5 text-gold-light shrink-0" />;
  };

  return (
    <div className="space-y-1">
      {selectedServices.map((service) => (
        <div key={service.id} className="flex items-center gap-2 text-offwhite/80">
          {getServiceIcon(service)}
          <span>
            {service.name}
            {service.id === primaryServiceId && (
              <span className="ml-1.5 inline-flex items-center">
                <Star className="h-3 w-3 text-gold-light fill-gold-light" />
                <span className="text-xs text-gold-light/80 ml-0.5">Primary</span>
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ProjectServicesList;
