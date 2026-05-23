import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ZoomIn, ZoomOut, RotateCw, Download, Maximize } from 'lucide-react';

interface ImageViewerProps {
  fileUrl: string;
}

export default function ImageViewer({ fileUrl }: ImageViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  
  // Reference to the container for fullscreen
  const containerRef = useRef<HTMLDivElement>(null);

  // Simulate image loading
  useEffect(() => {
    const img = new Image();
    img.src = fileUrl;
    
    img.onload = () => {
      setIsLoading(false);
    };
    
    img.onerror = () => {
      setError("Failed to load image");
      setIsLoading(false);
    };
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [fileUrl]);

  const zoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 3));
  };

  const zoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => {
        console.error("Error exiting fullscreen:", err);
      });
    } else {
      containerRef.current.requestFullscreen().catch(err => {
        console.error("Error entering fullscreen:", err);
      });
    }
  };

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col" ref={containerRef}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-offwhite/70">
          Image Viewer
        </div>
        
        <div className="flex space-x-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={zoomIn}
                  className="bg-[#0b111f] hover:bg-[#132642] border-gold-dark/30 text-offwhite"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#132642] border-gold-dark/30">
                <p>Zoom In</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={zoomOut}
                  className="bg-[#0b111f] hover:bg-[#132642] border-gold-dark/30 text-offwhite"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#132642] border-gold-dark/30">
                <p>Zoom Out</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={rotate}
                  className="bg-[#0b111f] hover:bg-[#132642] border-gold-dark/30 text-offwhite"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#132642] border-gold-dark/30">
                <p>Rotate 90°</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="bg-[#0b111f] hover:bg-[#132642] border-gold-dark/30 text-offwhite"
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#132642] border-gold-dark/30">
                <p>Fullscreen</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline"
                  size="sm"
                  className="bg-[#0b111f] hover:bg-[#132642] border-gold-dark/30 text-offwhite"
                  asChild
                >
                  <a href={fileUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#132642] border-gold-dark/30">
                <p>Download Original</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="rounded-md bg-[#080d17] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[400px]">
            <div className="animate-spin w-8 h-8 border-4 border-gold border-t-transparent rounded-full" />
            <p className="mt-4 text-offwhite/70">Loading image...</p>
          </div>
        ) : (
          <div className="relative w-full h-[400px] flex items-center justify-center overflow-hidden">
            <img 
              src={fileUrl} 
              alt="Viewer"
              className="max-w-full max-h-full object-contain"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                transition: 'transform 0.2s ease-out'
              }}
            />
          </div>
        )}
      </div>
      
      <div className="mt-4 bg-[#080d17] rounded-md p-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="brightness" className="text-xs text-offwhite/70">Brightness</Label>
              <span className="text-xs text-offwhite/70">{brightness}%</span>
            </div>
            <Slider 
              id="brightness"
              min={50} 
              max={150} 
              step={1} 
              value={[brightness]} 
              onValueChange={(value) => setBrightness(value[0])} 
              className="my-1.5"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="contrast" className="text-xs text-offwhite/70">Contrast</Label>
              <span className="text-xs text-offwhite/70">{contrast}%</span>
            </div>
            <Slider 
              id="contrast"
              min={50} 
              max={150} 
              step={1} 
              value={[contrast]} 
              onValueChange={(value) => setContrast(value[0])} 
              className="my-1.5"
            />
          </div>
        </div>
      </div>
    </div>
  );
}