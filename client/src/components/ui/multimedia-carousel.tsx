import React, { useState, useCallback, useEffect, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaOptionsType } from 'embla-carousel';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type MediaItem = {
  type: 'image' | 'video';
  src: string;
  alt?: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  category?: string;
};

type MultimediaCarouselProps = {
  slides: MediaItem[];
  options?: EmblaOptionsType;
  className?: string;
  showDots?: boolean;
  showArrows?: boolean;
  showNavigation?: boolean;
  autoPlay?: boolean;
  delayInMs?: number;
  loop?: boolean;
};

export const MultimediaCarousel: React.FC<MultimediaCarouselProps> = ({
  slides,
  options = { loop: true },
  className = '',
  showDots = true,
  showArrows = true,
  showNavigation = false,
  autoPlay = false,
  delayInMs = 5000,
  loop = true,
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ ...options, loop });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Initialize video refs
  useEffect(() => {
    videoRefs.current = slides.map((_, i) => videoRefs.current[i] ?? null);
  }, [slides]);

  // Get scroll snaps and track selected index
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    
    // Pause all videos
    videoRefs.current.forEach((videoRef, index) => {
      if (videoRef && index !== emblaApi.selectedScrollSnap()) {
        videoRef.pause();
      }
    });
    
    // Play the current video
    const currentVideo = videoRefs.current[emblaApi.selectedScrollSnap()];
    if (currentVideo) {
      currentVideo.currentTime = 0;
      currentVideo.play().catch(err => {
        console.warn('Video play failed:', err);
      });
    }
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Handle autoplay
  useEffect(() => {
    if (autoPlay && emblaApi) {
      const autoplayHandler = () => {
        if (!emblaApi) return;
        
        // Pause the current video
        const currentVideo = videoRefs.current[emblaApi.selectedScrollSnap()];
        if (currentVideo) {
          currentVideo.pause();
        }
        
        emblaApi.scrollNext();
      };

      const timer = setTimeout(autoplayHandler, delayInMs);
      autoplayTimerRef.current = timer;

      return () => {
        if (autoplayTimerRef.current) {
          clearTimeout(autoplayTimerRef.current);
        }
      };
    }
  }, [autoPlay, emblaApi, selectedIndex, delayInMs]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  return (
    <div className={`relative ${className}`}>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, index) => (
            <div
              className="relative flex-[0_0_100%] min-w-0"
              key={`${slide.src}-${index}`}
            >
              <div className="relative h-full">
                {slide.type === 'image' ? (
                  <img
                    src={slide.src}
                    alt={slide.alt || `Slide ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={slide.src}
                    ref={(el) => (videoRefs.current[index] = el)}
                    controls={false}
                    muted
                    playsInline
                    loop
                    className="w-full h-full object-cover"
                    onEnded={() => {
                      if (emblaApi) emblaApi.scrollNext();
                    }}
                  />
                )}
                
                {/* Caption overlay */}
                {(slide.title || slide.description) && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 text-white">
                    {slide.title && (
                      <h3 className="text-xl md:text-2xl font-semibold gold-text mb-1">{slide.title}</h3>
                    )}
                    {slide.description && (
                      <p className="text-sm md:text-base text-white/90">{slide.description}</p>
                    )}
                    {slide.category && (
                      <span className="inline-block mt-2 px-2 py-1 bg-gold/80 text-black text-xs rounded-full">
                        {slide.category}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showArrows && (
        <>
          <Button
            onClick={scrollPrev}
            variant="outline"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white border-none rounded-full z-10 hover:bg-black/70"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            onClick={scrollNext}
            variant="outline"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white border-none rounded-full z-10 hover:bg-black/70"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {showDots && (
        <div className="flex justify-center gap-2 mt-4">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === selectedIndex
                  ? 'bg-gold scale-110'
                  : 'bg-gray-400/50 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
      
      {showNavigation && (
        <div className="flex justify-center gap-4 mt-6">
          <div className="flex items-center gap-2 bg-black/70 px-4 py-2 rounded-full">
            <span className="text-white text-sm">{selectedIndex + 1} / {slides.length}</span>
            
            <div className="flex gap-2 ml-2">
              {slides.map((slide, index) => (
                <button
                  key={index}
                  onClick={() => scrollTo(index)}
                  className={`relative group`}
                  aria-label={`Go to slide ${index + 1}`}
                >
                  <div 
                    className={`w-8 h-8 flex items-center justify-center rounded-md transition-all
                      ${index === selectedIndex 
                        ? 'bg-gold/70 text-black' 
                        : 'bg-gray-700/70 text-white hover:bg-gray-600/70'
                      }`}
                  >
                    {index + 1}
                  </div>
                  {slide.title && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[150px] 
                      bg-black/90 text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {slide.title}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultimediaCarousel;