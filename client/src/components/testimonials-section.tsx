import { useQuery } from "@tanstack/react-query";
import { Testimonial } from "@shared/schema";
import { TestimonialCard } from "@/components/ui/testimonial-card";
import { Loader2 } from "lucide-react";

// Sample testimonials to display if no data is available from the API
const sampleTestimonials: Testimonial[] = [
  {
    id: 1,
    name: "Jennifer Miller",
    company: "Coastal Real Estate",
    content: "Apollo DroneWorks transformed our real estate listings with stunning aerial photography. Properties with their drone shots sell 30% faster than those without.",
    rating: 5,
    isApproved: true,
    createdAt: new Date()
  },
  {
    id: 2,
    name: "Robert Johnson",
    company: "Summit Construction",
    content: "The construction timelapse services provided us with invaluable progress documentation and helped us keep stakeholders informed throughout the project.",
    rating: 5,
    isApproved: true,
    createdAt: new Date()
  },
  {
    id: 3,
    name: "Sarah Parker",
    company: "Visionary Developers",
    content: "The 3D models they created of our development site helped us identify potential issues before they became problems. Exceptional service.",
    rating: 5,
    isApproved: true,
    createdAt: new Date()
  }
];

export function TestimonialsSection() {
  const {
    data: testimonials,
    isLoading,
    error,
  } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"],
  });

  // Use sample testimonials if no data is available
  // Convert createdAt from string to Date if needed
  const processedTestimonials = testimonials?.map(testimonial => ({
    ...testimonial,
    createdAt: testimonial.createdAt instanceof Date ? 
      testimonial.createdAt : 
      new Date(testimonial.createdAt)
  }));
  
  const displayTestimonials = processedTestimonials && processedTestimonials.length > 0 
    ? processedTestimonials 
    : sampleTestimonials;

  if (isLoading) {
    return (
      <section className="py-20 bg-[#0b111f]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold font-montserrat gold-text mb-4">Client Testimonials</h2>
          <p className="text-offwhite max-w-2xl mx-auto mb-10">
            See what our clients say about our drone services
          </p>
          <div className="flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-gold" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-[#0b111f]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold font-montserrat gold-text mb-4">Client Testimonials</h2>
          <p className="text-offwhite max-w-2xl mx-auto">See what our clients say about our drone services</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayTestimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default TestimonialsSection;
