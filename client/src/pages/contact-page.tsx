import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { ContactForm } from "@/components/contact-form";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";

export default function ContactPage() {
  return (
    <>
      <Helmet>
        <title>Contact Us | Apollo DroneWorks</title>
        <meta name="description" content="Get in touch with Apollo DroneWorks for drone photography, videography and photogrammetry services. Contact us for bookings, inquiries, or custom project requests." />
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
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-montserrat text-gold-gradient mb-4">
                Contact Apollo DroneWorks
              </h1>
              <p className="text-offwhite/90 max-w-2xl mx-auto text-lg">
                Have questions or need to discuss a custom project? We're here to help with all your drone service needs.
              </p>
            </div>
          </section>

        <div className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
              <div className="lg:col-span-2">
                <ContactForm />
              </div>
              
              <div className="flex flex-col space-y-6">
                <div className="bg-[#132642] border border-gold-dark/30 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-gold mb-4">Contact Information</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="mt-1 mr-3 bg-gold/10 p-2 rounded-full">
                        <MapPin className="h-5 w-5 text-gold" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-offwhite">Our Location</h3>
                        <p className="text-sm text-offwhite/70 mt-1">
                          1234 Skyview Drive<br />
                          Seattle, WA 98101<br />
                          United States
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="mt-1 mr-3 bg-gold/10 p-2 rounded-full">
                        <Phone className="h-5 w-5 text-gold" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-offwhite">Phone</h3>
                        <p className="text-sm text-offwhite/70 mt-1">
                          (206) 555-0123
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="mt-1 mr-3 bg-gold/10 p-2 rounded-full">
                        <Mail className="h-5 w-5 text-gold" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-offwhite">Email</h3>
                        <p className="text-sm text-offwhite/70 mt-1">
                          info@apollodronesinc.com
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="mt-1 mr-3 bg-gold/10 p-2 rounded-full">
                        <Clock className="h-5 w-5 text-gold" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-offwhite">Hours</h3>
                        <p className="text-sm text-offwhite/70 mt-1">
                          Monday - Friday: 9AM - 6PM<br />
                          Saturday: 10AM - 4PM<br />
                          Sunday: Closed
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#132642] border border-gold-dark/30 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-gold mb-4">Quick Response</h2>
                  <p className="text-sm text-offwhite/80">
                    We aim to respond to all inquiries within 24 hours during business days. For urgent matters, please call our office directly.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Service Area Map */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gold-gradient mb-2">Our Service Area</h2>
              <p className="text-offwhite/70 mb-4">We serve Southern Utah and surrounding areas. Contact us to confirm coverage for your location.</p>
            </div>
            <div className="rounded-lg overflow-hidden border border-gold-dark/30 h-[400px] mb-16">
              <MapContainer
                center={[37.1041, -113.5841]}
                zoom={9}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Circle
                  center={[37.1041, -113.5841]}
                  radius={80000}
                  pathOptions={{ color: "#C7AE6A", fillColor: "#C7AE6A", fillOpacity: 0.15, weight: 2 }}
                >
                  <Popup>
                    <div style={{ textAlign: "center", padding: "4px" }}>
                      <strong>Apollo DroneWorks</strong><br />
                      Serving Southern Utah<br />
                      <a href="tel:+1-435-000-0000">Call for availability</a>
                    </div>
                  </Popup>
                </Circle>
              </MapContainer>
            </div>
          </div>
        </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}