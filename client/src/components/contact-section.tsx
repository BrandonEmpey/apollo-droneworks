import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Mail, Phone, Facebook, Instagram, Youtube, Linkedin } from "lucide-react";

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // In a real application, you would submit the form data to your backend
    // Here we're just simulating the submission with a timeout
    setTimeout(() => {
      toast({
        title: "Message Sent",
        description: "We've received your message and will get back to you soon.",
      });
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: ""
      });
      setSubmitting(false);
    }, 1500);
  };

  return (
    <section id="contact" className="py-20 bg-gradient-to-b from-[#0b111f] to-[#132642] relative">
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold font-montserrat text-gold-gradient mb-6">Contact Us</h2>
            <p className="text-offwhite mb-8 max-w-md">
              Have questions about our drone services? Contact us today and one of our team members will get back to you promptly.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center mr-4 mt-1">
                  <MapPin className="text-gold-gradient" />
                </div>
                <div>
                  <h3 className="font-montserrat text-offwhite text-lg">Location</h3>
                  <p className="text-offwhite/70">123 Skyview Drive, Austin, TX 78701</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center mr-4 mt-1">
                  <Mail className="text-gold-gradient" />
                </div>
                <div>
                  <h3 className="font-montserrat text-offwhite text-lg">Email</h3>
                  <p className="text-offwhite/70">info@apollodroneworks.com</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center mr-4 mt-1">
                  <Phone className="text-gold-gradient" />
                </div>
                <div>
                  <h3 className="font-montserrat text-offwhite text-lg">Phone</h3>
                  <p className="text-offwhite/70">(512) 555-0123</p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <a href="#" aria-label="Facebook" className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold-gradient hover:bg-gold-light hover:text-gold-gradient transition-all">
                <Facebook size={18} />
              </a>
              <a href="#" aria-label="Instagram" className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold-gradient hover:bg-gold-light hover:text-gold-gradient transition-all">
                <Instagram size={18} />
              </a>
              <a href="#" aria-label="YouTube" className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold-gradient hover:bg-gold-light hover:text-gold-gradient transition-all">
                <Youtube size={18} />
              </a>
              <a href="#" aria-label="LinkedIn" className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold-gradient hover:bg-gold-light hover:text-gold-gradient transition-all">
                <Linkedin size={18} />
              </a>
            </div>
          </div>
          
          <div>
            <form onSubmit={handleSubmit} className="bg-[#132642] p-8 rounded-lg border border-gold-dark/30 shadow-xl">
              <h3 className="text-xl font-semibold font-montserrat text-gold-gradient mb-6">Send Us a Message</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-offwhite/80 text-sm">Name</label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="bg-[#0b111f] border-offwhite/20 text-offwhite focus:border-gold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-offwhite/80 text-sm">Email</label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="bg-[#0b111f] border-offwhite/20 text-offwhite focus:border-gold"
                  />
                </div>
              </div>
              
              <div className="mb-4 space-y-1.5">
                <label htmlFor="subject" className="block text-offwhite/80 text-sm">Subject</label>
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="bg-[#0b111f] border-offwhite/20 text-offwhite focus:border-gold"
                />
              </div>
              
              <div className="mb-6 space-y-1.5">
                <label htmlFor="message" className="block text-offwhite/80 text-sm">Message</label>
                <Textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  required
                  className="bg-[#0b111f] border-offwhite/20 text-offwhite focus:border-gold"
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-gold border-2 border-gold text-black font-montserrat hover:bg-gold-light transition-all"
              >
                {submitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
