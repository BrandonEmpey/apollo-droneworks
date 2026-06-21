import { Helmet } from "react-helmet-async";
import { SITE_URL } from "@/lib/structured-data";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";

const faqs = [
  {
    q: "Are you FAA certified?",
    a: "Yes. All Apollo DroneWorks pilots hold an FAA Part 107 Remote Pilot Certificate — the commercial drone license required by federal law. We also carry full liability insurance and obtain LAANC airspace authorization for every controlled-airspace flight.",
  },
  {
    q: "Is local travel included in the price?",
    a: "Yes. Travel within the St. George and greater Southern Utah area is always included at no extra charge. For remote or out-of-area locations, we'll let you know if a travel fee applies before you book.",
  },
  {
    q: "What happens if the weather is bad?",
    a: "We monitor conditions closely and will contact you as early as possible — typically the evening before — if your flight needs to be rescheduled due to wind, rain, or other unsafe conditions. Weather reschedules are always free.",
  },
  {
    q: "How do I book a service?",
    a: "Create a free account, browse our services, select what you need, pick a date and time, and check out online. You'll receive a confirmation email immediately. Prefer to talk first? Call us at (435) 703-5509.",
  },
  {
    q: "What is a Digital Twin?",
    a: "A Digital Twin is a photorealistic, navigable 3D model of a real space — created by capturing hundreds of overlapping photos with our drone (and ground cameras for interiors), then processing them through photogrammetric reconstruction software. The result is a dimensionally accurate virtual replica you can explore online, measure, and share.",
  },
  {
    q: "What's the difference between Rough-In Digital Twin and 3D Digital Twin?",
    a: "The Rough-In Digital Twin is captured at the framing/rough-in stage of construction to document structural layout before walls close. If you later book a full 3D Digital Twin or Foundation to Finish package, your Rough-In credit is applied toward that booking — so you don't pay twice for overlapping work.",
  },
  {
    q: "What is Aerial Mapping and how is it different from regular aerial photos?",
    a: "Aerial Mapping (sometimes called photogrammetric mapping) uses GPS-tagged, precisely overlapping imagery to produce survey-grade-accuracy outputs: orthomosaic maps, elevation models, and volumetric measurements. Standard aerial photography focuses on visual quality for marketing; mapping focuses on measurement accuracy for engineering, agriculture, and site planning.",
  },
  {
    q: "What is Rush Delivery?",
    a: "If you need a booking with less than 24 hours' notice, a 1.25× rush surcharge applies. This covers the priority scheduling and expedited turnaround. Rush availability depends on current schedule — contact us to confirm.",
  },
  {
    q: "Do you offer bundle discounts?",
    a: "Yes. When you book multiple services together in a single session (for example, Indoor + Outdoor Digital Twin, or multiple phases of Foundation to Finish), a bundle discount is automatically applied at checkout.",
  },
  {
    q: "What is a Partner Account?",
    a: "Frequent clients such as real estate agencies, construction firms, and property managers can be designated as Partner Accounts by our admin team. Partners receive a standing discount on all bookings. Contact us to ask about partner pricing.",
  },
  {
    q: "Can I get roof inspection results without flying inside?",
    a: "Yes. Our Roof Inspection service is purely external — our drone captures the full exterior of your roof, including gutters, flashing, shingles, skylights, and chimneys, without any interior access required.",
  },
  {
    q: "How are deliverables delivered?",
    a: "All photos, videos, and files are delivered through your client portal — a secure online gallery accessible after you log in. 3D models and Digital Twin links are also shared through your portal. Standard editing turnaround is 3–5 business days.",
  },
  {
    q: "What if I need to cancel?",
    a: "Cancellations more than 48 hours before your flight are fully refunded. Cancellations within 48 hours may incur a 25% cancellation fee. See our Terms of Service for full details.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gold-dark/20">
      <button
        className="w-full text-left py-5 flex justify-between items-start gap-4"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-medium text-offwhite">{q}</span>
        {open ? <ChevronUp className="h-5 w-5 text-gold shrink-0 mt-0.5" /> : <ChevronDown className="h-5 w-5 text-gold shrink-0 mt-0.5" />}
      </button>
      {open && <p className="pb-5 text-offwhite/70 text-sm leading-relaxed">{a}</p>}
    </div>
  );
}

export default function FaqPage() {
  return (
    <>
      <Helmet>
        <title>FAQ | Apollo DroneWorks</title>
        <meta name="description" content="Frequently asked questions about Apollo DroneWorks — FAA certification, booking, weather policy, Digital Twins, Aerial Mapping, and more." />
        <link rel="canonical" href={`${SITE_URL}/faq`} />
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-24 max-w-3xl">
          <h1 className="text-4xl font-bold font-montserrat text-gold-gradient mb-2">Frequently Asked Questions</h1>
          <p className="text-offwhite/60 mb-10">Can't find your answer here? <Link href="/contact"><span className="text-gold hover:text-gold-light cursor-pointer">Contact us</span></Link> — we're happy to help.</p>

          <div className="divide-y divide-gold-dark/20 border-t border-gold-dark/20">
            {faqs.map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
