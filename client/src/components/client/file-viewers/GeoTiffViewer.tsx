import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ZoomIn,
  ZoomOut,
  Move,
  Ruler,
  Layers,
  Map,
  Sun,
  Mountain,
  Download,
  PanelLeftOpen,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface GeoTiffViewerProps {
  fileUrl: string;
}

export default function GeoTiffViewer({ fileUrl }: GeoTiffViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panelOpen, setPanelOpen] = useState(true);
  const [measureMode, setMeasureMode] = useState(false);
  const [measuredDistance, setMeasuredDistance] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [activeLayer, setActiveLayer] = useState("terrain");
  const [opacity, setOpacity] = useState(100);
  const [colorized, setColorized] = useState(true);
  
  // Mock layers for demonstration
  const layers = [
    { id: "terrain", name: "Terrain", icon: <Mountain className="h-4 w-4" /> },
    { id: "elevation", name: "Elevation", icon: <Mountain className="h-4 w-4" /> },
    { id: "satellite", name: "Satellite", icon: <Sun className="h-4 w-4" /> },
    { id: "map", name: "Map Overlay", icon: <Map className="h-4 w-4" /> }
  ];
  
  // Canvas references for drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Simulate loading the GeoTIFF data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      // In a real implementation, we would load and parse the GeoTIFF file here
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawMockGeoTIFF(ctx, canvas.width, canvas.height, activeLayer, colorized);
        }
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [fileUrl]);

  // Update canvas when changing viewing parameters
  useEffect(() => {
    if (!isLoading && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawMockGeoTIFF(ctx, canvas.width, canvas.height, activeLayer, colorized);
      }
    }
  }, [zoom, activeLayer, showGrid, colorized, opacity, isLoading]);

  const zoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 3));
  };

  const zoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const toggleMeasureMode = () => {
    setMeasureMode(prev => !prev);
    if (measureMode) {
      setMeasuredDistance(null);
    } else {
      // Simulating a measurement operation
      setTimeout(() => {
        setMeasuredDistance("127.4 m");
      }, 500);
    }
  };

  const togglePanel = () => {
    setPanelOpen(prev => !prev);
  };

  const setLayer = (id: string) => {
    setActiveLayer(id);
  };

  // Mock drawing function to simulate GeoTIFF rendering
  const drawMockGeoTIFF = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    layer: string,
    useColors: boolean
  ) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Background color
    ctx.fillStyle = '#131c33';
    ctx.fillRect(0, 0, width, height);
    
    // Draw mock data based on selected layer
    if (layer === 'terrain') {
      drawMockTerrain(ctx, width, height, useColors);
    } else if (layer === 'elevation') {
      drawMockElevation(ctx, width, height, useColors);
    } else if (layer === 'satellite') {
      drawMockSatellite(ctx, width, height);
    } else if (layer === 'map') {
      drawMockMap(ctx, width, height);
    }
    
    // Draw grid if enabled
    if (showGrid) {
      const gridSize = 50;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 0.5;
      
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
    
    // Draw measurement if in measure mode
    if (measureMode && measuredDistance) {
      ctx.strokeStyle = '#C7AE6A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 4, height / 2);
      ctx.lineTo(width * 3 / 4, height / 2);
      ctx.stroke();
      
      // Draw points at start and end
      ctx.fillStyle = '#C7AE6A';
      ctx.beginPath();
      ctx.arc(width / 4, height / 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(width * 3 / 4, height / 2, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw measurement text
      ctx.fillStyle = 'white';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(measuredDistance, width / 2, height / 2 - 15);
    }
  };

  // Mock drawing functions for different layers
  const drawMockTerrain = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number,
    useColors: boolean
  ) => {
    // Create a gradient for height representation
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    
    if (useColors) {
      // Colorized terrain
      gradient.addColorStop(0, 'rgba(17, 24, 39, ' + opacity / 100 + ')');
      gradient.addColorStop(0.2, 'rgba(55, 65, 81, ' + opacity / 100 + ')');
      gradient.addColorStop(0.4, 'rgba(75, 85, 99, ' + opacity / 100 + ')');
      gradient.addColorStop(0.6, 'rgba(107, 114, 128, ' + opacity / 100 + ')');
      gradient.addColorStop(0.8, 'rgba(156, 163, 175, ' + opacity / 100 + ')');
      gradient.addColorStop(1, 'rgba(209, 213, 219, ' + opacity / 100 + ')');
    } else {
      // Grayscale terrain
      gradient.addColorStop(0, 'rgba(31, 41, 55, ' + opacity / 100 + ')');
      gradient.addColorStop(0.5, 'rgba(75, 85, 99, ' + opacity / 100 + ')');
      gradient.addColorStop(1, 'rgba(156, 163, 175, ' + opacity / 100 + ')');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw terrain contour lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 0.7;
    
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      
      for (let x = 0; x < width; x += 10) {
        const randomY = y + Math.sin(x / 50) * 10 + Math.cos(x / 30) * 5;
        ctx.lineTo(x, randomY);
      }
      
      ctx.stroke();
    }
  };

  const drawMockElevation = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number,
    useColors: boolean
  ) => {
    // Create a gradient for elevation
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    
    if (useColors) {
      // Colorized elevation (blue to red)
      gradient.addColorStop(0, 'rgba(30, 58, 138, ' + opacity / 100 + ')');
      gradient.addColorStop(0.2, 'rgba(59, 130, 246, ' + opacity / 100 + ')');
      gradient.addColorStop(0.4, 'rgba(110, 231, 183, ' + opacity / 100 + ')');
      gradient.addColorStop(0.6, 'rgba(253, 230, 138, ' + opacity / 100 + ')');
      gradient.addColorStop(0.8, 'rgba(239, 68, 68, ' + opacity / 100 + ')');
      gradient.addColorStop(1, 'rgba(153, 27, 27, ' + opacity / 100 + ')');
    } else {
      // Grayscale elevation
      gradient.addColorStop(0, 'rgba(31, 41, 55, ' + opacity / 100 + ')');
      gradient.addColorStop(0.5, 'rgba(107, 114, 128, ' + opacity / 100 + ')');
      gradient.addColorStop(1, 'rgba(229, 231, 235, ' + opacity / 100 + ')');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw elevation bands
    const bandCount = 10;
    const bandHeight = height / bandCount;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i < bandCount; i++) {
      const y = i * bandHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      // Add elevation labels
      const elevation = Math.round((bandCount - i) * 100);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '10px sans-serif';
      ctx.fillText(elevation + 'm', 5, y + 12);
    }
  };

  const drawMockSatellite = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number
  ) => {
    // Simple mock satellite imagery with a pattern
    const blockSize = 2;
    const colors = [
      'rgba(17, 24, 39, ' + opacity / 100 + ')',
      'rgba(55, 65, 81, ' + opacity / 100 + ')',
      'rgba(75, 85, 99, ' + opacity / 100 + ')',
      'rgba(107, 114, 128, ' + opacity / 100 + ')',
      'rgba(156, 163, 175, ' + opacity / 100 + ')'
    ];
    
    for (let x = 0; x < width; x += blockSize) {
      for (let y = 0; y < height; y += blockSize) {
        const colorIndex = Math.floor(Math.random() * colors.length);
        ctx.fillStyle = colors[colorIndex];
        ctx.fillRect(x, y, blockSize, blockSize);
      }
    }
    
    // Add some larger features like "roads" or "rivers"
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, height / 3);
    ctx.bezierCurveTo(width / 4, height / 2, width / 2, height / 4, width, height / 3);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(width / 5, 0);
    ctx.bezierCurveTo(width / 4, height / 2, width * 3 / 4, height / 2, width * 4 / 5, height);
    ctx.stroke();
  };

  const drawMockMap = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number
  ) => {
    // Base color
    ctx.fillStyle = 'rgba(15, 23, 42, ' + opacity / 100 + ')';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid representing a map
    const gridSize = 40;
    
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw main "roads"
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.8)';
    ctx.lineWidth = 2;
    
    // Horizontal road
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    // Vertical road
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    
    // Secondary roads
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.6)';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.moveTo(0, height / 4);
    ctx.lineTo(width, height / 4);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, height * 3 / 4);
    ctx.lineTo(width, height * 3 / 4);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(width / 4, 0);
    ctx.lineTo(width / 4, height);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(width * 3 / 4, 0);
    ctx.lineTo(width * 3 / 4, height);
    ctx.stroke();
    
    // Add some landmarks
    ctx.fillStyle = 'rgba(96, 165, 250, 0.8)';
    
    // Water body
    ctx.beginPath();
    ctx.arc(width / 4, height / 4, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Buildings
    ctx.fillStyle = 'rgba(147, 51, 234, 0.7)';
    ctx.fillRect(width * 3 / 4 - 20, height * 3 / 4 - 20, 40, 40);
    ctx.fillRect(width * 3 / 4 - 15, height * 3 / 4 - 50, 30, 25);
    
    ctx.fillRect(width / 4 - 15, height * 3 / 4 - 15, 30, 30);
    
    // Parks
    ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.beginPath();
    ctx.ellipse(width * 3 / 4, height / 4, 40, 25, 0, 0, Math.PI * 2);
    ctx.fill();
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
          GeoTIFF Viewer
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
                  className="bg-[#0b111f] hover:bg-[#132642] border-gold-dark/30 text-offwhite"
                >
                  <Move className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#132642] border-gold-dark/30">
                <p>Pan</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={measureMode ? "default" : "outline"}
                  size="sm"
                  onClick={toggleMeasureMode}
                  className={measureMode 
                    ? "bg-gold hover:bg-gold-dark text-black" 
                    : "bg-[#0b111f] hover:bg-[#132642] border-gold-dark/30 text-offwhite"
                  }
                >
                  <Ruler className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#132642] border-gold-dark/30">
                <p>Measure Distance</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={togglePanel}
                  className="bg-[#0b111f] hover:bg-[#132642] border-gold-dark/30 text-offwhite"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#132642] border-gold-dark/30">
                <p>{panelOpen ? "Hide Panel" : "Show Panel"}</p>
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
      
      <div className="flex space-x-4">
        {panelOpen && (
          <div className="w-64 bg-[#080d17] rounded-md p-3 space-y-3 overflow-auto h-[400px]">
            <div>
              <h4 className="text-sm font-medium text-offwhite mb-2">Layers</h4>
              <div className="space-y-2 border border-gold-dark/30 rounded-md p-2">
                {layers.map(layer => (
                  <div 
                    key={layer.id}
                    className={`flex items-center p-1.5 rounded-sm cursor-pointer ${activeLayer === layer.id ? 'bg-[#132642]' : 'hover:bg-[#0b111f]'}`}
                    onClick={() => setLayer(layer.id)}
                  >
                    <div className="mr-2 text-offwhite/70">
                      {layer.icon}
                    </div>
                    <span className="text-sm text-offwhite">{layer.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-offwhite mb-1">Controls</h4>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="grid-switch" className="text-xs text-offwhite/70">Show Grid</Label>
                <Switch
                  id="grid-switch"
                  checked={showGrid}
                  onCheckedChange={setShowGrid}
                  className="data-[state=checked]:bg-gold"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="colorized-switch" className="text-xs text-offwhite/70">Colorized</Label>
                <Switch
                  id="colorized-switch"
                  checked={colorized}
                  onCheckedChange={setColorized}
                  className="data-[state=checked]:bg-gold"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="opacity-slider" className="text-xs text-offwhite/70">Opacity</Label>
                <span className="text-xs text-offwhite/70">{opacity}%</span>
              </div>
              <Slider 
                id="opacity-slider"
                min={20} 
                max={100} 
                step={1} 
                value={[opacity]} 
                onValueChange={(value) => setOpacity(value[0])} 
                className="my-1.5"
              />
            </div>
            
            <div className="space-y-2 border border-gold-dark/30 rounded-md p-2">
              <h4 className="text-xs font-medium text-offwhite">Map Information</h4>
              <table className="w-full text-xs">
                <tbody>
                  <tr>
                    <td className="py-1 text-offwhite/70">Name:</td>
                    <td className="py-1 text-offwhite">Sample GeoTIFF</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-offwhite/70">Dimensions:</td>
                    <td className="py-1 text-offwhite">1500 x 1200</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-offwhite/70">Coordinates:</td>
                    <td className="py-1 text-offwhite">34.05°N, 118.25°W</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-offwhite/70">Date:</td>
                    <td className="py-1 text-offwhite">2023-11-15</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div className="flex-1 rounded-md bg-[#080d17] overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[400px]">
              <div className="animate-spin w-8 h-8 border-4 border-gold border-t-transparent rounded-full" />
              <p className="mt-4 text-offwhite/70">Loading GeoTIFF data...</p>
            </div>
          ) : (
            <div className="relative w-full h-[400px] flex items-center justify-center overflow-hidden">
              <canvas 
                ref={canvasRef}
                width={800} 
                height={400}
                className="w-full h-full object-contain"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease-out'
                }}
              />
              
              {measureMode && (
                <div className="absolute top-2 right-2 bg-[#0b111f] border border-gold-dark/30 rounded-md p-2 text-xs text-offwhite">
                  <span>Click to set start point, then click again to measure distance</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Legend at the bottom */}
      {!isLoading && activeLayer === 'elevation' && (
        <div className="mt-4 bg-[#080d17] rounded-md p-3">
          <h4 className="text-xs font-medium text-offwhite mb-2">Elevation Color Legend</h4>
          <div className="h-4 w-full bg-gradient-to-r from-blue-800 via-emerald-300 to-red-800 rounded-sm" />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-offwhite/70">0m</span>
            <span className="text-xs text-offwhite/70">500m</span>
            <span className="text-xs text-offwhite/70">1000m</span>
          </div>
        </div>
      )}
    </div>
  );
}