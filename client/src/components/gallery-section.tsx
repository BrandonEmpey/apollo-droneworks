import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gallery } from "@shared/schema";
import { GalleryItem } from "@/components/ui/gallery-item";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

// Sample gallery data for the homepage preview
const sampleGalleryItems = [
  {
    id: 1,
    name: "Luxury Estate Showcase",
    type: "Real Estate Photography",
    url: "https://images.unsplash.com/photo-1513977055326-8ae6272d90a7?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    name: "Downtown Development",
    type: "Construction Monitoring",
    url: "https://images.unsplash.com/photo-1517824806704-9040b037703b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 3,
    name: "Heritage Site Modeling",
    type: "Photogrammetry & 3D Models",
    url: "https://images.unsplash.com/photo-1570143675316-51a19f90a943?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 4,
    name: "Oceanfront Property",
    type: "Real Estate Photography",
    url: "https://images.unsplash.com/photo-1609843021682-1cb7e2e4ca5e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 5,
    name: "Highway Expansion",
    type: "Construction Timelapse",
    url: "https://images.unsplash.com/photo-1579428836926-6a71d31c76d9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 6,
    name: "Industrial Complex",
    type: "3D Modeling",
    url: "https://images.unsplash.com/photo-1504233529578-6d46baba6d34?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
  },
];

export function GallerySection({ limit = 6, showFilters = true }: { limit?: number; showFilters?: boolean }) {
  const [filter, setFilter] = useState("All");
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  
  const {
    data: publicGalleries,
    isLoading,
    error,
  } = useQuery<Gallery[]>({
    queryKey: ["/api/galleries"],
  });
  
  useEffect(() => {
    // If we have real data from the API, use it, otherwise set empty array
    // We don't want to show sample data anymore
    if (publicGalleries && publicGalleries.length > 0) {
      setGalleryItems(publicGalleries);
    } else {
      setGalleryItems([]);
    }
  }, [publicGalleries]);
  
  // Filter the gallery items based on the selected filter
  const filteredItems = filter === "All" 
    ? galleryItems 
    : galleryItems.filter(item => item.type.includes(filter));
  
  // Limit the number of items if specified
  const displayedItems = filteredItems.slice(0, limit);

  // Return null if loading or if there are no gallery items
  if (isLoading) {
    return (
      <section id="gallery" className="py-20 bg-[#0b111f]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold font-montserrat gold-text mb-4">Our Work</h2>
          <p className="text-offwhite max-w-2xl mx-auto mb-10">
            Browse our portfolio of stunning aerial imagery and 3D visualizations
          </p>
          <div className="flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-gold" />
          </div>
        </div>
      </section>
    );
  }
  
  // Return null if there are no gallery items
  if (galleryItems.length === 0) {
    return null;
  }

  return (
    <section id="gallery" className="py-20 bg-[#0b111f]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold font-montserrat gold-text mb-4">Our Work</h2>
          <p className="text-offwhite max-w-2xl mx-auto">
            Browse our portfolio of stunning aerial imagery and 3D visualizations
          </p>
        </div>

        {showFilters && (
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <Button
              variant={filter === "All" ? "default" : "outline"}
              onClick={() => setFilter("All")}
              className={
                filter === "All"
                  ? "bg-gold text-black hover:bg-gold-light"
                  : "border-gold hover:border-gold hover:bg-transparent"
              }
            >
              All
            </Button>
            <Button
              variant={filter === "Real Estate" ? "default" : "outline"}
              onClick={() => setFilter("Real Estate")}
              className={
                filter === "Real Estate"
                  ? "bg-gold text-black hover:bg-gold-light"
                  : "border-offwhite/30 hover:border-gold"
              }
            >
              Real Estate
            </Button>
            <Button
              variant={filter === "Construction" ? "default" : "outline"}
              onClick={() => setFilter("Construction")}
              className={
                filter === "Construction"
                  ? "bg-gold text-black hover:bg-gold-light"
                  : "border-offwhite/30 hover:border-gold"
              }
            >
              Construction
            </Button>
            <Button
              variant={filter === "3D" ? "default" : "outline"}
              onClick={() => setFilter("3D")}
              className={
                filter === "3D"
                  ? "bg-gold text-black hover:bg-gold-light"
                  : "border-offwhite/30 hover:border-gold"
              }
            >
              3D Models
            </Button>
            <Button
              variant={filter === "Video" ? "default" : "outline"}
              onClick={() => setFilter("Video")}
              className={
                filter === "Video"
                  ? "bg-gold text-black hover:bg-gold-light"
                  : "border-offwhite/30 hover:border-gold"
              }
            >
              Videography
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedItems.map((item) => (
            <GalleryItem 
              key={item.id} 
              item={{
                type: item.type === 'video' ? 'video' : 'image',
                src: item.url,
                alt: item.name,
                title: item.name,
                description: item.description,
                publicDescription: item.publicDescription,
                thumbnail: item.thumbnail
              }} 
            />
          ))}
        </div>

        {limit && galleryItems.length > limit && (
          <div className="text-center mt-10">
            <Link href="/gallery">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-gold text-offwhite hover:bg-gold-light hover:text-gold-gradient transition-all"
              >
                View Full Portfolio
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default GallerySection;
