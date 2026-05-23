import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import HeroSection from "@/components/hero-section";
import GallerySection from "@/components/gallery-section";
import BeforeAfterSection from "@/components/before-after-section";
import BookingSection from "@/components/booking-section";
import FeaturesSection from "@/components/features-section";
import TestimonialsSection from "@/components/testimonials-section";
import BlogPreviewSection from "@/components/blog-preview-section";
import ContactSection from "@/components/contact-section";
import PortfolioShowcaseSection from "@/components/portfolio-showcase-section";
import IndustryTiles from "@/components/industry-tiles";
import { TrustBar } from "@/components/trust-bar";
import { VideoShowcaseSection } from "@/components/video-showcase-section";

export default function HomePage() {
  return (
    <>
      <Helmet>
        <title>Apollo DroneWorks | Professional Drone Services</title>
        <meta name="description" content="Premium drone services including real estate photography, videography, and photogrammetry. Book your drone service today with Apollo DroneWorks." />
        <meta name="keywords" content="drone photography, aerial photography, real estate drone, photogrammetry, construction drone, 3D modeling" />
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        
        <main className="flex-grow">
          {/* Main hero for tablet/desktop */}
          <HeroSection />
          <TrustBar />

          {/* Mobile-only intro section */}
          <div className="sm:hidden py-20 px-4 bg-gradient-to-b from-[#0b111f] to-[#132642] text-center">
            <img 
              src="/apollo-logo.png" 
              alt="Apollo DroneWorks" 
              className="h-16 mx-auto mb-6"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://via.placeholder.com/200x80?text=Apollo+DroneWorks";
              }}
            />
            <h1 className="text-2xl font-bold mb-4 text-white">
              Professional Drone Services
            </h1>
            <p className="text-gray-300 mb-8">
              Premium aerial photography, videography, and photogrammetry services.
            </p>
            <div className="flex flex-col gap-4 justify-center items-center">
              <Link to="/services">
                <Button className="w-full sm:w-auto bg-gold hover:bg-gold-light text-black">
                  Our Services
                </Button>
              </Link>
              <Link to="/booking">
                <Button variant="outline" className="w-full sm:w-auto border-gold text-gold-gradient hover:bg-gold/10">
                  Book Now
                </Button>
              </Link>
            </div>
          </div>
          
          <IndustryTiles />
          <VideoShowcaseSection />
          {/* Portfolio showcase carousel removed as requested */}
          <GallerySection limit={6} />
          <BlogPreviewSection />
          <FeaturesSection />
          <BookingSection />
          {/* Testimonials temporarily hidden until real customer testimonials are added */}
          {/* <TestimonialsSection /> */}
          <ContactSection />
        </main>
        
        <Footer />
      </div>
    </>
  );
}
