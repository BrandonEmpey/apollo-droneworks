import { Helmet } from "react-helmet-async";
import { SITE_URL, OG_IMAGE, BUSINESS_NAME } from "@/lib/structured-data";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, CheckCircle, DollarSign, Award, Users, Camera, MapPin } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0b111f]">
      <Helmet>
        <title>About Apollo DroneWorks | Southern Utah Drone Services</title>
        <meta name="description" content="Learn about Apollo DroneWorks — Southern Utah's professional drone services company specializing in aerial photography, videography, photogrammetry, and 3D mapping." />
        <link rel="canonical" href={`${SITE_URL}/about`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={BUSINESS_NAME} />
        <meta property="og:title" content="About Apollo DroneWorks | Southern Utah Drone Services" />
        <meta property="og:description" content="Southern Utah's professional drone services company — aerial photography, videography, photogrammetry, and 3D mapping for real estate, construction, and commercial clients." />
        <meta property="og:url" content={`${SITE_URL}/about`} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <Header />

      <main className="flex-1 pt-24">
        {/* Hero Section */}
        <section className="relative overflow-hidden" style={{ minHeight: '340px' }}>
          <img
            src="/uploads/about/aerial-southern-utah.png"
            alt="Aerial drone-view of Southern Utah red rock canyon landscape"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-[#0b111f]" />
          <div className="relative z-10 container mx-auto px-4 py-24">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gold-gradient">
                About Apollo DroneWorks
              </h1>
              <p className="text-offwhite/90 text-xl max-w-3xl mx-auto">
                Pioneering professional drone services with cutting-edge technology and unparalleled expertise
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 bg-[#080d17]">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6 text-gold-gradient">
                  Our Mission
                </h2>
                <p className="text-offwhite/80 mb-6">
                  Apollo DroneWorks delivers cutting-edge drone services tailored to construction companies and real estate agents. Providing high-resolution aerial images and actionable insights to streamline projects, boost efficiency and showcase the final product.
                </p>
                <p className="text-offwhite/80 mb-6">
                  Using state-of-the-art drones, advanced mapping software and Artificial Intelligence, we offer precise, safe, and cost-effective solutions for site analysis, progress tracking, and asset documentation.
                </p>
                <p className="text-offwhite/80">
                  From real estate photography to detailed 3D modeling, our services empower clients to make informed decisions, reduce costs, and enhance project outcomes.
                </p>
              </div>
              <div>
                <div className="rounded-lg overflow-hidden shadow-xl bg-[#132642] p-1">
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <img 
                      src="/uploads/about/aerial-southern-utah.png" 
                      alt="Aerial drone-view of Southern Utah red rock landscape" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-gold-gradient">
                Our Values
              </h2>
              <p className="text-offwhite/80 max-w-2xl mx-auto">
                At Apollo DroneWorks, we're committed to delivering exceptional aerial solutions while maintaining the highest standards of professionalism and integrity.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-[#132642] rounded-lg p-6 shadow-md border border-gold-dark/10 hover:border-gold-dark/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-[#c9a227] to-[#8a6d14] rounded-full flex items-center justify-center mb-4">
                  <Camera className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-offwhite">Excellence</h3>
                <p className="text-offwhite/70">
                  We strive for excellence in every aspect of our work, from the quality of our imagery to the precision of our data collection and the responsiveness of our customer service.
                </p>
              </div>
              
              <div className="bg-[#132642] rounded-lg p-6 shadow-md border border-gold-dark/10 hover:border-gold-dark/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-[#c9a227] to-[#8a6d14] rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-offwhite">Innovation</h3>
                <p className="text-offwhite/70">
                  We continuously explore new technologies and techniques to expand our capabilities and provide innovative solutions that exceed client expectations.
                </p>
              </div>
              
              <div className="bg-[#132642] rounded-lg p-6 shadow-md border border-gold-dark/10 hover:border-gold-dark/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-[#c9a227] to-[#8a6d14] rounded-full flex items-center justify-center mb-4">
                  <Award className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-offwhite">Integrity</h3>
                <p className="text-offwhite/70">
                  We conduct business with the highest level of ethics and transparency, building trust with our clients through honest communication and reliable service.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Certifications Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-gold-gradient">
                Our Certifications & Compliance
              </h2>
              <p className="text-offwhite/80 max-w-2xl mx-auto">
                All Apollo DroneWorks operations comply with FAA regulations and industry best practices to ensure safe, legal, and professional service.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-gradient-to-br from-[#c9a227] to-[#8a6d14] rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                  <CheckCircle className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-offwhite">FAA Part 107 Certification</h3>
                  <p className="text-offwhite/70">
                    All our pilots are FAA Part 107 certified commercial drone operators, ensuring legal compliance and operational knowledge.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-8 h-8 bg-gradient-to-br from-[#c9a227] to-[#8a6d14] rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                  <CheckCircle className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-offwhite">Liability Insurance</h3>
                  <p className="text-offwhite/70">
                    Comprehensive liability insurance coverage for all operations, providing peace of mind for our clients.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-8 h-8 bg-gradient-to-br from-[#c9a227] to-[#8a6d14] rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                  <CheckCircle className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-offwhite">Airspace Authorization</h3>
                  <p className="text-offwhite/70">
                    LAANC (Low Altitude Authorization and Notification Capability) certified for operations in controlled airspace.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-8 h-8 bg-gradient-to-br from-[#c9a227] to-[#8a6d14] rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                  <CheckCircle className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-offwhite">Professional Equipment</h3>
                  <p className="text-offwhite/70">
                    Fleet of professional-grade drones with redundant safety systems and high-resolution cameras.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 bg-gradient-to-b from-[#132642] to-[#0b111f]">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6 text-gold-gradient">
              Ready to Work With Us?
            </h2>
            <p className="text-offwhite/80 mb-8 max-w-2xl mx-auto">
              Whether you need stunning aerial photography for real estate, precise mapping for construction, or custom drone services, Apollo DroneWorks is here to help.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/contact">
                <Button 
                  size="lg" 
                  className="bg-gold text-black hover:bg-gold-light"
                  onClick={() => window.scrollTo(0, 0)}
                >
                  Contact Us <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/services">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-gold-dark/40 text-offwhite hover:bg-[#132642]"
                  onClick={() => window.scrollTo(0, 0)}
                >
                  Explore Our Services
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