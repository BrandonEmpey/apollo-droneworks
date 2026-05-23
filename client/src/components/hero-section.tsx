import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { EmblaOptionsType } from "embla-carousel";
import type { HeroSlide } from "@shared/schema";
import heroRedRockCanyon from "@assets/generated_images/hero_red_rock_canyon.png";
import heroLuxuryEstate from "@assets/generated_images/hero_luxury_estate.png";
import heroConstructionSite from "@assets/generated_images/hero_construction_site.png";

// Fallback Southern Utah slides used only when the database has none yet.
// Once an admin saves slides via the admin UI, those persisted slides take over
// and survive clearing localStorage or switching browsers.
const FALLBACK_SLIDES: HeroSlide[] = [
  {
    id: -1,
    type: "image",
    title: "Southern Utah Red Rock Canyon at Golden Hour",
    url: heroRedRockCanyon,
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: -2,
    type: "image",
    title: "Luxury Desert Estate from Above",
    url: heroLuxuryEstate,
    displayOrder: 2,
    isActive: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: -3,
    type: "image",
    title: "Active Commercial Construction Site",
    url: heroConstructionSite,
    displayOrder: 3,
    isActive: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
];

const OPTIONS: EmblaOptionsType = {
  loop: true,
};

export function HeroSection() {
  const { data: slidesData } = useQuery<HeroSlide[]>({
    queryKey: ["/api/hero-slides"],
  });

  const slides: HeroSlide[] = slidesData && slidesData.length > 0 ? slidesData : FALLBACK_SLIDES;

  const [emblaRef, emblaApi] = useEmblaCarousel(OPTIONS);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const [selectedSlide, setSelectedSlide] = useState(0);
  const [showControls, setShowControls] = useState(false);

  // Handle slide change — manage video playback and update selected slide
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const currentSlide = emblaApi.selectedScrollSnap();
      setSelectedSlide(currentSlide);

      slides.forEach((slide, index) => {
        if (slide.type === "video" && videoRefs.current[slide.id]) {
          const video = videoRefs.current[slide.id];
          if (index === currentSlide) {
            video?.play().catch((err) => {
              console.warn("Video play failed:", err);
            });
          } else {
            video?.pause();
          }
        }
      });
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, slides]);

  // Reinit embla whenever the slide set changes (e.g. after fetch resolves)
  useEffect(() => {
    if (emblaApi && slides.length > 0) {
      emblaApi.reInit();

      const firstSlide = slides[0];
      if (firstSlide.type === "video" && videoRefs.current[firstSlide.id]) {
        const video = videoRefs.current[firstSlide.id];
        video?.play().catch((err) => {
          console.warn("Initial video play failed:", err);
        });
      }
    }
  }, [emblaApi, slides]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <section
      className="relative h-[60vh] sm:h-screen overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Carousel */}
      <div className="h-full" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide) => (
            <div key={slide.id} className="flex-none w-full h-full relative">
              {slide.type === "image" ? (
                <img
                  src={slide.url}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  ref={(el) => {
                    videoRefs.current[slide.id] = el;
                  }}
                  src={slide.url}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  playsInline
                />
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black-dark to-transparent opacity-80"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Carousel navigation buttons */}
      <div className="absolute inset-x-0 top-1/2 flex justify-between px-4 sm:px-6 lg:px-8 transition-all duration-300">
        <button
          onClick={scrollPrev}
          className="carousel-nav-button bg-transparent border-2 border-gold hover:bg-black/20 hover:border-gold-light transition-all shadow-lg"
          aria-label="Previous slide"
        >
          <ChevronLeft size={24} className="text-gold" />
        </button>
        <button
          onClick={scrollNext}
          className="carousel-nav-button bg-transparent border-2 border-gold hover:bg-black/20 hover:border-gold-light transition-all shadow-lg"
          aria-label="Next slide"
        >
          <ChevronRight size={24} className="text-gold" />
        </button>
      </div>

      {/* Carousel indicators/dots */}
      <div className="absolute bottom-6 inset-x-0 flex justify-center gap-3">
        {slides.map((slide, index) => {
          const isActive = selectedSlide === index;
          return (
            <button
              key={slide.id}
              onClick={() => {
                if (emblaApi) emblaApi.scrollTo(index);
              }}
              className={`carousel-page-marker border-2 border-gold transition-all ${
                isActive
                  ? "bg-gold-gradient shadow-lg shadow-gold/50"
                  : "bg-transparent hover:bg-gold/20"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          );
        })}
      </div>
    </section>
  );
}

export default HeroSection;
