import { 
  CalendarCheck, 
  Lock, 
  Images, 
  Clock, 
  CloudDownload, 
  HeadphonesIcon 
} from "lucide-react";
import droneIcon from "@assets/Icon_75_px_1767372891757.png";

export function FeaturesSection() {
  const features = [
    {
      icon: <CalendarCheck className="text-xl text-gold-gradient" />,
      title: "Easy Scheduling",
      description: "Book your drone service directly through our online calendar that syncs with our availability in real-time."
    },
    {
      icon: <Lock className="text-xl text-gold-gradient" />,
      title: "Secure Client Portal",
      description: "Access your projects, view progress updates, and download deliverables through your personalized dashboard."
    },
    {
      icon: <Images className="text-xl text-gold-gradient" />,
      title: "Custom Galleries",
      description: "View and filter your project deliverables by type including photos, videos, and 3D models."
    },
    {
      icon: <Clock className="text-xl text-gold-gradient" />,
      title: "Real-time Updates",
      description: "Stay informed with status notifications and progress updates throughout your project lifecycle."
    },
    {
      icon: <CloudDownload className="text-xl text-gold-gradient" />,
      title: "Easy Deliverables",
      description: "Download high-resolution files directly from your account or share them with team members securely."
    },
    {
      icon: <HeadphonesIcon className="text-xl text-gold-gradient" />,
      title: "Dedicated Support",
      description: "Access our team through in-platform messaging for questions or additional service requests."
    }
  ];

  return (
    <section className="py-20 bg-[#0b111f]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold font-montserrat text-gold-gradient mb-4">Client Experience</h2>
          <p className="text-offwhite max-w-2xl mx-auto">We provide a seamless experience from booking to final delivery</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-6 bg-[#142642] rounded-lg border border-gold-dark/30 flex flex-col items-center">
              <div className="flex justify-center mb-4 h-[38px]">
                <img src={droneIcon} alt="" className="h-[38px] w-[38px]" />
              </div>
              <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold font-montserrat text-gold-gradient mb-2 text-center">{feature.title}</h3>
              <p className="text-offwhite/80 text-center">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
