import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Gallery } from "@shared/schema";
import { GalleryItem } from "@/components/ui/gallery-item";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Filter, Lock } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

import { MediaItem } from "@/types/media";

export default function GalleryPage() {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  
  // Fetch galleries (public or user-specific based on auth status)
  const {
    data: galleries,
    isLoading,
    error,
  } = useQuery<Gallery[]>({
    queryKey: ["/api/galleries", user?.id],
  });
  
  // Helper to parse URLs and ensure they work correctly
  const getActualUrl = (url: string | undefined): string => {
    // Check for null/undefined URLs and return a placeholder if necessary
    if (!url) {
      console.log('Empty URL encountered in gallery-page');
      return '';
    }
    
    // Debug the URL being processed
    console.log('Gallery page processing URL:', url.substring(0, 30) + '...');
    
    // For base64 images, no processing needed as they're already valid
    if (url.startsWith('data:image/') || url.startsWith('data:video/')) {
      console.log('Gallery item is using base64 data');
      return url;
    }
    
    // If it's our old special format (mockUrl#objectUrl), handle it for backward compatibility
    if (url.includes('#')) {
      const parts = url.split('#');
      const result = parts.length > 1 ? parts[1] : url;
      console.log('Gallery page processed URL result (old format):', result.substring(0, 30) + '...');
      return result;
    }
    
    // No special processing needed
    return url;
  };

  // Convert gallery data to MediaItem format for the GalleryItem component
  const convertToMediaItems = (galleries: Gallery[] | undefined): MediaItem[] => {
    if (!galleries || galleries.length === 0) return [];
    
    return galleries.map(gallery => ({
      type: gallery.type.toLowerCase().includes('video') ? 'video' : 'image',
      src: getActualUrl(gallery.url), // Process URL to make it displayable
      alt: gallery.name,
      title: gallery.name,
      description: `${gallery.type} - ${gallery.category ? `Category: ${gallery.category}` : ''} - Created on ${new Date(gallery.createdAt).toLocaleDateString()}`,
      publicDescription: gallery.publicDescription || "",
      thumbnail: getActualUrl(gallery.thumbnail || gallery.url),
      category: gallery.category || 'uncategorized',
      tags: gallery.tags || []
    }));
  };
  
  const mediaItems = convertToMediaItems(galleries);
  
  // Filter the media items based on the selected filter and search query
  const filteredItems = mediaItems.filter(item => 
    (filter === "all" || 
     (item.description && item.description.toLowerCase().includes(filter.toLowerCase()))) &&
    (searchQuery === "" || 
     (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) || 
     (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <>
      <Helmet>
        <title>Gallery | Apollo DroneWorks</title>
        <meta name="description" content="Explore our portfolio of stunning aerial imagery, including real estate photography, construction monitoring, 3D models, and more." />
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        
        <main className="flex-grow pt-32 pb-20 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-3xl sm:text-5xl font-bold font-montserrat text-gold-gradient mb-6">Our Gallery</h1>
              <p className="text-offwhite max-w-2xl mx-auto leading-relaxed">
                Explore our portfolio of stunning aerial imagery and 3D visualizations created for clients across various industries.
              </p>
            </div>

            {/* Search and Filter */}
            <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-offwhite/50" />
                <Input
                  placeholder="Search by name or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#080d17] border-offwhite/20 pl-10 text-offwhite"
                />
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Filter className="h-5 w-5 text-offwhite/70" />
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-full sm:w-[220px] bg-[#080d17] border-offwhite/20">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#132642] border-gold-dark/30">
                    <SelectItem value="all">All Projects</SelectItem>
                    <SelectItem value="real estate">Real Estate</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="3d">3D Models</SelectItem>
                    <SelectItem value="video">Videography</SelectItem>
                    <SelectItem value="aerial mapping">Aerial Mapping</SelectItem>
                    <SelectItem value="timelapse">Timelapse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-gold" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500 mb-4">Error loading gallery items.</p>
                <Button 
                  onClick={() => window.location.reload()}
                  className="bg-gold text-black hover:bg-gold-light"
                >
                  Try Again
                </Button>
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item, index) => (
                  <GalleryItem 
                    key={`gallery-item-${index}`} 
                    item={item} 
                    downloadable={false}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-[#132642] rounded-lg">
                <p className="text-offwhite mb-2">No gallery items found matching your criteria.</p>
                <p className="text-offwhite/70 mb-4">Try adjusting your search or filter.</p>
                <Button 
                  onClick={() => {
                    setFilter("all");
                    setSearchQuery("");
                  }}
                  className="bg-gold text-black hover:bg-gold-light"
                >
                  Reset Filters
                </Button>
              </div>
            )}
            
            {/* Personal Gallery Info for Logged-in Users */}
            {user && (
              <div className="mt-16 mb-8 bg-[#0b111f] p-8 rounded-lg border border-gold/30">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold font-montserrat text-gold-gradient mb-2">
                      Your Personal Gallery
                    </h2>
                    <p className="text-offwhite max-w-2xl leading-relaxed">
                      {filteredItems.length > 0 
                        ? "These are your personalized drone visuals from completed bookings." 
                        : "This is your personalized gallery. After completing a booking, your custom drone content will appear here."}
                    </p>
                  </div>
                  <Link href="/dashboard">
                    <Button className="mt-4 md:mt-0 bg-transparent border border-gold text-gold hover:bg-gold/10">
                      Go to Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Call to Action */}
            <div className="mt-8 bg-[#132642] p-10 rounded-lg border border-gold-dark/30 text-center">
              <h2 className="text-2xl font-bold font-montserrat text-gold-gradient mb-6">
                {user 
                  ? "Ready for More Aerial Content?" 
                  : "Ready to Create Your Own Aerial Content?"}
              </h2>
              <p className="text-offwhite max-w-2xl mx-auto mb-8 leading-relaxed">
                {user 
                  ? "Book another drone service and add more stunning visuals to your personal gallery."
                  : "Create an account, book a service, and get access to your own personalized drone visuals."}
              </p>
              {user ? (
                <Button 
                  className="bg-gold border-2 border-gold text-black hover:bg-gold-light"
                  onClick={() => window.location.href = "/booking"}
                >
                  Book New Service
                </Button>
              ) : (
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button 
                    className="bg-gold border-2 border-gold text-black hover:bg-gold-light"
                    onClick={() => window.location.href = "/auth"}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Create Account
                  </Button>
                  <Button 
                    className="bg-transparent border-2 border-gold text-gold hover:bg-gold/10"
                    onClick={() => window.location.href = "/booking"}
                  >
                    Browse Services
                  </Button>
                </div>
              )}
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
