import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import SocialMediaPortal from "@/components/social/social-media-portal";

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
            <div className="mb-6 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold font-montserrat gold-text mt-10">
                Social Media Portal
              </h1>
            </div>
            
            <SocialMediaPortal />
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}