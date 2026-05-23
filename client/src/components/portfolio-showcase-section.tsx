import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MultimediaCarousel from '@/components/ui/multimedia-carousel';
import { PlusCircle, Image, Video, Layers } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

// Define MediaItem type directly in this file
type MediaItem = {
  type: 'image' | 'video';
  src: string;
  alt?: string;
  thumbnail?: string;
  category?: 'real-estate' | 'construction' | 'events';
  title?: string;
  description?: string;
};

// Sample media items for showcase
const sampleMedia: MediaItem[] = [
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
    alt: 'Luxury estate aerial view',
    category: 'real-estate',
    title: 'Lakefront Property Showcase',
    description: 'Aerial photography highlighting the expansive grounds of this luxury estate'
  },
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
    alt: 'Modern home aerial view',
    category: 'real-estate',
    title: 'Modern Residential Development',
    description: 'Showcasing the architectural design from an elevated perspective'
  },
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1466784828399-9a9921e8bdfd?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
    alt: 'Construction site aerial view',
    category: 'construction',
    title: 'Downtown Development Progress',
    description: 'Monitoring construction progress of the new commercial complex'
  },
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1501003878151-d3cb87799705?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
    alt: 'Festival aerial view',
    category: 'events',
    title: 'Summer Music Festival',
    description: 'Capturing the scale and atmosphere of the outdoor event'
  },
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1568124936547-62c9180d7993?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
    alt: 'Aerial view of coastline property',
    category: 'real-estate',
    title: 'Oceanfront Development',
    description: 'Showcasing the proximity to the coastline and surrounding amenities'
  },
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1625602812206-5ec545ca1231?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
    alt: 'Highway construction aerial view',
    category: 'construction',
    title: 'Highway Expansion Project',
    description: 'Monitoring progress on the northern section of the highway expansion'
  }
];

export function PortfolioShowcaseSection() {
  const { user } = useAuth();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(sampleMedia);
  const [portfolioType, setPortfolioType] = useState<'all' | 'real-estate' | 'construction' | 'events'>('all');
  
  // Function to handle media upload (for admin users)
  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    
    if (isVideo || isImage) {
      const url = URL.createObjectURL(file);
      const newMedia: MediaItem = {
        type: isVideo ? 'video' : 'image',
        src: url,
        alt: file.name,
      };
      
      setMediaItems(prev => [newMedia, ...prev]);
    }
  };
  
  const filteredMedia = portfolioType === 'all' 
    ? mediaItems 
    : mediaItems.filter(item => item.category === portfolioType);

  return (
    <section className="py-20 bg-gradient-to-b from-[#0b111f] to-[#132642]" id="portfolio">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold gold-text mb-4">Our Portfolio</h2>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto">
            Explore our collection of stunning aerial imagery and videos. From real estate to construction sites and special events, 
            our drone photography showcases the world from a unique perspective.
          </p>
          
          {/* Filter buttons */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Button
              variant={portfolioType === 'all' ? 'default' : 'outline'}
              onClick={() => setPortfolioType('all')}
              className="border-gold"
            >
              <Layers className="mr-2 h-4 w-4" /> All Work
            </Button>
            <Button
              variant={portfolioType === 'real-estate' ? 'default' : 'outline'}
              onClick={() => setPortfolioType('real-estate')}
              className="border-gold"
            >
              <Image className="mr-2 h-4 w-4" /> Real Estate
            </Button>
            <Button
              variant={portfolioType === 'construction' ? 'default' : 'outline'}
              onClick={() => setPortfolioType('construction')}
              className="border-gold"
            >
              <Image className="mr-2 h-4 w-4" /> Construction
            </Button>
            <Button
              variant={portfolioType === 'events' ? 'default' : 'outline'}
              onClick={() => setPortfolioType('events')}
              className="border-gold"
            >
              <Video className="mr-2 h-4 w-4" /> Events
            </Button>
          </div>
        </motion.div>
        
        {/* Admin upload control - only visible for admin users */}
        {user?.isAdmin && (
          <div className="mb-8 flex justify-center">
            <label className="flex items-center gap-2 px-4 py-2 bg-background border border-gold rounded-md cursor-pointer hover:bg-black-light transition-colors">
              <PlusCircle className="h-5 w-5 text-gold" />
              <span>Add Media</span>
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleMediaUpload}
              />
            </label>
          </div>
        )}
        
        {/* Multimedia carousel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full"
        >
          <Card className="bg-background/30 border border-gold/20 backdrop-blur-sm">
            <CardContent className="p-1 sm:p-2">
              <MultimediaCarousel
                slides={filteredMedia.length > 0 ? filteredMedia : sampleMedia}
                showDots={true}
                showArrows={true}
                showNavigation={true}
                className="h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] rounded-md overflow-hidden"
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

export default PortfolioShowcaseSection;