import { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Download, 
  Maximize2, 
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import { MediaItem } from "@/types/media";

type GalleryItemProps = {
  item: MediaItem;
  downloadable?: boolean;
  onDownload?: (src: string) => void;
  galleryItems?: MediaItem[];
  currentIndex?: number;
};

export function GalleryItem({ 
  item, 
  downloadable = false, 
  onDownload,
  galleryItems = [],
  currentIndex = 0
}: GalleryItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(currentIndex);
  const currentItem = galleryItems.length > 0 ? galleryItems[currentItemIndex] : item;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (galleryItems.length > 0) {
      setCurrentItemIndex((prevIndex) => 
        prevIndex === galleryItems.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (galleryItems.length > 0) {
      setCurrentItemIndex((prevIndex) => 
        prevIndex === 0 ? galleryItems.length - 1 : prevIndex - 1
      );
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(currentItem.src);
    } else {
      // Default download behavior
      const actualUrl = getActualUrl(currentItem.src);
      const link = document.createElement('a');
      link.href = actualUrl;
      
      // Generate a filename based on the title or use a default
      let filename = 'apollo-droneworks-';
      
      // Add the title to the filename if available
      if (currentItem.title) {
        // Clean up the title to make it suitable for a filename
        filename += currentItem.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
      } else {
        filename += 'image';
      }
      
      // Add appropriate extension if it's a base64 data URL
      if (actualUrl.startsWith('data:image/')) {
        const imageType = actualUrl.split(';')[0].split('/')[1];
        filename += `.${imageType === 'jpeg' ? 'jpg' : imageType}`;
      } else if (actualUrl.startsWith('data:video/')) {
        const videoType = actualUrl.split(';')[0].split('/')[1];
        filename += `.${videoType}`;
      } else if (currentItem.src.startsWith('local-file://')) {
        // For backward compatibility with old URL format
        const parts = currentItem.src.split('/');
        const oldFilename = parts[parts.length - 1].split('#')[0] || 'download';
        filename = oldFilename;
      } else {
        // For regular URLs, try to extract the filename
        const urlFilename = actualUrl.split('/').pop();
        if (urlFilename) {
          filename = urlFilename;
        } else {
          filename += '.png'; // Default extension
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Helper to parse URLs and ensure they work correctly
  const getActualUrl = (url: string | undefined): string => {
    // Check for null/undefined URLs and return a placeholder if necessary
    if (!url) {
      console.log('Empty URL encountered in gallery-item');
      return '';
    }
    
    // Debug the URL being processed (truncated to avoid console spam)
    console.log('Processing URL:', url.substring(0, 30) + '...');
    
    // For base64 images, no processing needed as they're already valid
    if (url.startsWith('data:image/') || url.startsWith('data:video/')) {
      console.log('Gallery item is using base64 data');
      return url;
    }
    
    // If it's our old special format (mockUrl#objectUrl), handle it for backward compatibility
    if (url.includes('#')) {
      const parts = url.split('#');
      const result = parts.length > 1 ? parts[1] : url;
      console.log('Processed URL result (old format):', result.substring(0, 30) + '...');
      return result;
    }
    
    // No special processing needed
    return url;
  };

  const renderPreview = () => {
    // Get the display URL, prioritizing thumbnail if available
    let displayUrl = item.thumbnail ? getActualUrl(item.thumbnail) : getActualUrl(item.src);
    
    if (item.type === 'video') {
      return (
        <div className="relative group w-full h-full">
          <img 
            src={displayUrl} 
            alt={item.alt || 'Video thumbnail'} 
            className="w-full h-full object-cover rounded-md"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="rounded-full bg-black/60 p-3">
              <Play className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <img 
        src={displayUrl} 
        alt={item.alt || 'Gallery image'} 
        className="w-full h-full object-cover rounded-md"
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="relative group bg-[#080d17] rounded-md overflow-hidden aspect-video cursor-pointer hover:shadow-md transition-shadow">
          {renderPreview()}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full bg-black/60 text-white hover:bg-black/80 hover:text-white"
              onClick={() => setIsOpen(true)}
            >
              <Maximize2 className="h-5 w-5" />
            </Button>
          </div>
          
          {item.title && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 group-hover:opacity-100 opacity-80">
              <p className="text-white text-sm font-medium truncate">{item.title}</p>
              {item.type === 'video' && (
                <Badge variant="outline" className="bg-red-600/80 text-white border-none text-xs">
                  VIDEO
                </Badge>
              )}
            </div>
          )}
        </div>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl p-0 overflow-hidden bg-[#080d17] border-gold-dark/30">
        <div className="relative h-full">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 z-50 h-8 w-8 rounded-full bg-black/60 text-white hover:bg-black/80"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          
          {galleryItems.length > 1 && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute left-2 top-1/2 -translate-y-1/2 z-50 h-10 w-10 rounded-full bg-black/60 text-white hover:bg-black/80"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-2 top-1/2 -translate-y-1/2 z-50 h-10 w-10 rounded-full bg-black/60 text-white hover:bg-black/80"
                onClick={handleNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
          
          <div className="max-h-[80vh] flex items-center justify-center bg-[#080d17] overflow-hidden">
            {currentItem.type === 'video' ? (
              <video 
                src={getActualUrl(currentItem.src)}
                controls
                className="max-h-[80vh] max-w-full"
                autoPlay
              />
            ) : (
              <img 
                src={getActualUrl(currentItem.src)} 
                alt={currentItem.alt || 'Gallery image'} 
                className="max-h-[80vh] max-w-full object-contain" 
              />
            )}
          </div>
          
          <div className="bg-[#0b111f] p-4">
            <div className="flex justify-between items-start">
              <div>
                {currentItem.title && (
                  <DialogTitle className="text-lg font-bold text-offwhite mb-1">
                    {currentItem.title}
                  </DialogTitle>
                )}
                {currentItem.publicDescription && (
                  <DialogDescription className="text-offwhite/70 text-sm">
                    {currentItem.publicDescription}
                  </DialogDescription>
                )}
              </div>
              
              {downloadable && (
                <Button 
                  onClick={handleDownload} 
                  variant="default" 
                  className="bg-gold text-black hover:bg-gold-light"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}