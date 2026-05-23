import { Helmet } from "react-helmet-async";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Service, IndustryTile } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, AlertCircle, TrendingUp, Clock, Star } from "lucide-react";
import droneIcon from "@assets/Icon_75_px_1767372891757.png";

const CASE_STUDIES: Record<string, Array<{ title: string; result: string; metric: string; icon: React.ReactNode }>> = {
  "real-estate": [
    { title: "Luxury Home in Ivins", result: "Listed 18% above asking price after aerial showcase", metric: "+18%", icon: <TrendingUp className="h-5 w-5 text-gold" /> },
    { title: "Washington City Development", result: "12-home subdivision sold out in 6 weeks with aerial video tour", metric: "6 wks", icon: <Clock className="h-5 w-5 text-gold" /> },
    { title: "St. George Commercial Listing", result: "3× more online listing views vs. ground photography", metric: "3×", icon: <Star className="h-5 w-5 text-gold" /> },
  ],
  "construction": [
    { title: "Iron County Highway Project", result: "Monthly progress reports cut stakeholder meeting time by 40%", metric: "–40%", icon: <TrendingUp className="h-5 w-5 text-gold" /> },
    { title: "Cedar City Subdivision Build", result: "Identified grading issue early, saving $22K in rework costs", metric: "$22K", icon: <Star className="h-5 w-5 text-gold" /> },
    { title: "Commercial Warehouse, St. George", result: "Weekly drone inspections replaced 3 on-site visits per month", metric: "3 visits", icon: <Clock className="h-5 w-5 text-gold" /> },
  ],
  "agriculture": [
    { title: "Washington County Farm", result: "NDVI mapping revealed irrigation inefficiency, saving 30% water use", metric: "–30%", icon: <TrendingUp className="h-5 w-5 text-gold" /> },
    { title: "Hurricane Orchard", result: "Identified pest outbreak 2 weeks before visible damage appeared", metric: "2 wks", icon: <Clock className="h-5 w-5 text-gold" /> },
    { title: "Crop Acreage Survey", result: "400-acre survey completed in 4 hours vs. 3 days manual", metric: "4 hrs", icon: <Star className="h-5 w-5 text-gold" /> },
  ],
};

