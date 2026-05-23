import { useQuery } from "@tanstack/react-query";
import { BeforeAfterImage } from "@shared/schema";
import { ImageComparisonSlider } from "@/components/ui/image-comparison-slider";
import { Loader2 } from "lucide-react";

// Sample before/after data
const sampleBeforeAfterImages = [
  {
    id: 1,
    title: "Real Estate Photography Enhancement",
    description: "Professional color grading and sky replacement for stunning property marketing",
    beforeImageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    afterImageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    isPublic: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Construction Site Progress",
    description: "Six-month development timeline showcasing project evolution from above",
    beforeImageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    afterImageUrl: "https://images.unsplash.com/photo-1590725140246-20acddc1ec6d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    isPublic: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    title: "Landscape Transformation",
    description: "Before and after aerial views of major landscaping project",
    beforeImageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    afterImageUrl: "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    isPublic: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 4,
    title: "Photogrammetry 3D Model",
    description: "Raw drone footage processed into detailed 3D model for accurate measurements",
    beforeImageUrl: "https://images.unsplash.com/photo-1622737133809-d95047b9e673?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    afterImageUrl: "https://images.unsplash.com/photo-1593344484862-487daff579f6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    isPublic: true,
    createdAt: new Date().toISOString(),
  }
];

export function BeforeAfterSection() {
  const {
    data: beforeAfterImages,
    isLoading,
    error,
  } = useQuery<BeforeAfterImage[]>({
    queryKey: ["/api/before-after"],
  });

  // Use sample data if no real data is available
  const images = beforeAfterImages && beforeAfterImages.length > 0 
    ? beforeAfterImages 
    : sampleBeforeAfterImages;

  if (isLoading) {
    return (
      <section className="py-20 bg-black-light">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold font-montserrat gold-text mb-4">Before & After</h2>
          <p className="text-offwhite max-w-2xl mx-auto mb-10">
            See the transformation our drone services can provide for your projects
          </p>
          <div className="flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-gold" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-black-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold font-montserrat gold-text mb-4">Before & After</h2>
          <p className="text-offwhite max-w-2xl mx-auto">
            See the transformation our drone services can provide for your projects
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {images.map((image) => (
            <div key={image.id} className="before-after-container">
              <ImageComparisonSlider
                beforeImage={image.beforeImageUrl}
                afterImage={image.afterImageUrl}
                beforeAlt={`Before - ${image.title}`}
                afterAlt={`After - ${image.title}`}
              />
              <div className="mt-4 text-center">
                <h3 className="text-xl font-semibold font-montserrat gold-text">{image.title}</h3>
                <p className="text-offwhite text-sm mt-2">{image.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default BeforeAfterSection;
