import { Card, CardContent } from "@/components/ui/card";
import { Star, User } from "lucide-react";
import { Testimonial } from "@shared/schema";
import droneIcon from "@assets/Icon_25_px_1767371102776.png";

interface TestimonialCardProps {
  testimonial: Testimonial;
}

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  const { name, company, content, rating } = testimonial;

  // Generate array of stars based on rating with outlined transparent design
  const stars = Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      fill={i < rating ? "currentColor" : "transparent"}
      stroke="currentColor"
      strokeWidth={1.5}
      className={`transition-colors ${i < rating ? "text-gold" : "text-gold/30"}`}
      size={18}
    />
  ));

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card className="p-6 bg-[#142642] rounded-lg border border-gold-dark/30 h-full">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="flex justify-center mb-4">
          <img src={droneIcon} alt="" className="h-5 w-5 opacity-70" />
        </div>
        <div className="flex mb-4">{stars}</div>
        <p className="text-offwhite italic mb-6 flex-grow">{content}</p>
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center mr-3">
            <span className="text-gold-gradient font-semibold">{getInitials(name)}</span>
          </div>
          <div>
            <h4 className="font-montserrat text-offwhite">{name}</h4>
            {company && <p className="text-offwhite/60 text-sm">{company}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TestimonialCard;
