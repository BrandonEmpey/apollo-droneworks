import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ServicesSection from "@/components/services-section";

export default function ServicesPage() {
  return (
    <>
      <Helmet>
        <title>Our Services | Apollo DroneWorks</title>
        <meta name="description" content="Explore our full range of professional drone services including real estate photography, aerial videography, photogrammetry, construction monitoring, and more." />
      </Helmet>
      
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        <main className="flex-grow">
          <section className="relative overflow-hidden pt-24" style={{ minHeight: '340px' }}>
            <img
              src="/uploads/about/aerial-southern-utah.png"
              alt="Aerial drone-view of Southern Utah red rock canyon landscape"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-[#0b111f]" />
            <div className="relative z-10 container mx-auto px-4 py-20 text-center">
              <h1 className="text-4xl md:text-5xl font-bold font-montserrat text-gold-gradient mb-4">
                Our Services
              </h1>
              <p className="text-offwhite/90 max-w-3xl mx-auto text-lg">
                At Apollo DroneWorks, we offer a comprehensive range of drone services tailored to meet your specific needs.
                From precision mapping and construction progress monitoring to gorgeous real estate photography and videography.
              </p>
            </div>
          </section>
          <ServicesSection />
        </main>
        <Footer />
      </div>
    </>
  );
}