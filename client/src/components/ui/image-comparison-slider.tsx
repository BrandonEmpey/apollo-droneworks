import { useState, useRef, useEffect } from "react";
import { ArrowLeftRight } from "lucide-react";

interface ImageComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeAlt?: string;
  afterAlt?: string;
  className?: string;
}

export function ImageComparisonSlider({
  beforeImage,
  afterImage,
  beforeAlt = "Before",
  afterAlt = "After",
  className = "",
}: ImageComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  
  // Handle mouse down on the slider handle
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
  };
  
  // Handle mouse move (only if dragging)
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    updateSliderPosition(e.clientX);
  };
  
  // Handle mouse up (stop dragging)
  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };
  
  // Handle click on the container
  const handleContainerClick = (e: React.MouseEvent) => {
    if (containerRef.current) {
      updateSliderPosition(e.clientX);
    }
  };
  
  // Update slider position based on mouse x position
  const updateSliderPosition = (clientX: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    const relativeX = clientX - rect.left;
    const percentage = (relativeX / containerWidth) * 100;
    
    // Clamp between 0 and 100
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };
  
  // Add and remove event listeners for drag behavior
  useEffect(() => {
    const handleMouseMoveEvent = (e: MouseEvent) => handleMouseMove(e);
    const handleMouseUpEvent = () => handleMouseUp();
    
    document.addEventListener('mousemove', handleMouseMoveEvent);
    document.addEventListener('mouseup', handleMouseUpEvent);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMoveEvent);
      document.removeEventListener('mouseup', handleMouseUpEvent);
    };
  }, []);
  
  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className="relative w-full h-[400px] overflow-hidden rounded-lg cursor-pointer"
        onClick={handleContainerClick}
      >
        {/* After image (visible when slider is moved left) */}
        <img
          src={afterImage}
          alt={afterAlt}
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Before image (visible based on slider position) */}
        <div 
          className="absolute top-0 left-0 bottom-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={beforeImage}
            alt={beforeAlt}
            className="absolute top-0 left-0 w-full h-full object-cover"
            style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%' }}
          />
        </div>
        
        {/* Slider divider and handle */}
        <div
          className="absolute top-0 bottom-0 z-10 cursor-ew-resize"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
          onMouseDown={handleMouseDown}
        >
          {/* Divider line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-gold shadow-[0_0_8px_rgba(0,0,0,0.5)] transform -translate-x-1/2" />
          
          {/* Handle */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 bg-gold rounded-full shadow-lg border-2 border-white">
            <ArrowLeftRight className="h-5 w-5 text-black" />
          </div>
        </div>
        
        {/* Labels */}
        <div className="absolute bottom-4 left-4 bg-black/80 text-offwhite px-3 py-1.5 rounded text-sm z-20 pointer-events-none border-l-2 border-gold">
          {beforeAlt}
        </div>
        <div className="absolute bottom-4 right-4 bg-black/80 text-offwhite px-3 py-1.5 rounded text-sm z-20 pointer-events-none border-r-2 border-gold">
          {afterAlt}
        </div>
      </div>
    </div>
  );
}

export default ImageComparisonSlider;
