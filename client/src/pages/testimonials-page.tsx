import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Testimonial } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { TestimonialForm } from "@/components/testimonial-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Quote, Loader2 } from "lucide-react";

export default function TestimonialsPage() {
  
  // Fetch approved testimonials
  const { 
    data: testimonials, 
    isLoading 
  } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"],
  });
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  // Render stars based on rating - filled with gold gradient, unfilled with gold outline
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        // Filled star with gold gradient using SVG gradient
        stars.push(
          <svg key={i} className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id={`goldGradient-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c9a227" />
                <stop offset="100%" stopColor="#8a6d14" />
              </linearGradient>
            </defs>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={`url(#goldGradient-${i})`}
              stroke="#c9a227"
              strokeWidth="1"
            />
          </svg>
        );
      } else {
        // Unfilled star with gold outline only
        stars.push(
          <Star
            key={i}
            fill="transparent"
            stroke="#c9a227"
            strokeWidth={1.5}
            className="h-5 w-5"
          />
        );
      }
    }
    return stars;
  };

  return (
    <>
      <Helmet>
        <title>Client Testimonials | Apollo DroneWorks</title>
        <meta name="description" content="Read what our clients have to say about Apollo DroneWorks. Real estate professionals, production companies, and construction firms share their experiences with our drone services." />
      </Helmet>
      
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        
        <main className="flex-grow py-20 px-4 pt-28">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h1 className="text-3xl sm:text-4xl font-bold font-montserrat text-gold-gradient mb-4">
                Client Testimonials
              </h1>
              <p className="text-offwhite max-w-2xl mx-auto">
                See what our clients have to say about their experience working with Apollo DroneWorks.
              </p>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-gold" />
              </div>
            ) : testimonials && testimonials.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                {testimonials.map((testimonial) => (
                  <Card key={testimonial.id} className="bg-[#132642] border-gold-dark/30 overflow-hidden">
                    <CardContent className="p-6">
                      <div className="mb-3 flex justify-start items-center">
                        <div className="flex space-x-1">
                          {renderStars(testimonial.rating)}
                        </div>
                      </div>
                      
                      <p className="text-offwhite/90 mb-6 italic">
                        "{testimonial.content}"
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {testimonial.imageUrl && (
                            <img 
                              src={testimonial.imageUrl} 
                              alt={testimonial.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-gold/30"
                            />
                          )}
                          <div>
                            <p className="font-semibold text-gold">{testimonial.name}</p>
                            <p className="text-sm text-offwhite/70">
                              {testimonial.company && `@ ${testimonial.company}`}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-offwhite/50">
                          {formatDate(testimonial.createdAt.toString())}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 mb-16">
                <p className="text-offwhite mb-6">No testimonials yet. Be the first to share your experience!</p>
              </div>
            )}
            
            {/* Testimonial Form - Always Visible */}
            <div className="max-w-3xl mx-auto mb-16">
              <TestimonialForm />
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}