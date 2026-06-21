import { Helmet } from "react-helmet-async";
import { SITE_URL } from "@/lib/structured-data";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function TermsPage() {
  return (
    <>
      <Helmet>
        <title>Terms of Service | Apollo DroneWorks</title>
        <meta name="description" content="Terms of service for Apollo DroneWorks drone photography, videography, inspection, and mapping services in Southern Utah." />
        <link rel="canonical" href={`${SITE_URL}/terms`} />
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-24 max-w-3xl">
          <h1 className="text-4xl font-bold font-montserrat text-gold-gradient mb-2">Terms of Service</h1>
          <p className="text-offwhite/50 text-sm mb-10">Last updated: June 2026</p>

          <div className="space-y-8 text-offwhite/80 leading-relaxed">

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">1. Services</h2>
              <p>Apollo DroneWorks ("we," "us," "our") provides professional drone photography, videography, aerial mapping, inspection, and related services in Southern Utah. By booking a service, you agree to these terms.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">2. Bookings and Payment</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>All bookings are confirmed upon receipt of payment.</li>
                <li>Prices are quoted in USD and are subject to change without notice until a booking is confirmed.</li>
                <li>Rush orders (less than 24 hours' notice) carry a 1.25× surcharge.</li>
                <li>Bundle discounts apply when multiple qualifying services are booked together in the same session.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">3. Cancellations and Rescheduling</h2>
              <p>Cancellations made more than 48 hours before a scheduled flight are fully refunded. Cancellations within 48 hours may be subject to a 25% cancellation fee. Weather-related cancellations are always rescheduled at no charge.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">4. Weather and Flight Conditions</h2>
              <p>All flights are subject to FAA regulations, local airspace restrictions, and safe weather conditions. We reserve the right to reschedule any mission if conditions are deemed unsafe. We will contact you as early as possible in the event of a weather cancellation.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">5. Deliverables</h2>
              <p>Edited photos and videos are delivered within the timeframe specified at booking (typically 3–5 business days for standard orders). 3D models, maps, and Digital Twin deliverables have longer processing windows — estimated delivery will be confirmed at booking.</p>
              <p className="mt-2">You receive a non-exclusive license to use deliverables for personal or commercial purposes related to your property. Resale or redistribution of raw files is not permitted without written consent.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">6. Property Access</h2>
              <p>You represent that you have the legal right to authorize drone flights over the property specified in your booking, and that you have obtained any required permissions from neighboring property owners or local authorities where necessary.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">7. FAA Compliance</h2>
              <p>All flights are operated under FAA Part 107 certification. We obtain LAANC authorizations for controlled airspace. We do not operate in violation of Temporary Flight Restrictions (TFRs) or over crowds, moving vehicles, or restricted areas.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">8. Limitation of Liability</h2>
              <p>Apollo DroneWorks is fully insured. In the unlikely event of property damage caused by our operations, our liability is limited to the value of the service booked. We are not liable for indirect or consequential damages.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">9. Governing Law</h2>
              <p>These terms are governed by the laws of the State of Utah. Any disputes shall be resolved in the courts of Washington County, Utah.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">10. Contact</h2>
              <p><strong className="text-offwhite">Apollo DroneWorks</strong><br />
              St. George, UT<br />
              <a href="mailto:apollodroneworks@icloud.com" className="text-gold hover:text-gold-light">apollodroneworks@icloud.com</a><br />
              <a href="tel:+14357035509" className="text-gold hover:text-gold-light">(435) 703-5509</a></p>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
