import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Booking, Gallery, Service, Customer as Client, CustomerInteraction, CustomerDeal, CustomerTask } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

import { ProjectCard } from "@/components/client/project-card";
import ClientProjects from "@/components/client/client-projects";
import { PrintableReceipt } from "@/components/client/printable-receipt";
import VirtualTours from "@/components/client/virtual-tours";
import { MediaItem } from "@/types/media";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast, useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { GalleryItem } from "@/components/ui/gallery-item";
import { 
  Loader2, Calendar, Image, Clock, MapPin, Banknote, 
  Download, FileText, CheckCircle2, Clock4, AlertCircle, 
  HardDrive, Filter, XCircle, Maximize2, Plus, Edit, Trash2,
  FolderOpen, FileType as File3d, Video, Folder, Printer
} from "lucide-react";
import { format } from "date-fns";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Link, useLocation } from "wouter";

// Client Form Component
function ClientForm({
  mode,
  client,
  onSuccess
}: {
  mode: 'create' | 'edit';
  client?: any;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const formSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters."),
    lastName: z.string().min(2, "Last name must be at least 2 characters."),
    company: z.string().optional(),
    email: z.string().email("Please enter a valid email address."),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    notes: z.string().optional(),
    source: z.string().optional(),
  });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: client?.firstName || "",
      lastName: client?.lastName || "",
      company: client?.company || "",
      email: client?.email || "",
      phone: client?.phone || "",
      address: client?.address || "",
      city: client?.city || "",
      state: client?.state || "",
      zip: client?.zip || "",
      notes: client?.notes || "",
      source: client?.source || "",
    },
  });
  
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const endpoint = mode === 'create' ? '/api/crm/clients' : `/api/crm/clients/${client?.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const response = await apiRequest(method, endpoint, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save client data.");
      }
      return await response.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Client ${mode === 'create' ? 'created' : 'updated'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/clients'] });
      onSuccess();
    },
  });
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="First name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Company name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Email address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Phone number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Additional notes about this client" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create Client' : 'Update Client'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await apiRequest("POST", "/api/client-projects", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create project");
      }
      return response.json();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Project created successfully" });
      setShowNewProjectDialog(false);
      setNewProjectName("");
      setNewProjectDescription("");
      queryClient.invalidateQueries({ queryKey: ["/api/client/projects"] });
    },
  });
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === "undefined") return "projects";
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "projects";
  });

  useEffect(() => {
    const handler = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) setActiveTab(tab);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [bookingToDelete, setBookingToDelete] = useState<number | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [deleteBookingDialogOpen, setDeleteBookingDialogOpen] = useState(false);
  const [receiptBooking, setReceiptBooking] = useState<any>(null);

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const response = await apiRequest('DELETE', `/api/bookings/${bookingId}`);
      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/bookings'] });
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been successfully cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || 'An error occurred while cancelling your booking',
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDeleteBookingDialogOpen(false);
      setBookingToDelete(null);
      setSelectedBooking(null);
    },
  });
  
  // Business Configuration for Service Calculator
  const [equipmentDepreciation, setEquipmentDepreciation] = useState<number>(10.0);
  const [batteryUsage, setBatteryUsage] = useState<number>(5.0);
  const [insurance, setInsurance] = useState<number>(7.5);
  const [transportation, setTransportation] = useState<number>(15.0);
  const [taxPercentage, setTaxPercentage] = useState<number>(8.25);
  const [hasOverheadChanged, setHasOverheadChanged] = useState<boolean>(false);
  
  // Fetch client data
  const { data: clientData, isLoading: isLoadingClient } = useQuery({
    queryKey: ['/api/client'],
    queryFn: async () => {
      const response = await fetch('/api/client');
      if (!response.ok) {
        throw new Error('Failed to load client data');
      }
      return response.json();
    },
  });
  
  // Fetch the client's projects
  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/client/projects'],
    queryFn: async () => {
      const response = await fetch('/api/client/projects');
      if (!response.ok) {
        throw new Error('Failed to load project data');
      }
      return response.json();
    },
  });
  
  // Fetch galleries
  const { data: galleries, isLoading: isLoadingGalleries, error: galleriesError } = useQuery({
    queryKey: ['/api/client/galleries'],
    queryFn: async () => {
      const response = await fetch('/api/client/galleries');
      if (!response.ok) {
        throw new Error('Failed to load gallery data');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch bookings
  const { data: bookings, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['/api/client/bookings'],
    queryFn: async () => {
      const response = await fetch('/api/client/bookings');
      if (!response.ok) {
        throw new Error('Failed to load booking data');
      }
      return response.json();
    },
  });
  
  // Fetch services for the calculator
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await fetch('/api/services');
      if (!response.ok) {
        throw new Error('Failed to load services data');
      }
      return response.json();
    },
  });
  
  // Fetch business configuration
  const { data: businessConfig, isLoading: isLoadingBusinessConfig } = useQuery({
    queryKey: ['/api/business-config'],
    queryFn: async () => {
      const response = await fetch('/api/business-config');
      if (!response.ok) {
        throw new Error('Failed to load business configuration');
      }
      return response.json();
    },
  });
  
  // Use business config data when it loads
  useEffect(() => {
    if (businessConfig) {
      setEquipmentDepreciation(businessConfig.equipmentDepreciation || 10.0);
      setBatteryUsage(businessConfig.batteryUsage || 5.0);
      setInsurance(businessConfig.insurance || 7.5);
      setTransportation(businessConfig.transportation || 15.0);
      setTaxPercentage(businessConfig.taxPercentage || 8.25);
    }
  }, [businessConfig]);
  
  // Save overhead configuration mutation
  const saveOverheadMutation = useMutation({
    mutationFn: async () => {
      const data = {
        equipmentDepreciation,
        batteryUsage,
        insurance,
        transportation,
        taxPercentage
      };
      
      const response = await apiRequest('PATCH', '/api/business-config', data);
      if (!response.ok) {
        throw new Error('Failed to save overhead configuration');
      }
      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Overhead configuration saved successfully",
      });
      setHasOverheadChanged(false);
      queryClient.invalidateQueries({ queryKey: ['/api/business-config'] });
    },
  });
  
  interface BusinessConfig {
    id: number;
    overheadCostPerMission: number;
    equipmentDepreciation?: number;
    batteryUsage?: number;
    insurance?: number;
    transportation?: number;
    taxPercentage?: number;
    [key: string]: any;
  }
  
  const onDeleteClient = async () => {
    try {
      const response = await apiRequest('DELETE', `/api/crm/clients/${selectedClient.id}`);
      if (!response.ok) {
        throw new Error('Failed to delete client');
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/crm/clients'] });
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
      setConfirmDeleteOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };
  
  const getServiceBasePrice = (serviceId: number, serviceName: string) => {
    if (serviceName.includes("Real Estate")) {
      return 299;
    } else if (serviceName.includes("Roof")) {
      return 349;
    } else if (serviceName.includes("3D") || serviceName.includes("Photogrammetry")) {
      return 849;
    } else {
      return 499; // Default price
    }
  };
  
  const updateOverheadComponent = (value: string, setter: React.Dispatch<React.SetStateAction<number>>, min = 0, max = 1000) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const boundedValue = Math.min(Math.max(numValue, min), max);
      setter(boundedValue);
      setHasOverheadChanged(true);
    }
  };
  
  const resetOverheadToDefaults = () => {
    if (businessConfig) {
      setEquipmentDepreciation(businessConfig.equipmentDepreciation || 10.0);
      setBatteryUsage(businessConfig.batteryUsage || 5.0);
      setInsurance(businessConfig.insurance || 7.5);
      setTransportation(businessConfig.transportation || 15.0);
      setTaxPercentage(businessConfig.taxPercentage || 8.25);
      setHasOverheadChanged(false);
    }
  };
  
  const calculateTotalOverhead = () => {
    return (
      equipmentDepreciation +
      batteryUsage +
      insurance +
      transportation
    ).toFixed(2);
  };
  
  // If no user, return empty div
  if (!user) {
    return <div></div>;
  }
  
  return (
    <>
    <div className="client-dashboard-wrapper bg-[#0b111f] text-offwhite">
      <Helmet>
        <title>Client Dashboard | Apollo Drone Works</title>
      </Helmet>
      
      <Header />
      
      <main className="dashboard-main container mx-auto px-4 pt-24 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Client Info Banner with Navigation Tabs */}
          <div className="mb-8 bg-[#132642] border border-gold-dark/30 rounded-md p-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center mb-4 md:mb-0">
                <div className="mr-6">
                  <h1 className="text-2xl font-bold text-gold" data-testid="text-welcome">
                    Welcome back, {clientData?.firstName || user.firstName || user.username}
                  </h1>
                  <p className="text-offwhite/70">
                    {clientData?.company ? `${clientData.company}` : ""}
                  </p>
                </div>
                
                {/* Dashboard Tabs - moved from below */}
                <div className="tabs-wrapper">
                  <TabsList className="bg-[#080d17] border border-gold-dark/30 p-1 rounded-md">
                    <TabsTrigger value="projects" className="h-9 rounded data-[state=active]:bg-[#132642] data-[state=active]:text-offwhite data-[state=active]:font-medium">
                      Projects
                    </TabsTrigger>
                    <TabsTrigger value="bookings" className="h-9 rounded data-[state=active]:bg-[#132642] data-[state=active]:text-offwhite data-[state=active]:font-medium">
                      Bookings
                    </TabsTrigger>
                    <TabsTrigger value="galleries" className="h-9 rounded data-[state=active]:bg-[#132642] data-[state=active]:text-offwhite data-[state=active]:font-medium">
                      Galleries
                    </TabsTrigger>
                    <TabsTrigger value="virtual-tours" className="h-9 rounded data-[state=active]:bg-[#132642] data-[state=active]:text-offwhite data-[state=active]:font-medium">
                      Virtual Tours
                    </TabsTrigger>
                    <TabsTrigger value="account" className="h-9 rounded data-[state=active]:bg-[#132642] data-[state=active]:text-offwhite data-[state=active]:font-medium">
                      Account
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <Button 
                  className="bg-[#1b2f4d] hover:bg-[#233c64] text-offwhite border border-gold-dark/30"
                  onClick={() => setLocation('/booking')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Service
                </Button>
                <Button 
                  className="bg-gold hover:bg-gold-light text-black"
                  onClick={() => setShowNewProjectDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </div>
            </div>
          </div>
        
        {/* Project Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-[#132642] border-white/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-offwhite font-medium">Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold">
                {isLoadingProjects ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  projects?.filter(project => project.status !== 'Completed').length || 0
                )}
              </div>
              <p className="text-xs text-offwhite/60 mt-1">Projects in progress</p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#132642] border-white/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-offwhite font-medium">Upcoming Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold">
                {isLoadingBookings ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  bookings?.filter(booking => new Date(booking.scheduledDate ?? booking.date) > new Date()).length || 0
                )}
              </div>
              <p className="text-xs text-offwhite/60 mt-1">Scheduled services</p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#132642] border-white/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-offwhite font-medium">Completed Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold">
                {isLoadingProjects ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  projects?.filter(project => project.status === 'Completed').length || 0
                )}
              </div>
              <p className="text-xs text-offwhite/60 mt-1">Successfully delivered</p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#132642] border-white/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-offwhite font-medium">Gallery Media</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold">
                {isLoadingGalleries ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  galleries?.length || 0
                )}
              </div>
              <p className="text-xs text-offwhite/60 mt-1">Available in your gallery</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Service Calculators - Removed from client dashboard */}
        
        {/* Tab Content */}
        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-4">
          <ClientProjects />
        </TabsContent>
        
        {/* Bookings Tab */}
        <TabsContent value="bookings" className="mt-4">
          <div className="bg-[#132642] border border-gold-dark/30 rounded-md p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-medium text-offwhite">Your Bookings</h2>
                  <Button 
                    className="bg-gold hover:bg-gold-light text-black"
                    onClick={() => setLocation('/booking')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Booking
                  </Button>
                </div>
                
                {isLoadingBookings ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gold" />
                  </div>
                ) : bookings && bookings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-[#080d17]">
                        <TableRow>
                          <TableHead className="text-offwhite">Service</TableHead>
                          <TableHead className="text-offwhite">Appointment</TableHead>
                          <TableHead className="text-offwhite">Location</TableHead>
                          <TableHead className="text-offwhite">Status</TableHead>
                          <TableHead className="text-offwhite text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookings.map((booking) => (
                          <TableRow key={booking.id} className="border-b border-gold-dark/10">
                            <TableCell className="font-medium text-offwhite">{booking.serviceType}</TableCell>
                            <TableCell>
                              {(() => {
                                const apptDate = booking.scheduledDate ? new Date(booking.scheduledDate) : booking.date ? new Date(booking.date) : null;
                                return apptDate ? (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center">
                                      <Calendar className="h-4 w-4 mr-2 text-gold shrink-0" />
                                      <span>{format(apptDate, 'MMM dd, yyyy')}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-offwhite/70">
                                      <Clock className="h-3.5 w-3.5 mr-2 text-gold/70 shrink-0" />
                                      <span>{format(apptDate, 'h:mm a')}</span>
                                    </div>
                                  </div>
                                ) : <span className="text-offwhite/50">—</span>;
                              })()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-2 text-gold" />
                                {booking.projectLocation || '—'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={booking.status === 'Confirmed' ? 'default' : 
                                        booking.status === 'Pending' ? 'outline' : 
                                        booking.status === 'Completed' ? 'secondary' : 'destructive'}
                                className={booking.status === 'Confirmed' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/30' : 
                                          booking.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border-yellow-500/30' : 
                                          booking.status === 'Completed' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/30' : 
                                          'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30'}
                              >
                                {booking.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 border-gold-dark/30 hover:bg-gold-dark/10 text-gold"
                                  title="View Receipt"
                                  aria-label="View Receipt"
                                  onClick={() => setReceiptBooking(booking)}
                                >
                                  <Printer className="h-4 w-4" />
                                  <span className="sr-only">View Receipt</span>
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 border-gold-dark/30 hover:bg-gold-dark/10 text-offwhite"
                                  onClick={() => {
                                    // Redirect to booking page with booking ID for editing
                                    setLocation(`/booking?edit=${booking.id}`);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 border-red-500/30 hover:bg-red-500/10 text-red-400"
                                  data-testid="cancel-booking-btn"
                                  onClick={() => {
                                    setBookingToDelete(booking.id);
                                    setSelectedBooking(booking);
                                    setDeleteBookingDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="bg-[#080d17] rounded-md p-8 text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gold/50" />
                    <h3 className="text-lg font-medium text-offwhite mb-2">No Bookings Found</h3>
                    <p className="text-offwhite/70 mb-4">You don't have any services booked yet.</p>
                    <Button 
                      className="bg-gold hover:bg-gold-light text-black"
                      onClick={() => setLocation('/booking')}
                    >
                      Book Your First Service
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Galleries Tab */}
            <TabsContent value="galleries" className="mt-4">
              <div className="bg-[#132642] border border-gold-dark/30 rounded-md p-4">
                <h2 className="text-xl font-medium text-offwhite mb-4">Your Galleries</h2>
                
                {isLoadingGalleries ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gold" />
                  </div>
                ) : galleries && galleries.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {galleries.map((gallery) => (
                      <GalleryItem 
                        key={gallery.id}
                        item={{
                          id: gallery.id,
                          src: gallery.url || '',
                          title: gallery.name || 'Untitled',
                          type: gallery.type || 'image',
                          alt: gallery.name || 'Gallery item',
                          thumbnail: gallery.thumbnail || gallery.url || '',
                          publicDescription: gallery.publicDescription || gallery.description || ''
                        }}
                        downloadable={true}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#080d17] rounded-md p-8 text-center">
                    <Image className="h-12 w-12 mx-auto mb-3 text-gold/50" />
                    <h3 className="text-lg font-medium text-offwhite mb-2">No Galleries Found</h3>
                    <p className="text-offwhite/70 mb-4">You don't have any media galleries yet.</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Virtual Tours Tab */}
            <TabsContent value="virtual-tours" className="mt-4">
              <VirtualTours />
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account" className="mt-4">
              <div className="bg-[#132642] border border-gold-dark/30 rounded-md p-4">
                <h2 className="text-xl font-medium text-offwhite mb-4">Account Information</h2>
                
                {isLoadingClient ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gold" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#080d17] p-4 rounded-md">
                      <h3 className="text-lg font-medium text-offwhite mb-2">Profile</h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-offwhite/70">Name</p>
                          <p className="text-offwhite">{clientData?.firstName} {clientData?.lastName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-offwhite/70">Company</p>
                          <p className="text-offwhite">{clientData?.company || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-offwhite/70">Email</p>
                          <p className="text-offwhite">{clientData?.email || user.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-offwhite/70">Phone</p>
                          <p className="text-offwhite">{clientData?.phone || 'N/A'}</p>
                        </div>
                        <div className="pt-2">
                          <Button className="w-full bg-[#1b2f4d] hover:bg-[#233c64] text-offwhite border border-gold-dark/30">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Profile
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-[#080d17] p-4 rounded-md">
                      <h3 className="text-lg font-medium text-offwhite mb-2">Account Settings</h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-offwhite/70">Username</p>
                          <p className="text-offwhite">{user.username}</p>
                        </div>
                        <div>
                          <p className="text-sm text-offwhite/70">Account Type</p>
                          <p className="text-offwhite">Client</p>
                        </div>
                        <div>
                          <p className="text-sm text-offwhite/70">Member Since</p>
                          <p className="text-offwhite">{user.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : 'N/A'}</p>
                        </div>
                        <div className="pt-2 space-y-2">
                          <Button className="w-full bg-[#1b2f4d] hover:bg-[#233c64] text-offwhite border border-gold-dark/30">
                            Change Password
                          </Button>
                          <Button variant="outline" className="w-full text-offwhite border-gold-dark/30 hover:bg-gold-dark/10">
                            Notification Preferences
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
      </main>
      
      <Footer />
      
      {/* Delete Booking Confirmation Dialog */}
      <AlertDialog open={deleteBookingDialogOpen} onOpenChange={setDeleteBookingDialogOpen}>
        <AlertDialogContent className="bg-[#080d17] border border-gold-dark/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-offwhite">Confirm Cancellation</AlertDialogTitle>
            <AlertDialogDescription className="text-offwhite/70">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {selectedBooking && (
            <div className="bg-[#132642] p-4 rounded-md my-4 border border-gold-dark/30">
              <h3 className="text-md font-medium text-gold mb-2">Booking Details:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-gold" />
                  <span className="text-offwhite/70 mr-2">Service:</span>
                  <span className="text-offwhite">{selectedBooking.serviceType}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gold" />
                  <span className="text-offwhite/70 mr-2">Date:</span>
                  <span className="text-offwhite">{format(new Date(selectedBooking.scheduledDate ?? selectedBooking.date), 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-gold" />
                  <span className="text-offwhite/70 mr-2">Time:</span>
                  <span className="text-offwhite">{selectedBooking.timeSlot}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-gold" />
                  <span className="text-offwhite/70 mr-2">Location:</span>
                  <span className="text-offwhite">{selectedBooking.location}</span>
                </div>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-[#1b2f4d] text-offwhite hover:bg-[#233c64] border border-gold-dark/30"
              disabled={cancelBookingMutation.isPending}
            >
              No, Keep Booking
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
              disabled={cancelBookingMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (bookingToDelete) {
                  cancelBookingMutation.mutate(bookingToDelete);
                }
              }}
            >
              {cancelBookingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Booking'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receipt Modal */}
      <Dialog open={!!receiptBooking} onOpenChange={(open) => { if (!open) setReceiptBooking(null); }}>
        <DialogContent className="bg-[#080d17] border border-gold-dark/30 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-offwhite">Booking Receipt</DialogTitle>
            <DialogDescription className="text-offwhite/60">
              View and print your receipt for this booking.
            </DialogDescription>
          </DialogHeader>
          {receiptBooking && services && (
            <PrintableReceipt
              booking={receiptBooking}
              services={services}
              customerName={[clientData?.firstName, clientData?.lastName].filter(Boolean).join(' ') || user?.username || ''}
              customerEmail={clientData?.email || user?.email || ''}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>

    {/* New Project Dialog */}
    <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
      <DialogContent className="bg-[#132642] border-gold-dark/30 text-offwhite max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gold-gradient">Create New Project</DialogTitle>
          <DialogDescription className="text-offwhite/70">
            Start a new project to track your drone services and progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-offwhite mb-2 block">Project Name</label>
            <Input
              placeholder="Enter project name"
              className="bg-[#080d17] border-gold-dark/30 text-offwhite"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-offwhite mb-2 block">Description (Optional)</label>
            <Textarea
              placeholder="Brief description of the project"
              className="bg-[#080d17] border-gold-dark/30 text-offwhite min-h-[80px]"
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => { setShowNewProjectDialog(false); setNewProjectName(""); setNewProjectDescription(""); }}
            className="border-gold-dark/40 text-offwhite hover:bg-gold-dark/10"
          >
            Cancel
          </Button>
          <Button
            className="bg-gold text-black hover:bg-gold-light"
            disabled={createProjectMutation.isPending}
            onClick={() => {
              if (!newProjectName.trim()) {
                toast({ title: "Error", description: "Please enter a project name", variant: "destructive" });
                return;
              }
              createProjectMutation.mutate({ name: newProjectName, description: newProjectDescription || undefined });
            }}
          >
            {createProjectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

