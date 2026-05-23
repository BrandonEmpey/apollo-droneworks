import { Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

// Replace VIDEO_ID with your YouTube video ID, e.g. "dQw4w9WgXcQ"
const YOUTUBE_VIDEO_ID = "";

export function VideoShowcaseSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="py-20 bg-gradient-to-b from-[#080d17] to-[#0b111f]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold font-montserrat text-gold-gradient mb-4">
            See Our Work in Action
          </h2>
          <p className="text-offwhite/70 max-w-2xl mx-auto text-lg">
            Professional aerial cinematography and mapping for real estate, construction, and events across Southern Utah.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-xl overflow-hidden border border-gold-dark/30 shadow-2xl shadow-black/50 aspect-video bg-[#0b111f]">
            {YOUTUBE_VIDEO_ID && playing ? (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1`}
                title="Apollo DroneWorks showreel"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                {/* Poster / placeholder */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0b111f] via-[#132642] to-[#080d17]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                  <div className="text-center px-4">
                    <p className="text-offwhite/40 text-sm uppercase tracking-widest mb-2">Apollo DroneWorks</p>
                    <p className="text-offwhite/60 text-lg">Showreel — Southern Utah Aerial Services</p>
                  </div>
                  {YOUTUBE_VIDEO_ID ? (
                    <button
                      onClick={() => setPlaying(true)}
                      className="w-20 h-20 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center hover:bg-gold/30 transition-all hover:scale-105"
                      aria-label="Play video"
                    >
                      <Play className="h-8 w-8 text-gold fill-gold ml-1" />
                    </button>
                  ) : (
                    <div className="text-center">
                      <p className="text-offwhite/40 text-sm mb-4">Video coming soon</p>
                      <Link href="/gallery">
                        <Button variant="outline" className="border-gold/40 text-gold hover:bg-gold/10">
                          View Our Gallery Instead
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex justify-center mt-8 gap-4">
            <Link href="/gallery">
              <Button variant="outline" className="border-gold/40 text-offwhite hover:bg-gold/10">
                Browse Gallery
              </Button>
            </Link>
            <Link href="/booking">
              <Button className="bg-gold text-black hover:bg-gold-light font-semibold">
                Book a Flight
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
