import { Helmet } from "react-helmet-async";
import { SITE_URL, BUSINESS_NAME } from "@/lib/structured-data";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | Apollo DroneWorks</title>
        <meta name="description" content="Privacy policy for Apollo DroneWorks — how we collect, use, and protect your personal information." />
        <link rel="canonical" href={`${SITE_URL}/privacy`} />
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-24 max-w-3xl">
          <h1 className="text-4xl font-bold font-montserrat text-gold-gradient mb-2">Privacy Policy</h1>
          <p className="text-offwhite/50 text-sm mb-10">Last updated: June 2026</p>

          <div className="prose prose-invert prose-gold max-w-none space-y-8 text-offwhite/80 leading-relaxed">

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">1. Information We Collect</h2>
              <p>When you book a service, create an account, or contact us, we collect information you provide directly — including your name, email address, phone number, property address, and payment details.</p>
              <p className="mt-2">We also collect limited technical data (browser type, pages visited, IP address) via standard web server logs to help us improve the site.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">2. How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>To schedule, coordinate, and deliver your drone service</li>
                <li>To process payments securely through Stripe</li>
                <li>To send booking confirmations, reminders, and receipts</li>
                <li>To respond to inquiries and provide customer support</li>
                <li>To improve our services and website experience</li>
              </ul>
              <p className="mt-2">We do not sell or rent your personal information to third parties.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">3. Payment Information</h2>
              <p>All payment processing is handled by <strong>Stripe</strong>, a PCI-compliant payment processor. Apollo DroneWorks does not store your full card number, CVV, or billing details on our servers. Stripe's privacy policy applies to all payment data.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">4. Aerial Media and Deliverables</h2>
              <p>Photos, videos, and 3D models captured during your service are stored securely and shared only with you and authorized members of your project. We may use anonymized or location-removed media samples for our portfolio unless you request otherwise in writing.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">5. Data Retention</h2>
              <p>We retain your account and booking information for as long as your account is active or as needed to provide services. You may request deletion of your data at any time by emailing us at <a href="mailto:apollodroneworks@icloud.com" className="text-gold hover:text-gold-light">apollodroneworks@icloud.com</a>.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">6. Cookies</h2>
              <p>We use only essential session cookies required for account login and booking flow. We do not use tracking or advertising cookies.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gold-light mb-3">7. Contact</h2>
              <p>Questions about this policy? Reach us at:</p>
              <p className="mt-1"><strong className="text-offwhite">Apollo DroneWorks</strong><br />
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
