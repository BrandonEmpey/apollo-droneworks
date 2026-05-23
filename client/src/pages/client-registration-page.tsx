import { useState } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { ClientRegistrationForm } from "@/components/client-registration-form";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ClientRegistrationPage() {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  return (
    <>
      <Helmet>
        <title>Register | Apollo DroneWorks Client Portal</title>
      </Helmet>
      
      <div className="min-h-screen flex flex-col md:flex-row bg-[#0b111f]">
        {/* Left column with form */}
        <div className="w-full md:w-1/2 flex flex-col p-8 md:p-12 xl:p-16 bg-white">
          <Link href="/">
            <Button variant="ghost" className="mb-6 -ml-2 self-start">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#b5893d] to-[#e2c484] bg-clip-text text-transparent mb-2">
              Create Your Client Account
            </h1>
            <p className="text-gray-600">
              Register for exclusive access to your Apollo DroneWorks client portal.
            </p>
          </div>
          
          {showSuccessMessage ? (
            <div className="flex flex-col items-center justify-center space-y-4 text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold">Registration Successful!</h2>
              <p className="text-gray-600 max-w-md">
                Your account has been created successfully. You can now log in to access your client portal.
              </p>
              <Button asChild className="mt-4">
                <Link href="/auth">Go to Login</Link>
              </Button>
            </div>
          ) : (
            <ClientRegistrationForm />
          )}
          
          <div className="mt-8 text-center text-gray-600">
            <p>
              Already have an account?{" "}
              <Link href="/auth" className="text-blue-600 hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
        
        {/* Right column with hero content */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#080d17] to-[#132642] items-center justify-center p-12">
          <div className="max-w-lg text-white">
            <h2 className="text-3xl font-bold mb-6">
              Welcome to the{" "}
              <span className="bg-gradient-to-r from-[#b5893d] to-[#e2c484] bg-clip-text text-transparent">
                Apollo DroneWorks
              </span>{" "}
              Client Portal
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 mt-0.5 bg-gradient-to-r from-[#b5893d] to-[#e2c484] rounded-full flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-xl font-semibold mb-1">Track Your Projects</h3>
                  <p className="text-gray-300">Monitor the progress of your drone projects in real-time.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 mt-0.5 bg-gradient-to-r from-[#b5893d] to-[#e2c484] rounded-full flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-xl font-semibold mb-1">Access Deliverables</h3>
                  <p className="text-gray-300">Download your finished photos, videos, and 3D models.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 mt-0.5 bg-gradient-to-r from-[#b5893d] to-[#e2c484] rounded-full flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-xl font-semibold mb-1">Communicate Directly</h3>
                  <p className="text-gray-300">Easily communicate with our team about your projects.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 mt-0.5 bg-gradient-to-r from-[#b5893d] to-[#e2c484] rounded-full flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-xl font-semibold mb-1">Request New Services</h3>
                  <p className="text-gray-300">Easily request additional drone services for your projects.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}