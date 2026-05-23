import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { IndustryTile } from "@shared/schema";
import droneIcon from "@assets/Icon_75_px_1767372891757.png";

export function IndustryTiles() {
  const { data: tiles = [], isLoading } = useQuery<IndustryTile[]>({
    queryKey: ["/api/industry-tiles"],
  });

  if (isLoading) {
    return (
      <section className="py-20 bg-[#0b111f]">
        <div className="container mx-auto px-4 max-w-6xl flex justify-center">
          <Loader2 className="h-8 w-8 text-gold animate-spin" />
        </div>
      </section>
    );
  }

  if (tiles.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-[#0b111f]">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gold-gradient">
            How Can We Help You?
          </h2>
          <p className="text-white text-lg max-w-2xl mx-auto">
            Select a service category to explore drone solutions tailored to your specific needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiles.map((tile) => (
            <Link
              key={tile.id}
              href={tile.targetPath}
              data-testid={`link-industry-${tile.slug}`}
              className="block h-full"
            >
              <Card
                className="interactive-card bg-[#132642] rounded-lg h-full flex flex-col group"
                data-testid={`tile-industry-${tile.slug}`}
              >
                <div className="h-48 overflow-hidden relative rounded-t-lg flex-shrink-0">
                  <img
                    src={tile.imageUrl || "https://images.pexels.com/photos/1034812/pexels-photo-1034812.jpeg?auto=compress&cs=tinysrgb&w=800"}
                    alt={tile.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.backgroundColor = '#080d17';
                      target.src = "https://images.pexels.com/photos/1034812/pexels-photo-1034812.jpeg?auto=compress&cs=tinysrgb&w=800";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b111f]/80 to-transparent opacity-60"></div>
                  {tile.category && (
                    <span className="absolute bottom-3 left-3 inline-block bg-[#132642] px-2.5 py-1 rounded border border-gold/40 group-hover:border-gold group-hover:shadow-[0_0_10px_rgba(199,174,106,0.45)] transition-all duration-300">
                      <span className="text-xs text-gold-gradient font-semibold font-montserrat uppercase">
                        {tile.category}
                      </span>
                    </span>
                  )}
                </div>
                <CardContent className="p-6 flex flex-col flex-grow">
                  <div className="flex-grow">
                    <h3 className="text-xl font-semibold font-montserrat text-gold-gradient group-hover:text-gold-light transition-colors duration-300 mt-2 mb-3">
                      {tile.title}
                    </h3>
                    <p className="text-gold-gradient text-sm">{tile.subtitle}</p>

                    {tile.examples && tile.examples.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-gold-gradient text-sm font-semibold mb-3 text-center">Examples</h4>
                        <div className="flex gap-x-6">
                        <ul className="flex-1 space-y-1.5">
                          {tile.examples.slice(0, Math.ceil(tile.examples.length / 2)).map((example, index) => (
                            <li key={index} className="text-gold-gradient text-xs flex">
                              <span className="mr-1.5 shrink-0">•</span>
                              <span>{example}</span>
                            </li>
                          ))}
                        </ul>
                        <ul className="flex-1 space-y-1.5">
                          {tile.examples.slice(Math.ceil(tile.examples.length / 2)).map((example, index) => (
                            <li key={index} className="text-gold-gradient text-xs flex">
                              <span className="mr-1.5 shrink-0">•</span>
                              <span>{example}</span>
                            </li>
                          ))}
                        </ul>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center pt-4 mt-4 border-t border-gold-dark/20 flex-shrink-0">
                    <img src={droneIcon} alt="" className="h-[38px] w-[38px]" />
                    <span className="text-gold-gradient text-sm flex items-center group-hover:text-gold group-hover:underline">
                      Learn More
                      <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/services">
            <Button 
              variant="outline" 
              className="border-2 border-gold text-offwhite hover:bg-gold-light hover:text-gold-gradient transition-all"
              data-testid="button-view-all-services"
            >
              View All Services
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default IndustryTiles;