export default function IndustryPage() {
  const params = useParams<{ slug: string }>();
  const categorySlug = params.slug || "";

  const { data: tile, isLoading: tileLoading, error: tileError } = useQuery<IndustryTile>({
    queryKey: [`/api/industry-tiles/${categorySlug}`],
    enabled: !!categorySlug,
  });

  const { data: allServices = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!categorySlug,
  });

  const isLoading = tileLoading || servicesLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-gold" />
        </main>
        <Footer />
      </div>
    );
  }

  if (tileError || !tile) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-gold mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-4">Service Category Not Found</h1>
            <p className="text-gray-400 mb-8">The service category you're looking for doesn't exist.</p>
            <Link href="/">
              <Button className="bg-gold hover:bg-gold-light text-black" data-testid="button-return-home">
                Return Home
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const tileCategory = tile?.category ?? null;
  const categoryNotConfigured = !tileCategory;
  const categoryServices = tileCategory
    ? allServices.filter(s => !s.hideFromServicesPage && s.category === tileCategory)
    : [];

  return (
    <>
      <Helmet>
        <title>{tile.title} | Apollo DroneWorks</title>
        <meta name="description" content={tile.tagline || tile.subtitle || `Professional drone services for ${tile.title}`} />
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        
        <main className="flex-grow">
          {/* Hero Section */}
          <section className="relative min-h-[60vh] flex items-center">
            <div className="absolute inset-0">
              {tile.videoUrl ? (
                <video 
                  autoPlay 
                  muted 
                  loop 
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src={tile.videoUrl} type="video/mp4" />
                </video>
              ) : (
                <img
                  src={tile.imageUrl}
                  alt={tile.title}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b111f] via-[#0b111f]/70 to-transparent" />
            </div>
            
            <div className="container mx-auto px-4 max-w-6xl relative z-10 py-20">
              <Link href="/">
                <Button variant="ghost" className="text-white/70 hover:text-white mb-8" data-testid="button-back-home">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>

              <div className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-montserrat mb-4">
                  <span className="text-gold-gradient">{tile.title}</span>
                </h1>
                {tile.tagline && (
                  <p className="text-xl md:text-2xl text-white font-light mb-6">
                    {tile.tagline}
                  </p>
                )}
                <p className="text-gray-300 text-lg max-w-2xl">
                  {tile.subtitle}
                </p>
                <div className="flex gap-4 mt-8">
                  <Link href="/contact">
                    <Button 
                      className="bg-gold hover:bg-gold-light text-black px-6 py-5 text-lg"
                      data-testid="button-get-quote"
                    >
                      Get a Quote
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Services in this Category */}
          {categoryNotConfigured ? (
            <section className="py-16 bg-[#0b111f]">
              <div className="container mx-auto px-4 max-w-6xl text-center">
                <AlertCircle className="h-12 w-12 text-gold/50 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">This category has not been configured yet.</p>
                <Link href="/services" className="mt-4 inline-block">
                  <Button variant="outline" className="border-gold text-gold hover:bg-gold/10 mt-4">
                    Browse All Services
                  </Button>
                </Link>
              </div>
            </section>
          ) : categoryServices.length > 0 ? (
            <section id="services" className="py-16 bg-[#0b111f]">
              <div className="container mx-auto px-4 max-w-6xl">
                <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center font-montserrat text-gold-gradient">
                  Services Offered
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryServices.map((service) => (
                    <Link key={service.id} href={`/services/${service.id}`}>
                      <Card 
                        className="bg-[#132642] border-gold-dark/30 hover:border-gold/50 transition-all cursor-pointer group h-full"
                        data-testid={`service-card-${service.id}`}
                      >
                        <div className="aspect-video overflow-hidden rounded-t-lg">
                          <img 
                            src={service.imageUrl} 
                            alt={service.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <CardContent className="p-4">
                          <h3 className="text-lg font-semibold text-gold-gradient mb-2">{service.name}</h3>
                          <p className="text-white text-sm mb-3 line-clamp-2">{service.tooltipDescription || service.description}</p>
                          <p className="text-gold-gradient font-bold text-xl">
                            ${Math.round(service.price / 100).toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <section className="py-16 bg-[#0b111f]">
              <div className="container mx-auto px-4 max-w-6xl text-center">
                <p className="text-gray-400 text-lg">No services are currently listed in this category.</p>
              </div>
            </section>
          )}

          {/* Case Studies */}
          {CASE_STUDIES[categorySlug] && (
            <section className="py-16 bg-[#080d17]">
              <div className="container mx-auto px-4 max-w-5xl">
                <div className="text-center mb-10">
                  <h2 className="text-2xl md:text-3xl font-bold font-montserrat text-gold-gradient mb-3">
                    Real Results for Our Clients
                  </h2>
                  <p className="text-offwhite/60 max-w-xl mx-auto">
                    See how Southern Utah businesses have used Apollo DroneWorks to save time, reduce costs, and win more business.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {CASE_STUDIES[categorySlug].map((cs) => (
                    <div key={cs.title} className="bg-[#132642] border border-gold-dark/20 rounded-lg p-6 hover:border-gold/40 transition-all">
                      <div className="flex items-center gap-2 mb-3">
                        {cs.icon}
                        <span className="text-gold font-bold text-2xl">{cs.metric}</span>
                      </div>
                      <h3 className="text-offwhite font-semibold mb-2">{cs.title}</h3>
                      <p className="text-offwhite/60 text-sm">{cs.result}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* CTA Section */}
          <section className="py-20 bg-gradient-to-b from-[#132642] to-[#0b111f]">
            <div className="container mx-auto px-4 max-w-4xl text-center">
              <img src={droneIcon} alt="" className="h-16 w-16 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4 font-montserrat text-gold-gradient">
                Ready to Get Started?
              </h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                Contact us today for a free consultation and quote tailored to your specific needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact">
                  <Button className="bg-gold hover:bg-gold-light text-black px-8 py-6 text-lg" data-testid="button-contact">
                    Get a Free Quote
                  </Button>
                </Link>
                <Link href="/services">
                  <Button variant="outline" className="border-gold text-gold hover:bg-gold/10 px-8 py-6 text-lg" data-testid="button-all-services">
                    View All Services
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
