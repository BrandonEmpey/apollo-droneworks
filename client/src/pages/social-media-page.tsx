import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import SocialMediaPortal from "@/components/social/social-media-portal";
import { Button } from "@/components/ui/button";
import { Gift, Star, Megaphone } from "lucide-react";

export default function SocialMediaPage() {
  const { user } = useAuth();
  
  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
            <p className="text-offwhite mb-6">You don't have permission to access this page.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Social Media Portal | Apollo DroneWorks</title>
        <meta name="description" content="Social Media Portal for Apollo DroneWorks - Manage social media accounts and create posts for multiple platforms." />
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        
        <main className="flex-grow py-24 px-4">
          <div className="container mx-auto">
            <div className="mb-6">
              <div className="text-center mb-4">
                <h1 className="text-3xl sm:text-4xl font-bold font-montserrat gold-text mt-10">
                  Social Media Portal
                </h1>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <Link href="/social-media-ads">
                  <Button variant="outline" size="sm" className="border-gold/30 text-gold hover:bg-gold/10">
                    <Megaphone className="h-4 w-4 mr-2" />
                    Ad Campaigns
                  </Button>
                </Link>
                <Link href="/admin/referral-management">
                  <Button variant="outline" size="sm" className="border-gold/30 text-gold hover:bg-gold/10">
                    <Gift className="h-4 w-4 mr-2" />
                    Referral Program
                  </Button>
                </Link>
                <Link href="/admin/satisfaction-surveys">
                  <Button variant="outline" size="sm" className="border-gold/30 text-gold hover:bg-gold/10">
                    <Star className="h-4 w-4 mr-2" />
                    Satisfaction Surveys
                  </Button>
                </Link>
              </div>
            </div>

            <SocialMediaPortal />
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}