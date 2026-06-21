import { ShieldCheck, Award, FileCheck, Plane, MapPin } from "lucide-react";

const badges = [
  {
    icon: <ShieldCheck className="h-5 w-5 text-gold" />,
    label: "FAA Part 107 Certified",
  },
  {
    icon: <FileCheck className="h-5 w-5 text-gold" />,
    label: "Fully Insured",
  },
  {
    icon: <Plane className="h-5 w-5 text-gold" />,
    label: "LAANC Authorized",
  },
  {
    icon: <MapPin className="h-5 w-5 text-gold" />,
    label: "Local Travel Included",
  },
  {
    icon: <Award className="h-5 w-5 text-gold" />,
    label: "Licensed & Compliant",
  },
];

export function TrustBar() {
  return (
    <div className="bg-[#080d17] border-y border-gold-dark/20 py-3">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
          {badges.map((badge) => (
            <div key={badge.label} className="flex items-center gap-2">
              {badge.icon}
              <span className="text-sm font-medium text-offwhite/80 whitespace-nowrap">
                {badge.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
