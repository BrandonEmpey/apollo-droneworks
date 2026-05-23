import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { loadStripe } from "@stripe/stripe-js";
import {
  CardElement,
  Elements,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useLocation, useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { 
  Loader2, 
  CheckCircle, 
  CreditCard, 
  AlertCircle, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Camera,
  DollarSign,
  Calendar,
  Beaker as BeakerIcon,
  Clock,
  CheckSquare
} from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Service, Booking } from "@shared/schema";
import { PrintableReceipt } from "@/components/client/printable-receipt";
import { CheckoutServiceSummary } from "@/components/client/checkout-service-summary";

// Initialize Stripe using the public key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Component for actual payment form
function CheckoutForm({ 
  amount, 
  bookingId, 
  serviceName,
  projectName,
  onPaymentSuccess
}: { 
  amount: number; 
  bookingId: number;
  serviceName: string;
  projectName?: string;
  onPaymentSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Create payment intent when component mounts
  useEffect(() => {
    const fetchPaymentIntent = async () => {
      try {
        const response = await apiRequest("POST", "/api/create-payment-intent", {
          amount,
          bookingId
        });
        const data = await response.json();
        
        // Handle free services or test mode differently than paid ones
        if (data.free) {
          // Toast message depends on whether this is a free service or test mode
          toast({
            title: data.testMode ? "Test Mode Activated" : "Free Service Confirmed",
            description: data.testMode 
              ? "Test booking has been confirmed. No actual payment was processed."
              : "Your booking has been confirmed. No payment is required.",
          });
          setSucceeded(true);
          
          // Invalidate booking and client projects queries to ensure data is fresh
          queryClient.invalidateQueries({queryKey: [`/api/bookings/${bookingId}`]});
          queryClient.invalidateQueries({queryKey: ["/api/bookings"]});
          queryClient.invalidateQueries({queryKey: ["/api/client-projects"]});
          queryClient.invalidateQueries({queryKey: ["/api/client/projects"]});
          
          onPaymentSuccess();
        } else if (data.clientSecret) {
          // For paid services, set client secret for Stripe
          setClientSecret(data.clientSecret);
        }
      } catch (err: any) {
        setError(err.message || "Something went wrong. Please try again.");
        toast({
          title: "Payment Error",
          description: err.message || "Failed to initialize payment",
          variant: "destructive",
        });
      }
    };

    fetchPaymentIntent();
  }, [amount, bookingId, toast, navigate]);

  const cardStyle = {
    style: {
      base: {
        color: "#F5F5F5",
        fontFamily: "Lato, sans-serif",
        fontSmoothing: "antialiased",
        fontSize: "16px",
        "::placeholder": {
          color: "#aab7c4",
        },
      },
      invalid: {
        color: "#fa755a",
        iconColor: "#fa755a",
      },
    },
  };

  const handleChange = (event: any) => {
    // Listen for changes in the CardElement
    // and display any errors as the customer types their card details
    setError(event.error ? event.error.message : "");
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setProcessing(true);

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded
      setProcessing(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setProcessing(false);
      setError("Card element not found");
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    if (error) {
      setError(error.message || "Payment failed");
      setProcessing(false);
      toast({
        title: "Payment Failed",
        description: error.message || "Your payment could not be processed",
        variant: "destructive",
      });
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      setError(null);
      setProcessing(false);
      setSucceeded(true);
      toast({
        title: "Payment Successful",
        description: "Thank you for your payment!",
      });
      
      // Invalidate booking and client projects queries to ensure data is fresh
      queryClient.invalidateQueries({queryKey: [`/api/bookings/${bookingId}`]});
      queryClient.invalidateQueries({queryKey: ["/api/bookings"]});
      queryClient.invalidateQueries({queryKey: ["/api/client-projects"]});
      queryClient.invalidateQueries({queryKey: ["/api/client/projects"]});
      
      onPaymentSuccess();
    }
  };

  // Format amount for display (convert cents to dollars)
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  const handleTestBypass = async (e: React.MouseEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    try {
      // Use the projectName passed from parent component
      // Call the create-payment-intent endpoint directly to trigger test mode
      // Include projectName to ensure it's used when creating the project
      const res = await apiRequest("POST", "/api/create-payment-intent", {
        amount,
        bookingId,
        projectName
      });
      
      const data = await res.json();
      
      if (data.testMode || data.free) {
        toast({
          title: "Test Mode Payment Completed",
          description: "Your booking has been confirmed in test mode. No payment was processed.",
        });
        
        // Invalidate booking and client projects queries to ensure data is fresh
        queryClient.invalidateQueries({queryKey: [`/api/bookings/${bookingId}`]});
        queryClient.invalidateQueries({queryKey: ["/api/bookings"]});
        queryClient.invalidateQueries({queryKey: ["/api/client-projects"]});
        queryClient.invalidateQueries({queryKey: ["/api/client/projects"]});
        
        setSucceeded(true);
        onPaymentSuccess();
      }
    } catch (error) {
      console.error("Test bypass error:", error);
      toast({
        title: "Test Bypass Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-gold-dark/30 bg-[#080d17]/80 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="h-5 w-5 text-gold" />
            <div className="text-offwhite font-medium">Service Details</div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-offwhite/70">Service Type:</div>
            <div className="text-sm text-offwhite font-medium">{serviceName}</div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-offwhite/70">Duration:</div>
            <div className="text-sm text-offwhite font-medium">60 minutes</div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-offwhite/70">Deliverables:</div>
            <div className="text-sm text-offwhite font-medium">Professional Quality</div>
          </div>
        </div>
        
        <div className="rounded-lg border border-gold-dark/30 bg-[#080d17]/80 p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5 text-gold" />
            <div className="text-offwhite font-medium">Payment Summary</div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-offwhite/70">Service Fee:</div>
            <div className="text-sm text-offwhite font-medium">{formatAmount(amount)}</div>
          </div>
          <div className="border-t border-gold-dark/10 my-2"></div>
          <div className="flex items-center justify-between">
            <div className="text-offwhite font-medium">Total Due:</div>
            <div className="text-lg text-gold font-semibold">{formatAmount(amount)}</div>
          </div>
        </div>
      </div>
      
      <div className="bg-[#0b111f] p-5 rounded-lg border border-gold-dark/30">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-gold" />
          <div className="text-offwhite font-medium">Payment Method</div>
        </div>
        
        <div className="bg-[#080d17]/40 p-4 rounded-lg border border-gold-dark/20 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-sm text-offwhite font-medium">Card Details</div>
            <div className="flex items-center gap-1 ml-auto">
              <div className="w-8 h-5 bg-blue-600 rounded"></div>
              <div className="w-8 h-5 bg-red-500 rounded-full"></div>
              <div className="w-8 h-5 bg-yellow-400 rounded"></div>
              <div className="w-8 h-5 bg-green-500 rounded"></div>
            </div>
          </div>
          <CardElement
            id="card-element"
            options={cardStyle}
            onChange={handleChange}
            className="p-3 bg-[#0b111f] rounded border border-gold-dark/20"
          />
          <p className="text-xs text-offwhite/50 mt-3">Your card information is encrypted and secure. We never store your full card details.</p>
        </div>
        
        {error && (
          <div className="bg-red-950/30 text-red-400 p-3 rounded-lg flex items-center gap-2 mb-4 border border-red-900/50">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {succeeded ? (
          <div className="bg-green-900/20 text-green-400 p-4 rounded-lg flex items-center gap-2 border border-green-800/30">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Payment successful!</p>
              <p className="text-sm text-green-400/80">Your receipt is ready below.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Button 
              type="submit" 
              disabled={processing || !stripe} 
              className="w-full bg-gold text-black hover:bg-gold-light font-medium"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" /> Pay {formatAmount(amount)}
                </>
              )}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gold-dark/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0b111f] px-2 text-offwhite/50">or</span>
              </div>
            </div>
            
            <Button 
              type="button"
              disabled={processing}
              onClick={handleTestBypass}
              variant="outline"
              className="w-full text-yellow-400 hover:text-yellow-300 border-yellow-900/50 hover:bg-yellow-950/20"
            >
              <BeakerIcon className="mr-2 h-4 w-4" /> Use Test Mode (No Payment Required)
            </Button>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-center gap-2 text-xs text-offwhite/40 mt-2">
        <CheckCircle className="h-3 w-3" />
        <span>Secure Payment</span>
        <span className="mx-2">•</span>
        <CheckCircle className="h-3 w-3" />
        <span>SSL Encrypted</span>
        <span className="mx-2">•</span>
        <CheckCircle className="h-3 w-3" />
        <span>Privacy Protected</span>
      </div>
    </form>
  );
}

export default function CheckoutPage() {
  const [, params] = useRoute("/checkout/:bookingId");
  const bookingId = params?.bookingId ? parseInt(params.bookingId) : 0;
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [testMode] = useState(true); // Set to true to show test mode banner
  const [paymentComplete, setPaymentComplete] = useState(false);

  // Fetch booking details
  const {
    data: booking,
    isLoading: bookingLoading,
    error: bookingError
  } = useQuery<Booking>({
    queryKey: [`/api/bookings/${bookingId}`],
    enabled: bookingId > 0 && !!user,
  });

  // Fetch all services for reference
  const {
    data: allServices,
    isLoading: servicesLoading,
    error: servicesError
  } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!booking,
  });
  
  // Get primary service
  const primaryService = booking && allServices ? 
    allServices.find(s => s.id === booking.serviceId) : undefined;
  
  // Get all selected services (excluding the primary service to avoid duplication)
  const selectedServices = booking?.selectedServices && allServices ? 
    booking.selectedServices
      .filter(id => id !== booking.serviceId) // Filter out primary service
      .map(id => allServices.find(s => s.id === id))
      .filter((s): s is Service => !!s) : 
    [];
    
  console.log("Booking data in checkout:", booking);
  console.log("All services in checkout:", allServices);
  console.log("Selected services in checkout:", booking?.selectedServices);
  console.log("Processed selected services for display:", selectedServices);

  const isLoading = bookingLoading || servicesLoading;
  const error = bookingError || servicesError;
  
  // Redirect to dashboard for free bookings
  useEffect(() => {
    if (booking && booking.paymentStatus === 'free') {
      toast({
        title: "Free Service",
        description: "Your free consultation has been confirmed. No payment is required.",
      });
      navigate("/dashboard");
    }
  }, [booking, navigate, toast]);

  useEffect(() => {
    // If not logged in, redirect to login page
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access checkout.",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [user, navigate, toast]);

  useEffect(() => {
    // If booking is already paid, redirect to dashboard
    if (booking && booking.paymentStatus === 'paid') {
      toast({
        title: "Already Paid",
        description: "This booking has already been paid for.",
      });
      navigate("/dashboard");
    }
  }, [booking, navigate, toast]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="flex justify-center items-center h-96">
            <Loader2 className="h-12 w-12 animate-spin text-gold" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show error state
  if (error || !booking || !primaryService) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle className="text-red-500">Error</CardTitle>
              <CardDescription>
                {error instanceof Error 
                  ? error.message 
                  : "Booking information could not be loaded. Please try again."}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild>
                <Link href="/dashboard">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
      <Helmet>
        <title>Complete Your Payment | Apollo DroneWorks</title>
        <meta name="description" content="Securely complete your booking payment for Apollo DroneWorks drone services." />
      </Helmet>

      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Test Mode Banner */}
          {testMode && (
            <div className="mb-4 bg-yellow-900/30 border border-yellow-600/30 text-yellow-400 px-4 py-3 rounded-md flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Test Mode Active</h3>
                <p className="text-sm text-yellow-400/80">
                  Payments are being processed in test mode. No real charges will be made to any payment method.
                </p>
              </div>
            </div>
          )}
          
          {/* Breadcrumb Navigation */}
          <div className="flex items-center mb-8 p-3 bg-[#080d17]/70 rounded-md border border-gold-dark/20">
            <Link href="/dashboard" className="text-gold-light/80 hover:text-gold flex items-center">
              <span>Dashboard</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-offwhite/40 mx-2" />
            <Link href="/booking" className="text-gold-light/80 hover:text-gold flex items-center">
              <span>Booking</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-offwhite/40 mx-2" />
            <span className="text-offwhite font-medium">Payment</span>
          </div>
          
          {/* Payment Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4 sm:space-x-8">
              <div className="flex flex-col items-center text-gold">
                <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-gold bg-gold/10 mb-2">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <span className="text-sm">Details</span>
              </div>
              
              <div className="w-16 sm:w-24 h-0.5 bg-gold" />
              
              <div className="flex flex-col items-center text-gold">
                <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-gold bg-gold/10 mb-2">
                  <span>2</span>
                </div>
                <span className="text-sm">Payment</span>
              </div>
              
              <div className="w-16 sm:w-24 h-0.5 bg-offwhite/30" />
              
              <div className="flex flex-col items-center text-offwhite/50">
                <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-offwhite/30 mb-2">
                  <span>3</span>
                </div>
                <span className="text-sm">Confirmation</span>
              </div>
            </div>
          </div>
          
          <Card className="bg-[#0b111f] border border-gold-dark/30 shadow-xl shadow-[#080d17]/30">
            <CardHeader className="border-b border-gold-dark/20 bg-gradient-to-r from-[#080d17]/60 to-[#0b111f]/60">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                <div>
                  <CardTitle className="text-2xl font-montserrat gold-text mb-1">Complete Your Payment</CardTitle>
                  <CardDescription className="text-offwhite/80">
                    Secure checkout for your drone service booking
                  </CardDescription>
                </div>
                <div className="mt-4 sm:mt-0">
                  <Badge variant="outline" className="bg-gold/10 text-gold border-gold/30 py-1.5 px-3">
                    Order #{booking.id}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-8">
              {/* Booking Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-[#080d17] to-[#0b111f]/80 p-5 rounded-lg border border-gold-dark/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-5 w-5 text-gold" />
                    <h3 className="text-lg font-medium text-gold-light">Booking Details</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-offwhite/70">Booking ID:</span>
                      <span className="text-offwhite font-medium">{booking.id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-offwhite/70">Service Date:</span>
                      <span className="text-offwhite font-medium">{format(new Date(booking.scheduledDate ?? booking.date), "EEEE, MMMM d, yyyy")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-offwhite/70">Time:</span>
                      <span className="text-offwhite font-medium">{format(new Date(booking.scheduledDate ?? booking.date), "h:mm a")}</span>
                    </div>
                    {booking.projectLocation && (
                      <div className="flex justify-between items-center">
                        <span className="text-offwhite/70">Project Location:</span>
                        <span className="text-offwhite font-medium">{booking.projectLocation}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-offwhite/70">Status:</span>
                      <Badge 
                        variant="outline" 
                        className="bg-yellow-950/30 text-yellow-400 border-yellow-900/40"
                      >
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-[#080d17] to-[#0b111f]/80 p-5 rounded-lg border border-gold-dark/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Camera className="h-5 w-5 text-gold" />
                    <h3 className="text-lg font-medium text-gold-light">Service Details</h3>
                  </div>
                  <CheckoutServiceSummary
                    primaryService={primaryService}
                    selectedServices={selectedServices}
                    totalAmount={booking.totalAmount || "0"}
                    projectName={booking.projectName}
                  />
                </div>
              </div>
              
              {/* Stripe Payment Form */}
              <div className="mt-6 border border-gold-dark/20 rounded-lg p-5 bg-gradient-to-br from-[#080d17]/80 to-[#0b111f]/80">
                <h3 className="text-xl font-semibold text-gold-light mb-6">Payment Information</h3>
                <Elements stripe={stripePromise}>
                  <CheckoutForm 
                    amount={Math.round(parseFloat(booking.totalAmount || "0") * 100)}
                    bookingId={booking.id}
                    serviceName={primaryService?.name || 'Drone Service'} 
                    projectName={booking.projectName || undefined}
                    onPaymentSuccess={() => setPaymentComplete(true)}
                  />
                </Elements>
              </div>
            </CardContent>
          </Card>

          {/* Confirmation & Receipt — shown after payment succeeds */}
          {paymentComplete && (
            <div className="mt-8 space-y-6">
              <div className="bg-green-900/20 text-green-400 p-5 rounded-lg flex items-center gap-3 border border-green-800/30">
                <CheckCircle className="h-6 w-6 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-lg">Booking Confirmed!</p>
                  <p className="text-sm text-green-400/80">Your payment was received. A copy of your receipt is below.</p>
                </div>
              </div>

              <PrintableReceipt
                booking={booking}
                services={allServices || []}
                customerName={
                  user
                    ? (user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.username)
                    : ""
                }
                customerEmail={user?.email || ""}
              />

              <div className="flex justify-center">
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="bg-gold text-black hover:bg-gold-light font-medium px-8"
                  size="lg"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}