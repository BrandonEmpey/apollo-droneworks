import { Link } from "wouter";
import { Mail, Phone, MapPin, Clock, Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import logoImage from '@assets/Color_logo_-_no_background_1767370534671.png';
import { TrustBar } from "@/components/trust-bar";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#080d17] pb-6">
      <TrustBar />
      <div className="container mx-auto px-4 pt-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div>
            <div className="mb-6">
              <Link href="/">
                <img 
                  src={logoImage} 
                  alt="Apollo DroneWorks" 
                  className="h-10 object-contain cursor-pointer"
                />
              </Link>
            </div>
            <p className="text-gray-400 mb-6">
              Providing professional drone services for real estate, events, and commercial applications.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors"
                aria-label="YouTube"
              >
                <Youtube size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-gold-gradient">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/">
                  <span className="text-gray-400 hover:text-gold-gradient transition-colors cursor-pointer">
                    Home
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/gallery">
                  <span className="text-gray-400 hover:text-gold-gradient transition-colors cursor-pointer">
                    Gallery
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/blog">
                  <span className="text-gray-400 hover:text-gold-gradient transition-colors cursor-pointer">
                    Blog
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/auth">
                  <span className="text-gray-400 hover:text-gold-gradient transition-colors cursor-pointer">
                    Login / Register
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/booking">
                  <span className="text-gray-400 hover:text-gold-gradient transition-colors cursor-pointer">
                    Book a Service
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-gold-gradient">Our Services</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/services/55">
                  <span className="text-gray-400 hover:text-gold-gradient transition-colors cursor-pointer">
                    Real Estate Listings
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/services/60">
                  <span className="text-gray-400 hover:text-gold-gradient transition-colors cursor-pointer">
                    Roof Inspections
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/services/61">
                  <span className="text-gray-400 hover:text-gold-gradient transition-colors cursor-pointer">
                    Tower Inspections
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/services/67">
                  <span className="text-gray-400 hover:text-gold-gradient transition-colors cursor-pointer">
                    3D Mapping
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/services/52">
                  <span className="text-gray-400 hover:text-gold-gradient transition-colors cursor-pointer">
                    Construction Monitoring
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-gold-gradient">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <MapPin className="text-gold-gradient mr-3 mt-1 flex-shrink-0" size={18} />
                <span className="text-gray-400">
                  St. George, UT and surrounding area
                </span>
              </li>
              <li className="flex items-center">
                <Phone className="text-gold-gradient mr-3 flex-shrink-0" size={18} />
                <a
                  href="tel:+14357035509"
                  className="text-gray-400 hover:text-gold-gradient transition-colors"
                >
                  (435) 703-5509
                </a>
              </li>
              <li className="flex items-center">
                <Mail className="text-gold-gradient mr-3 flex-shrink-0" size={18} />
                <a
                  href="mailto:apollodroneworks@icloud.com"
                  className="text-gray-400 hover:text-gold-gradient transition-colors"
                >
                  apollodroneworks@icloud.com
                </a>
              </li>
              <li className="flex items-start">
                <Clock className="text-gold-gradient mr-3 mt-1 flex-shrink-0" size={18} />
                <span className="text-gray-400">
                  Mon-Fri: 9:00 AM - 6:00 PM
                  <br />
                  Sat: 10:00 AM - 4:00 PM
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800 text-center md:text-left md:flex md:justify-between md:items-center">
          <p className="text-gray-500 text-sm">
            &copy; {currentYear} Apollo DroneWorks. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0">
            <ul className="flex flex-wrap justify-center md:justify-end space-x-4 text-sm">
              <li>
                <Link href="/privacy">
                  <span className="text-gray-500 hover:text-gold-light transition-colors cursor-pointer">
                    Privacy Policy
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/terms">
                  <span className="text-gray-500 hover:text-gold-light transition-colors cursor-pointer">
                    Terms of Service
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/faq">
                  <span className="text-gray-500 hover:text-gold-light transition-colors cursor-pointer">
                    FAQ
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}