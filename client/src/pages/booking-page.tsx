import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Booking, Service, insertBookingSchema } from "@shared/schema";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { BookingCalendar } from "@/components/ui/booking-calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  CreditCard, 
  CheckCircle, 
  Calendar, 
  Map, 
  Clock, 
  Camera, 
  Info, 
  DollarSign,
  CheckSquare,
  Check,
  Lock,
  AlertCircle,
  MapPin,
  Receipt,
  User,
  Home,
  Briefcase
} from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { format, addDays, parse } from "date-fns";

// Extend the booking schema with form-specific fields
const bookingFormSchema = z.object({
  projectName: z.string().min(3, "Project name must be at least 3 characters"),
  selectedServices: z.array(z.string()).min(1, "Please select at least one service"),
  date: z.date({
    required_error: "Please select a date",
  }),
  time: z.string().min(1, "Please select a time"),
  address: z.string().min(5, "Please enter the project address"),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export function BookingServiceSummaryItem({
  service,
  selectedRange,
  isRangeBased,
  tierIdx,
  effectivePriceCents,
}: {
  service: Service;
  selectedRange: { label: string } | null;
  isRangeBased: boolean;
  tierIdx: number | null;
  effectivePriceCents: number;
}) {
  return (
    <div className="flex items-start gap-3 bg-[#080d17]/40 p-3 rounded-lg border border-gold-dark/20">
      <Camera className="h-5 w-5 text-gold mt-0.5" />
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-md font-medium text-gold">{service.name}</h4>
            {selectedRange && (
              <p className="text-xs text-offwhite/60 mt-0.5">{selectedRange.label}</p>
            )}
            {isRangeBased && tierIdx === null && (
              <p className="text-xs text-amber-400/80 mt-0.5">Package not selected yet</p>
            )}
          </div>
          {service.price === 0 ? (
            <Badge className="bg-green-900/30 text-green-400 border border-green-800/30">
              FREE
            </Badge>
          ) : isRangeBased && tierIdx === null ? (
            <Badge className="bg-gold/20 text-gold border border-gold/30">
              From ${(effectivePriceCents / 100).toFixed(0)}
            </Badge>
          ) : (
            <Badge className="bg-gold/20 text-gold border border-gold/30">
              ${(effectivePriceCents / 100).toFixed(0)}
            </Badge>
          )}
        </div>
        {service.disclaimer && service.disclaimer.trim().length > 0 && (
          <div
            className="mt-2 rounded border border-gold-dark/20 bg-[#080d17]/50 p-3"
            data-testid={`booking-line-disclaimer-${service.id}`}
          >
            <div className="text-xs font-semibold text-gold mb-1">Disclaimer</div>
            <p className="text-xs text-offwhite/70 leading-relaxed whitespace-pre-line">
              {service.disclaimer.trim()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingPage() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookingStep, setBookingStep] = useState(1);
  
  // Get query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const selectedServiceId = searchParams.get("service");
  const primaryServiceId = searchParams.get("primaryService");
  const selectedServicesParam = searchParams.get("selectedServices");
  const bundleDiscountParam = searchParams.get("bundleDiscount");
  const pricingTierParam = searchParams.get("pricingTier");
  const selectedDateParam = searchParams.get("date");
  const selectedTimeParam = searchParams.get("time");
  const totalPriceParam = searchParams.get("totalPrice"); // Dollar amount passed from service page
  const notesParam = searchParams.get("notes"); // Pre-filled notes (e.g. Property Tours composite details)
  const editId = searchParams.get("edit"); // Booking ID to edit

  // Fetch services data
  const {
    data: services,
    isLoading: isLoadingServices,
    error: servicesError,
  } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Fetch existing booking when in edit mode
  const { data: editBooking, isLoading: isLoadingEditBooking } = useQuery<Booking>({
    queryKey: ["/api/bookings", editId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookings/${editId}`);
      return res.json();
    },
    enabled: !!editId,
  });

  const { data: businessConfig } = useQuery<any>({
    queryKey: ["/api/business-config"],
  });

  // Fetch any outstanding Rough-In Digital Twin credit for this user
  const { data: roughInCreditData } = useQuery<{ credit: { id: number; total_amount: string; project_location: string | null } | null }>({
    queryKey: ["/api/credits/rough-in"],
    enabled: !!user,
  });

  const partnerDiscountPct: number = user?.isPartnerAccount
    ? Number((businessConfig as any)?.partnerDiscountPercentage ?? 10)
    : 0;

  // Rough-In credit: applies only when booking 3D Digital Twin (19) or Foundation to Finish (21)
  const selectedPrimaryId = parseInt(
    primaryServiceId || selectedServiceId || "0"
  );
  const CREDIT_ELIGIBLE_IDS = [19, 21];
  const roughInCredit = roughInCreditData?.credit ?? null;
  const creditApplies = !!roughInCredit && CREDIT_ELIGIBLE_IDS.includes(selectedPrimaryId);
  const creditCents = creditApplies
    ? Math.round(parseFloat(roughInCredit!.total_amount) * 100)
    : 0;

  // Get selected service details
  const selectedService = services?.find(
    (service) => service.id === parseInt(selectedServiceId || "0")
  );

  // Find consultation service (should be free)
  const consultationService = services?.find(service => service.price === 0);
  
  // Initialize selected services with consultation service and any from URL params
  const initialSelectedServices = () => {
    const services = [];
    if (consultationService) {
      services.push(consultationService.id.toString());
    }
    
    // Handle bundle booking from service page
    if (primaryServiceId && selectedServicesParam) {
      services.push(primaryServiceId);
      const additionalServices = selectedServicesParam.split(',').filter(id => id !== primaryServiceId);
      services.push(...additionalServices);
    } else if (selectedServiceId) {
      // Handle single service booking
      services.push(selectedServiceId);
    }
    
    return services;
  };
  
  // Initialize booking form
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      projectName: "",
      selectedServices: initialSelectedServices(),
      date: selectedDateParam ? new Date(selectedDateParam) : undefined,
      time: selectedTimeParam || "",
      address: "",
      notes: notesParam ? decodeURIComponent(notesParam) : "",
    },
  });

  // Prefill form when editing an existing booking
  useEffect(() => {
    if (editBooking && services) {
      const scheduledDate = editBooking.scheduledDate ? new Date(editBooking.scheduledDate) : undefined;
      const timeStr = scheduledDate ? format(scheduledDate, 'h:mm a') : '';
      const existingServices = editBooking.selectedServices?.length
        ? editBooking.selectedServices
        : editBooking.serviceId ? [editBooking.serviceId] : [];
      form.reset({
        projectName: editBooking.projectName || '',
        selectedServices: existingServices.map(id => id.toString()),
        date: scheduledDate,
        time: timeStr,
        address: editBooking.projectLocation || '',
        notes: editBooking.notes || '',
      });
    }
  }, [editBooking, services]);

  // Track selected package tier per range-based service (keyed by service id string)
  const [selectedRangeTiers, setSelectedRangeTiers] = useState<Record<string, number>>({});

  // State for project confirmation dialog
  const [existingProjectInfo, setExistingProjectInfo] = useState<{show: boolean; projectName: string; projectId: number; bookingId: number} | null>(null);

  // Stores the real booking returned from the API so the confirmation screen shows the correct ID
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  type EditPayload = {
    serviceId: number;
    scheduledDate: Date;
    projectLocation: string | null;
    notes: string | null;
    projectName: string;
    selectedServices: number[];
    totalAmount: string;
  };

  // Update booking mutation (used when editing an existing booking)
  const updateBookingMutation = useMutation({
    mutationFn: async (data: EditPayload) => {
      const serializedData = {
        ...data,
        scheduledDate: data.scheduledDate instanceof Date ? data.scheduledDate.toISOString() : data.scheduledDate,
      };
      const res = await apiRequest("PUT", `/api/bookings/${editId}`, serializedData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking updated",
        description: "Your booking details have been updated successfully.",
      });
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
      setBookingStep(1);
    },
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      // Convert Date object to ISO string before sending to server
      // This ensures it will be properly serialized in the request
      const serializedData = {
        ...data,
        date: data.date instanceof Date ? data.date.toISOString() : data.date
      };
      const res = await apiRequest("POST", "/api/bookings", serializedData);
      return await res.json();
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      
      // Always store the real booking object so any subsequent confirmation screen
      // can display the correct booking ID regardless of the path taken.
      setConfirmedBooking(booking);

      // Check if booking is associated with an existing project
      if (booking.existingProject) {
        // Show confirmation dialog for the user to confirm adding to existing project
        setExistingProjectInfo({
          show: true,
          projectName: booking.projectName,
          projectId: booking.projectId,
          bookingId: booking.id
        });
        return; // Don't proceed until user confirms in the dialog
      }
      
      // Normal flow - check if this is a free booking (like a consultation)
      if (booking.paymentStatus === "free") {
        // Skip checkout for free services
        toast({
          title: "Booking confirmed",
          description: "Your free consultation has been successfully booked!",
        });
        // Complete booking flow immediately since there's no payment needed
        setBookingStep(3);
      } else {
        // Paid service - proceed to checkout
        toast({
          title: "Booking created",
          description: "Your service has been booked. Proceeding to payment.",
        });
        // Redirect to checkout page with booking ID
        setLocation(`/checkout/${booking.id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
      // Reset booking step on error
      setBookingStep(1);
    },
  });
  
  // Handle confirming or canceling adding to existing project
  const handleExistingProjectConfirmation = (confirmed: boolean) => {
    if (!existingProjectInfo) return;
    
    if (confirmed) {
      toast({
        title: "Service added to existing project",
        description: `Your booking has been added to project "${existingProjectInfo.projectName}"`,
      });
      
      // Get the booking info to determine next step
      const bookingId = existingProjectInfo.bookingId;
      
      // Determine if we need to go to payment or completion
      // We'll need to get the booking status from the server
      apiRequest("GET", `/api/bookings/${bookingId}`)
        .then(res => res.json())
        .then(booking => {
          if (booking.paymentStatus === "free") {
            // Store the real booking so the confirmation screen shows the correct ID
            setConfirmedBooking(booking);
            // Complete booking flow immediately since there's no payment needed
            setBookingStep(3);
          } else {
            // Proceed to checkout for payment
            setLocation(`/checkout/${bookingId}`);
          }
        })
        .catch(error => {
          console.error("Error fetching booking details:", error);
          // Default to payment step if we can't determine
          setLocation(`/checkout/${bookingId}`);
        });
    } else {
      // User declined - delete the booking and reset
      apiRequest("DELETE", `/api/bookings/${existingProjectInfo.bookingId}`)
        .then(() => {
          toast({
            title: "Booking cancelled",
            description: "Please enter a different project name to create a new project.",
            variant: "destructive",
          });
        })
        .catch(error => {
          console.error("Error cancelling booking:", error);
          toast({
            title: "Error",
            description: "Could not cancel the booking. Please try again.",
            variant: "destructive",
          });
        })
        .finally(() => {
          setBookingStep(1);
        });
    }
    
    // Reset dialog state
    setExistingProjectInfo(null);
  };

  // Resolve the effective price (in cents) for a service, honouring range tier selections
  const getEffectiveServicePrice = (service: Service, serviceId: string): number => {
    if (service.pricingType === "range_based" && service.priceRanges && service.priceRanges.length > 0) {
      const tierIdx = selectedRangeTiers[serviceId] ?? (pricingTierParam ? parseInt(pricingTierParam) : null);
      if (tierIdx !== null && service.priceRanges[tierIdx]) {
        return service.priceRanges[tierIdx].minPrice;
      }
      // Fall back to first range's minPrice when no tier chosen yet
      return service.priceRanges[0].minPrice;
    }
    return service.price;
  };

  // Calculate total price from selected services
  const calculateTotalPrice = (selectedServiceIds: string[]) => {
    // Check if this is a bundle booking with discount
    const bundleDiscount = bundleDiscountParam ? parseInt(bundleDiscountParam) : 0;
    const isPrimaryService = primaryServiceId ? primaryServiceId : null;

    const subtotal = selectedServiceIds.reduce((total, serviceId) => {
      const service = services?.find(s => s.id.toString() === serviceId);
      if (!service) return total;

      let servicePrice = getEffectiveServicePrice(service, serviceId);

      // Apply bundle discount to add-on services (not the primary service)
      if (bundleDiscount > 0 && isPrimaryService && serviceId !== isPrimaryService) {
        servicePrice = servicePrice * (1 - bundleDiscount / 100);
      }

      return total + servicePrice;
    }, 0);

    // Apply partner account discount after bundle discount
    if (partnerDiscountPct > 0) {
      return Math.round(subtotal * (1 - partnerDiscountPct / 100));
    }
    return subtotal;
  };
  
  // Get primary service (the non-free service with highest price)
  const getPrimaryServiceId = (selectedServiceIds: string[]): string => {
    if (!selectedServiceIds.length) return "0";
    
    // Filter out free services and get the one with highest price
    const paidServices = selectedServiceIds
      .map(id => services?.find(s => s.id.toString() === id))
      .filter(service => service && service.price > 0)
      .sort((a, b) => (b?.price || 0) - (a?.price || 0));
      
    // Return the first paid service or the first service in the list if no paid services
    return paidServices.length > 0 
      ? paidServices[0]?.id.toString() || selectedServiceIds[0]
      : selectedServiceIds[0];
  };
  
  // Handle form submission
  const onSubmit = (values: BookingFormValues) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to complete your booking",
        variant: "destructive",
      });
      setLocation(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    // Format date with selected time
    const [hours, minutes] = values.time.split(':');
    const bookingDateTime = new Date(values.date);
    bookingDateTime.setHours(parseInt(hours), parseInt(minutes));
    
    // Get primary service ID (for main service categorization)
    const primaryServiceId = getPrimaryServiceId(values.selectedServices);
    
    // Determine whether any range-based service has a tier chosen via the on-page picker.
    // If so, we must compute the total from the current selections rather than trusting a
    // stale URL param (which may reflect a different tier chosen on the service-detail page).
    const hasManualTierSelection = values.selectedServices.some(id => selectedRangeTiers[id] !== undefined);

    // Use URL-passed totalPrice only when the user has NOT made manual tier selections on
    // this page (e.g. arrived from the service page with a pre-computed bundle/subscription price).
    const totalPriceFromUrl = totalPriceParam ? parseFloat(totalPriceParam) : null;
    const totalPriceDollars =
      !hasManualTierSelection &&
      totalPriceFromUrl !== null &&
      Number.isFinite(totalPriceFromUrl) &&
      totalPriceFromUrl >= 0
        ? totalPriceFromUrl
        : calculateTotalPrice(values.selectedServices) / 100;
    
    // Debug selected services
    console.log("Selected services IDs:", values.selectedServices);
    console.log("Primary service ID:", primaryServiceId);
    console.log("Services details:", services?.filter(s => values.selectedServices.includes(s.id.toString())));
    console.log("Total price (dollars):", totalPriceDollars);

    // Show processing state
    setBookingStep(2);

    if (editId) {
      // Edit mode: only update user-editable fields; preserve lifecycle/payment fields
      const editPayload = {
        serviceId: parseInt(primaryServiceId),
        scheduledDate: bookingDateTime,
        projectLocation: values.address || null,
        notes: values.notes || null,
        projectName: values.projectName,
        selectedServices: values.selectedServices.map(id => parseInt(id)),
        totalAmount: totalPriceDollars.toString(),
      };
      console.log("Edit booking payload being sent to API:", editPayload);
      updateBookingMutation.mutate(editPayload);
    } else {
      // Apply Rough-In credit to the total if eligible
      const creditDollars = creditCents / 100;
      const finalTotalDollars = Math.max(0, totalPriceDollars - creditDollars);

      // Create booking object with all fields required for new bookings
      const bookingData: Record<string, any> = {
        userId: user.id,
        serviceId: parseInt(primaryServiceId),
        date: bookingDateTime, // Send directly as Date object
        status: "pending",
        projectLocation: values.address || null, // Ensure null for empty string
        notes: values.notes || null, // Ensure null for empty string
        totalAmount: finalTotalDollars.toString(), // Schema field is totalAmount (numeric = string), stored in dollars
        paymentStatus: finalTotalDollars > 0 ? "pending" : "free",
        paymentIntentId: null, // Explicitly include this field with null value
        projectName: values.projectName, // Include project name from form
        // Convert all selected service IDs from strings to numbers
        selectedServices: values.selectedServices.map(id => parseInt(id)),
      };
      // Attach credit fields so the booking record tracks the redemption
      if (creditApplies && roughInCredit && creditCents > 0) {
        bookingData.creditAmount = creditCents;
        bookingData.creditSourceBookingId = roughInCredit.id;
      }
      // Create new booking - on success will redirect to checkout page
      console.log("Final booking data being sent to API:", bookingData);
      createBookingMutation.mutate(bookingData);
    }
  };

  // Time slots in AM/PM format for Mountain Standard Time (MST)
  const availableTimeSlots = [
    "9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"
  ];

  // Check if services are loading
  if (isLoadingServices || isLoadingEditBooking) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        <main className="flex-grow pt-32 pb-20 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-16 w-16 animate-spin text-gold mb-4 mx-auto" />
            <h2 className="text-xl text-offwhite font-medium">
              {isLoadingEditBooking ? "Loading Booking" : "Loading Services"}
            </h2>
            <p className="text-offwhite/60 mt-2">Please wait while we prepare your booking options...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  // Project Exists Confirmation Dialog
  const projectExistsDialog = existingProjectInfo && (
    <Dialog open={existingProjectInfo.show} onOpenChange={() => setExistingProjectInfo(null)}>
      <DialogContent className="bg-[#132642] border-gold/30 text-offwhite max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold gold-text">Project Already Exists</DialogTitle>
          <DialogDescription className="text-offwhite/80 pt-2">
            A project with the name <span className="font-semibold text-gold">"{existingProjectInfo.projectName}"</span> already exists.
            Would you like to add this booking to the existing project?            
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Alert className="bg-[#1b2f4d] border-yellow-600/50">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertTitle className="text-yellow-500">Important</AlertTitle>
            <AlertDescription className="text-offwhite/70">
              If you choose "Create New Project" instead, please use a different project name.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => handleExistingProjectConfirmation(false)}
            className="w-full sm:w-auto border-red-600/50 hover:bg-red-950/20 hover:text-red-400 text-offwhite"
          >
            Create New Project
          </Button>
          <Button 
            onClick={() => handleExistingProjectConfirmation(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-gold-dark to-gold-light text-white hover:bg-gold-dark/90"
          >
            Add to Existing Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <Helmet>
        <title>Book a Service | Apollo DroneWorks</title>
        <meta name="description" content="Book professional drone photography, videography, or 3D modeling services with Apollo DroneWorks. Choose your service, select a date and time, and get ready for stunning aerial content." />
      </Helmet>
      
      {/* Render the project exists dialog if needed */}
      {projectExistsDialog}

      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        
        <main className="flex-grow pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-3xl sm:text-4xl font-bold font-montserrat gold-text text-center mb-6">
              Book Your Drone Service
            </h1>
            <p className="text-offwhite text-center mb-16 max-w-2xl mx-auto">
              Schedule a drone shoot and let us elevate your project with stunning aerial perspectives.
            </p>

            {/* Booking Steps */}
            <div className="flex justify-center mb-12">
              <div className="flex items-center space-x-4 sm:space-x-8">
                <div 
                  className={`flex flex-col items-center ${
                    bookingStep >= 1 ? "text-gold" : "text-offwhite/50"
                  }`}
                >
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 ${
                      bookingStep >= 1 
                        ? "border-gold bg-gradient-to-r from-gold-dark to-gold-light" 
                        : "border-offwhite/30"
                    }`}
                  >
                    <span className={bookingStep >= 1 ? "text-white font-medium" : ""}>1</span>
                  </div>
                  <span className="text-sm">Booking Details</span>
                </div>
                
                <div className={`w-16 sm:w-24 h-0.5 ${bookingStep >= 2 ? "bg-gold" : "bg-offwhite/30"}`} />
                
                <div 
                  className={`flex flex-col items-center ${
                    bookingStep >= 2 ? "text-gold" : "text-offwhite/50"
                  }`}
                >
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 ${
                      bookingStep >= 2 
                        ? "border-gold bg-gradient-to-r from-gold-dark to-gold-light" 
                        : "border-offwhite/30"
                    }`}
                  >
                    <span className={bookingStep >= 2 ? "text-white font-medium" : ""}>2</span>
                  </div>
                  <span className="text-sm">Payment</span>
                </div>
                
                <div className={`w-16 sm:w-24 h-0.5 ${bookingStep >= 3 ? "bg-gold" : "bg-offwhite/30"}`} />
                
                <div 
                  className={`flex flex-col items-center ${
                    bookingStep >= 3 ? "text-gold" : "text-offwhite/50"
                  }`}
                >
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 ${
                      bookingStep >= 3 
                        ? "border-gold bg-gradient-to-r from-gold-dark to-gold-light" 
                        : "border-offwhite/30"
                    }`}
                  >
                    <span className={bookingStep >= 3 ? "text-white font-medium" : ""}>3</span>
                  </div>
                  <span className="text-sm">Confirmation</span>
                </div>
              </div>
            </div>

            {/* Step 1: Booking Form */}
            {bookingStep === 1 && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {roughInCredit && !creditApplies && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-sm text-emerald-300">
                      <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                      <p>
                        You have a <strong>${parseFloat(roughInCredit.total_amount).toFixed(0)} Rough-In Digital Twin credit</strong> available.
                        It will be applied automatically when you book the{" "}
                        <strong>3D Digital Twin</strong> or <strong>Foundation to Finish</strong> service.
                      </p>
                    </div>
                  )}
                  <Card className="bg-[#132642] border-gold-dark/30">
                    <CardHeader className="text-center">
                      <CardTitle className="text-xl text-offwhite">Services</CardTitle>
                      <CardDescription className="text-center text-offwhite/60 mt-2">
                        Select one or more services.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="selectedServices"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                {services?.filter((service) => !service.hideFromServicesPage).map((service) => {
                                  const isSelected = field.value.includes(service.id.toString());
                                  const isFree = service.price === 0;
                                  
                                  const isRangeBased = service.pricingType === "range_based" && service.priceRanges && service.priceRanges.length > 0;
                                  const serviceIdStr = service.id.toString();
                                  const selectedTierIdx = selectedRangeTiers[serviceIdStr] ?? null;

                                  return (
                                    <div key={service.id} className="flex flex-col gap-2">
                                      <div 
                                        className="bg-[#080d17] rounded-lg overflow-hidden transition-all hover:scale-105 shadow-lg border border-gold-dark/30 cursor-pointer"
                                        onClick={() => {
                                          const newValue = isSelected
                                            ? field.value.filter(id => id !== serviceIdStr)
                                            : [...field.value, serviceIdStr];
                                          field.onChange(newValue);
                                        }}
                                      >
                                        <div className="h-36 overflow-hidden">
                                          <img
                                            src={service.imageUrl}
                                            alt={service.name}
                                            className="w-full h-full object-cover transition-transform hover:scale-110"
                                          />
                                        </div>
                                        <div className="p-4">
                                          <div className="text-center mb-2">
                                            <h3 className="font-medium text-gold">{service.name}</h3>
                                          </div>
                                          <p className="text-sm text-offwhite/80 mb-3">{service.description}</p>
                                          <div className="flex justify-between items-center mt-4">
                                            <div className={`h-6 w-6 rounded-md flex items-center justify-center ${
                                              isSelected ? "bg-[#132642]" : "bg-[#132642]/70 border border-gold/30"
                                            }`}>
                                              {isSelected && <CheckSquare className="h-4 w-4 text-white" />}
                                            </div>
                                            <div className="text-xs text-offwhite/60">
                                              {isFree ? "30 mins" : "60 mins"} • Professional Quality
                                            </div>
                                            {isFree ? (
                                              <Badge className="bg-green-900/30 text-green-400 border border-green-800/30">
                                                FREE
                                              </Badge>
                                            ) : isRangeBased ? (
                                              <Badge className="bg-gold/20 text-gold border border-gold/30">
                                                From ${(service.priceRanges![0].minPrice / 100).toFixed(0)}
                                              </Badge>
                                            ) : (
                                              <Badge className="bg-gold/20 text-gold border border-gold/30">
                                                ${(service.price / 100).toFixed(0)}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Package picker for range-based services */}
                                      {isSelected && isRangeBased && (
                                        <div
                                          className="bg-[#0d1a2d] border border-gold-dark/40 rounded-lg p-3"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <p className="text-xs text-offwhite/70 mb-2 font-medium uppercase tracking-wide">
                                            Select a package
                                          </p>
                                          <div className="flex flex-col gap-1.5">
                                            {service.priceRanges!.map((range, idx) => (
                                              <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setSelectedRangeTiers(prev => ({ ...prev, [serviceIdStr]: idx }))}
                                                className={`flex justify-between items-center px-3 py-2 rounded text-sm transition-colors ${
                                                  selectedTierIdx === idx
                                                    ? "bg-gold/20 border border-gold/60 text-gold"
                                                    : "bg-[#080d17]/60 border border-gold-dark/20 text-offwhite/80 hover:border-gold/40"
                                                }`}
                                              >
                                                <span>{range.label}</span>
                                                <span className="font-semibold ml-4">
                                                  ${(range.minPrice / 100).toFixed(0)}
                                                  {range.maxPrice && range.maxPrice !== range.minPrice
                                                    ? ` – $${(range.maxPrice / 100).toFixed(0)}`
                                                    : ""}
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                          {selectedTierIdx === null && (
                                            <p className="text-xs text-amber-400/80 mt-2">Please select a package to continue.</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card className="bg-[#122642] border-gold-dark/30">
                    <CardHeader className="text-center">
                      <CardTitle className="text-xl text-offwhite">Select Date & Time</CardTitle>
                      <CardDescription className="text-center text-offwhite/60 mt-2">
                        Select a date and time most convenient for your service or free consultation.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormControl>
                              <BookingCalendar
                                selectedDate={field.value}
                                onDateSelect={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-offwhite">Time Slot</FormLabel>
                            <FormDescription className="text-offwhite/60">
                              Select your preferred appointment time
                            </FormDescription>
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {availableTimeSlots.map((time) => {
                                const morning = parseInt(time.split(':')[0]) < 12;
                                const label = morning ? 'Morning' : 'Afternoon';
                                return (
                                  <div
                                    key={time}
                                    className={`
                                      relative cursor-pointer rounded-lg border-2 p-3 transition-all
                                      ${field.value === time 
                                        ? "border-gold bg-gold/10" 
                                        : "border-gold-dark/20 hover:border-gold-dark/50 bg-[#080d17]/40"
                                      }
                                    `}
                                    onClick={() => field.onChange(time)}
                                  >
                                    <div className="flex flex-col space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-offwhite">{time}</span>
                                        <Badge 
                                          className={`text-xs ${
                                            morning 
                                              ? "bg-blue-900/40 text-blue-400 border-blue-800/30" 
                                              : "bg-amber-900/40 text-amber-400 border-amber-800/30"
                                          }`}
                                        >
                                          {label}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-offwhite/60">60 min session</div>
                                    </div>
                                    {field.value === time && (
                                      <div className="absolute bottom-2 right-2 h-4 w-4 rounded-full bg-gold/20 flex items-center justify-center">
                                        <Check className="h-2.5 w-2.5 text-gold" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card className="bg-[#132642] border-gold-dark/30">
                    <CardHeader className="text-center">
                      <CardTitle className="text-xl text-offwhite">Project Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="projectName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-offwhite">Project Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter a name for your project" 
                                {...field} 
                                className="bg-[#080d17] border-gold-dark/30 text-offwhite focus:border-gold-light/50"
                              />
                            </FormControl>
                            <FormDescription className="text-offwhite/60 text-xs">
                              This will be used to identify your project in the dashboard
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-offwhite">Project Address</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter the full address" 
                                {...field} 
                                className="bg-[#080d17] border-gold-dark/30 text-offwhite focus:border-gold-light/50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-offwhite">Additional Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Any special requirements or details we should know" 
                                {...field} 
                                className="bg-[#080d17] border-gold-dark/30 text-offwhite focus:border-gold-light/50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card className="bg-[#132642] border-gold-dark/30">
                    <CardHeader className="text-center">
                      <CardTitle className="text-xl text-offwhite">Booking Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Selected Services */}
                        {form.watch("selectedServices").length > 0 && (
                          <div className="flex-col space-y-3">
                            <span className="text-sm text-offwhite/60">Selected Services</span>
                            {form.watch("selectedServices").map(serviceId => {
                              const service = services?.find(s => s.id.toString() === serviceId);
                              if (!service) return null;
                              const isRangeBased = service.pricingType === "range_based" && service.priceRanges && service.priceRanges.length > 0;
                              const tierIdx = selectedRangeTiers[serviceId] ?? null;
                              const selectedRange = isRangeBased && tierIdx !== null ? service.priceRanges![tierIdx] : null;
                              const effectivePriceCents = getEffectiveServicePrice(service, serviceId);
                              
                              return (
                                <BookingServiceSummaryItem
                                  key={service.id}
                                  service={service}
                                  selectedRange={selectedRange}
                                  isRangeBased={isRangeBased}
                                  tierIdx={tierIdx}
                                  effectivePriceCents={effectivePriceCents}
                                />
                              );
                            })}
                          </div>
                        )}

                        {form.watch("date") && (
                          <div className="flex items-start gap-3 bg-[#080d17]/40 p-3 rounded-lg border border-gold-dark/20">
                            <Calendar className="h-5 w-5 text-gold mt-0.5" />
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <div>
                                  <span className="text-sm text-offwhite/60">Date</span>
                                  <h4 className="text-md font-medium text-offwhite">
                                    {format(form.watch("date"), "EEEE, MMMM d, yyyy")}
                                  </h4>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {form.watch("time") && (
                          <div className="flex items-start gap-3 bg-[#080d17]/40 p-3 rounded-lg border border-gold-dark/20">
                            <Clock className="h-5 w-5 text-gold mt-0.5" />
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <div>
                                  <span className="text-sm text-offwhite/60">Time</span>
                                  <h4 className="text-md font-medium text-offwhite">
                                    {form.watch("time")} ({parseInt(form.watch("time").split(':')[0]) < 12 ? 'Morning' : 'Afternoon'})
                                  </h4>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {form.watch("projectName") && (
                          <div className="flex items-start gap-3 bg-[#080d17]/40 p-3 rounded-lg border border-gold-dark/20">
                            <Briefcase className="h-5 w-5 text-gold mt-0.5" />
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <div>
                                  <span className="text-sm text-offwhite/60">Project Name</span>
                                  <h4 className="text-md font-medium text-offwhite">
                                    {form.watch("projectName")}
                                  </h4>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {form.watch("address") && (
                          <div className="flex items-start gap-3 bg-[#080d17]/40 p-3 rounded-lg border border-gold-dark/20">
                            <Map className="h-5 w-5 text-gold mt-0.5" />
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <div>
                                  <span className="text-sm text-offwhite/60">Location</span>
                                  <h4 className="text-md font-medium text-offwhite">
                                    {form.watch("address")}
                                  </h4>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Total price calculation */}
                        <div className="flex flex-col gap-1 p-4 mt-2 bg-[#080d17]/60 rounded-lg border border-gold/30">
                          {partnerDiscountPct > 0 && (() => {
                            const base = calculateTotalPrice(form.watch("selectedServices")) / (1 - partnerDiscountPct / 100);
                            return (
                              <>
                                <div className="flex items-center justify-between text-sm text-offwhite/60">
                                  <span>Subtotal</span>
                                  <span>${(base / 100).toFixed(0)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm text-emerald-400">
                                  <span>Partner discount ({partnerDiscountPct}%)</span>
                                  <span>−${((base - calculateTotalPrice(form.watch("selectedServices"))) / 100).toFixed(0)}</span>
                                </div>
                              </>
                            );
                          })()}
                          {creditApplies && creditCents > 0 && (
                            <div className="flex items-center justify-between text-sm text-emerald-400">
                              <span>Rough-In Digital Twin credit applied</span>
                              <span>−${(creditCents / 100).toFixed(0)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-5 w-5 text-gold" />
                              <span className="text-offwhite font-medium">Total</span>
                            </div>
                            <span className="text-xl font-semibold text-gold">
                              ${(Math.max(0, calculateTotalPrice(form.watch("selectedServices")) - creditCents) / 100).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end border-t border-gold-dark/20 pt-4">
                      <Button 
                        type="submit"
                        variant="gold"
                        disabled={createBookingMutation.isPending || updateBookingMutation.isPending}
                      >
                        {(createBookingMutation.isPending || updateBookingMutation.isPending) && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {editId ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Proceed to Payment
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            )}
            
            {/* Step 2: Payment */}
            {bookingStep === 2 && (
              <div className="space-y-8">
                <Card className="bg-[#132642] border-gold-dark/30">
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl text-offwhite">Payment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-8 bg-[#080d17]/50 rounded-lg border border-gold/10 text-center">
                      <div className="flex justify-center mb-4">
                        <CreditCard className="h-12 w-12 text-gold" />
                      </div>
                      <h3 className="text-xl font-medium text-gold mb-2">Stripe Payment Integration</h3>
                      <p className="text-offwhite/70 mb-6">
                        This is a placeholder for the Stripe payment form. In the actual implementation, 
                        users would enter their card details securely through Stripe Elements.
                      </p>
                      
                      <div className="space-y-4 max-w-md mx-auto">
                        <div className="bg-[#132642] p-3 rounded border border-gold/20 text-start flex items-center gap-3">
                          <Lock className="h-5 w-5 text-gold" />
                          <div className="flex-1">
                            <div className="text-xs text-offwhite/60">Card Number</div>
                            <div className="text-sm text-offwhite">•••• •••• •••• 4242</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-3">
                          <div className="bg-[#132642] p-3 rounded border border-gold/20 text-start flex-1">
                            <div className="text-xs text-offwhite/60">Expiration</div>
                            <div className="text-sm text-offwhite">04/25</div>
                          </div>
                          <div className="bg-[#132642] p-3 rounded border border-gold/20 text-start flex-1">
                            <div className="text-xs text-offwhite/60">CVC</div>
                            <div className="text-sm text-offwhite">•••</div>
                          </div>
                        </div>
                        
                        <div className="bg-[#132642] p-3 rounded border border-gold/20 text-start">
                          <div className="text-xs text-offwhite/60">Name on Card</div>
                          <div className="text-sm text-offwhite">Example Customer</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full bg-[#1d1d1d] text-white border-2 border-transparent hover:border-gold/50 transition-all"
                      disabled
                    >
                      Complete Payment
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
            
            {/* Step 3: Confirmation */}
            {bookingStep === 3 && (
              <div className="space-y-8">
                <Card className="bg-[#132642] border-gold-dark/30">
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                      <div className="h-16 w-16 rounded-full bg-green-900/40 flex items-center justify-center">
                        <CheckCircle className="h-10 w-10 text-green-400" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl text-offwhite">Booking Confirmed!</CardTitle>
                    <CardDescription className="text-lg">
                      Thank you for choosing Apollo DroneWorks
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-[#080d17]/50 p-6 rounded-lg border border-gold/10">
                      <h3 className="text-lg font-medium text-gold mb-4">Booking Details</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-gold mt-0.5" />
                          <div>
                            <span className="text-sm text-offwhite/60 block">Date & Time</span>
                            <span className="text-offwhite">{form.getValues().date ? format(new Date(form.getValues().date), 'EEEE, MMMM d, yyyy') : "—"} at {form.getValues().time || "—"}</span>
                          </div>
                        </div>
                        
                        {form.getValues().address && (
                          <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-gold mt-0.5" />
                            <div>
                              <span className="text-sm text-offwhite/60 block">Project Location</span>
                              <span className="text-offwhite">{form.getValues().address}</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-start gap-3">
                          <Briefcase className="h-5 w-5 text-gold mt-0.5" />
                          <div>
                            <span className="text-sm text-offwhite/60 block">Project Name</span>
                            <span className="text-offwhite">{form.getValues().projectName}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <Camera className="h-5 w-5 text-gold mt-0.5" />
                          <div>
                            <span className="text-sm text-offwhite/60 block">Services</span>
                            <ul className="list-disc pl-5 text-offwhite space-y-1">
                              {form.getValues().selectedServices.map((serviceId: string) => {
                                const service = services?.find(s => s.id === parseInt(serviceId));
                                return service ? <li key={service.id}>{service.name}</li> : null;
                              })}
                            </ul>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <Receipt className="h-5 w-5 text-gold mt-0.5" />
                          <div>
                            <span className="text-sm text-offwhite/60 block">Payment</span>
                            <span className="text-offwhite">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }).format(form.getValues().selectedServices.reduce((total: number, serviceId: string) => {
                                const service = services?.find(s => s.id === parseInt(serviceId));
                                return total + (service ? service.price / 100 : 0);
                              }, 0))}
                              - Paid
                            </span>
                            <span className="text-xs text-offwhite/60 block">
                              Booking ID: {confirmedBooking ? `APLDW-${String(confirmedBooking.id).padStart(6, '0')}` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gold/10 p-4 rounded-lg border border-gold/30">
                      <div className="flex gap-3">
                        <Info className="h-5 w-5 text-gold mt-0.5" />
                        <div>
                          <h4 className="text-gold font-medium">What's Next?</h4>
                          <p className="text-sm text-offwhite/80">
                            You'll receive a confirmation email with all the details. 
                            Our team will contact you 24 hours before your appointment to confirm.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      className="w-full sm:w-auto bg-[#1d1d1d] text-white border-2 border-transparent hover:border-gold/50 transition-all"
                      onClick={() => setLocation('/dashboard')}
                    >
                      <User className="mr-2" /> View in Dashboard
                    </Button>
                    <Button 
                      className="w-full sm:w-auto bg-[#080d17] text-gold border-2 border-gold/30 hover:border-gold transition-all"
                      onClick={() => setLocation('/')}
                    >
                      <Home className="mr-2" /> Return to Home
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}




          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
