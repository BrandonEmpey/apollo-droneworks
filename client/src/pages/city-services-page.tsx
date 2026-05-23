import { Helmet } from "react-helmet-async";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { ServiceCard } from "@/components/ui/service-card";
import { TrustBar } from "@/components/trust-bar";
import { MapPin, ArrowRight, CheckCircle } from "lucide-react";
import { Service } from "@shared/schema";

const CITY_DATA: Record<string, {
  name: string;
  state: string;
  region: string;
  description: string;
  highlights: string[];
  nearbyAirspace: string;
}> = {
  "st-george": {
    name: "St. George",
    state: "UT",
    region: "Washington County",
    description: "St. George's booming real estate market and year-round sunshine make it one of the most active markets for aerial photography in Southern Utah.",
    highlights: [
      "Real estate listings sold faster with professional drone photography",
      "Construction progress monitoring for the region's rapid development",
      "Stunning red rock canyon backdrops for luxury property showcases",
      "Event coverage for golf tournaments, festivals, and sporting events",
    ],
    nearbyAirspace: "Located near St. George Regional Airport (SGU) — all flights coordinated via LAANC authorization.",
  },
  "cedar-city": {
    name: "Cedar City",
    state: "UT",
    region: "Iron County",
    description: "Cedar City's mix of residential growth, agricultural land, and proximity to Cedar Breaks National Monument creates unique opportunities for aerial work.",
    highlights: [
      "Agricultural mapping and crop health monitoring",
      "Real estate photography for Cedar City's expanding market",
      "Infrastructure inspection for roads and utilities",
      "Tourism and hospitality promotion for Shakespeare Festival season",
    ],
    nearbyAirspace: "Cedar City Regional Airport (CDC) operations coordinated with FAA LAANC system.",
  },
  "washington-city": {
    name: "Washington City",
    state: "UT",
    region: "Washington County",
    description: "One of Utah's fastest-growing communities, Washington City offers abundant real estate and construction opportunities for aerial documentation.",
    highlights: [
      "New home construction progress documentation",
      "Subdivision and master-planned community aerials",
      "Commercial development site surveys",
      "Luxury real estate marketing photography",
    ],
    nearbyAirspace: "Coordinated airspace operations within the St. George metropolitan area.",
  },
  "hurricane": {
    name: "Hurricane",
    state: "UT",
    region: "Washington County",
    description: "Gateway to Zion National Park and Snow Canyon, Hurricane offers dramatic landscapes for real estate showcases and unique commercial shoots.",
    highlights: [
      "Properties near Zion Canyon captured with stunning aerial context",
      "Vacation rental and Airbnb listing photography",
      "Land and lot surveys for development projects",
      "Tourism destination photography and videography",
    ],
    nearbyAirspace: "Uncontrolled airspace — full operational flexibility with FAA registration compliance.",
  },
  "ivins": {
    name: "Ivins",
    state: "UT",
    region: "Washington County",
    description: "Home to Tuacahn Amphitheatre and the Snow Canyon State Park, Ivins combines luxury desert living with breathtaking scenery.",
    highlights: [
      "Luxury resort and high-end real estate aerials",
      "Snow Canyon State Park proximity — stunning red rock backdrops",
      "Event documentation at Tuacahn and private venues",
      "Custom architectural photography for custom home builders",
    ],
    nearbyAirspace: "Snow Canyon airspace operations conducted under strict FAA guidelines.",
  },
  "santa-clara": {
    name: "Santa Clara",
    state: "UT",
    region: "Washington County",
    description: "Nestled against the Virgin River, Santa Clara's historic character and modern development blend make it a distinctive aerial photography market.",
    highlights: [
      "Historic property documentation and architectural aerials",
      "River and natural feature property showcases",
      "Residential real estate marketing for the growing community",
      "City planning and infrastructure documentation",
    ],
    nearbyAirspace: "Operations coordinated within greater St. George Class D airspace.",
  },
};

export default function CityServicesPage() {
  const [, params] = useRoute("/services/area/:city");
  const citySlug = params?.city ?? "";
  const city = CITY_DATA[citySlug];

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  if (!city) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0b111f]">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-24">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-offwhite mb-4">Location Not Found</h1>
            <Link href="/contact">
              <Button className="bg-gold text-black hover:bg-gold-light">Contact Us About Your Area</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const visibleServices = services?.filter(s => s.isActive !== false).slice(0, 6) ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-[#0b111f]">
      <Helmet>
        <title>Drone Services in {city.name}, {city.state} | Apollo DroneWorks</title>
        <meta
          name="description"
          content={`Professional drone photography, videography, and mapping services in ${city.name}, ${city.state}. FAA Part 107 certified. ${city.description}`}
        />
        <meta name="keywords" content={`drone photography ${city.name}, aerial photography ${city.name} ${city.state}, drone services ${city.region}, FAA Part 107 ${city.name}`} />
      </Helmet>

      <Header />

      <main className="flex-1 pt-24">
        {/* Hero */}
        <section className="relative bg-gradient-to-b from-[#080d17] to-[#0b111f] py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="flex items-center justify-center gap-2 text-gold/70 text-sm mb-4">
              <MapPin className="h-4 w-4" />
              <span>{city.region}, Utah</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-montserrat text-gold-gradient mb-6">
              Drone Services in {city.name}, {city.state}
            </h1>
            <p className="text-offwhite/80 text-lg max-w-2xl mx-auto mb-8">
              {city.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/booking">
                <Button className="bg-gold text-black hover:bg-gold-light font-semibold px-8">
                  Book a Flight in {city.name} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/quote">
                <Button variant="outline" className="border-gold/40 text-offwhite hover:bg-gold/10">
                  Get a Free Quote
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <TrustBar />

        {/* Local highlights */}
        <section className="py-16 bg-[#080d17]">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-gold-gradient mb-8 text-center">
              Why {city.name} Businesses Choose Apollo DroneWorks
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {city.highlights.map((h) => (
                <div key={h} className="flex items-start gap-3 bg-[#132642] rounded-lg p-4 border border-gold-dark/20">
                  <CheckCircle className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                  <p className="text-offwhite/80 text-sm">{h}</p>
                </div>
              ))}
            </div>
            <p className="text-offwhite/50 text-sm mt-6 text-center">{city.nearbyAirspace}</p>
          </div>
        </section>

        {/* Services grid */}
        {visibleServices.length > 0 && (
          <section className="py-16 px-4">
            <div className="container mx-auto max-w-6xl">
              <h2 className="text-2xl font-bold text-gold-gradient mb-8 text-center">
                Available Services in {city.name}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-16 px-4 bg-gradient-to-b from-[#132642] to-[#0b111f]">
          <div className="container mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-gold-gradient mb-4">
              Ready to Book in {city.name}?
            </h2>
            <p className="text-offwhite/70 mb-8">
              Serving {city.name} and all of {city.region}. Same-week availability for most services.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/booking">
                <Button className="bg-gold text-black hover:bg-gold-light font-semibold px-8">
                  Book Now
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="border-gold/40 text-offwhite hover:bg-gold/10">
                  Ask a Question
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
