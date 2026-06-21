import { Helmet } from "react-helmet-async";
import { SITE_URL, OG_IMAGE, BUSINESS_NAME, breadcrumbSchema } from "@/lib/structured-data";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ServicesSection from "@/components/services-section";
import { TrustBar } from "@/components/trust-bar";

export default function ServicesPage() {
  return (
    <>
      <Helmet>
        <title>Drone Services in Southern Utah | Apollo DroneWorks</title>
        <meta name="description" content="Professional drone services in Southern Utah — aerial real estate photography, videography, photogrammetry, 3D mapping, and construction monitoring. Get a quote today." />
        <link rel="canonical" href={`${SITE_URL}/services`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={BUSINESS_NAME} />
        <meta property="og:title" content="Drone Services in Southern Utah | Apollo DroneWorks" />
        <meta property="og:description" content="Professional drone services — aerial photography, videography, photogrammetry and 3D mapping for real estate, construction, and commercial clients." />
        <meta property="og:url" content={`${SITE_URL}/services`} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema([{ name: "Home", item: SITE_URL }, { name: "Services", item: `${SITE_URL}/services` }]))}</script>
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
          <TrustBar />
          <ServicesSection />
        </main>
        <Footer />
      </div>
    </>
  );
}