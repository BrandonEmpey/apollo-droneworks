import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, Building, MapPin, Calendar, FolderOpen, ClipboardList, DollarSign, FileCheck, ChevronRight, X, CheckCircle, Handshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [editedBookingStatus, setEditedBookingStatus] = useState("");
  const [editedProjectStatus, setEditedProjectStatus] = useState("");
  const [editedTaskStatus, setEditedTaskStatus] = useState("");

  const { data: customerData, isLoading } = useQuery<any>({
    queryKey: [`/api/crm/customers/${id}/all`],
    enabled: !!id,
  });

  const { data: bookingsData } = useQuery<any[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: projectsData } = useQuery<any[]>({
    queryKey: ["/api/client-projects"],
  });

  const customer = customerData?.customer;
  const interactions = customerData?.interactions || [];
  const deals = customerData?.deals || [];
  const tasks = customerData?.tasks || [];

  const bookings = Array.isArray(bookingsData) ? bookingsData : [];
  const projects = Array.isArray(projectsData) ? projectsData : [];

  const customerBookings = bookings.filter((b: any) => 
    b.customerEmail === customer?.email || 
    b.customerName === customer?.name ||
    (customer?.firstName && customer?.lastName && b.customerName === `${customer.firstName} ${customer.lastName}`)
  );

  const bookingProjectIds = customerBookings.map((b: any) => b.projectId).filter(Boolean);
  
  const customerProjects = projects.filter((p: any) => 
    bookingProjectIds.includes(p.id) ||
    p.clientId === customer?.id
  );

  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: number; status: string }) => {
      return apiRequest("PATCH", `/api/bookings/${bookingId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({ title: "Booking updated", description: "Status has been updated successfully." });
      setSelectedBooking(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update booking.", variant: "destructive" });
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: number; status: string }) => {
      return apiRequest("PATCH", `/api/client-projects/${projectId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects"] });
      toast({ title: "Project updated", description: "Status has been updated successfully." });
      setSelectedProject(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update project.", variant: "destructive" });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      return apiRequest("PATCH", `/api/crm/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/customers/${id}/all`] });
      toast({ title: "Task updated", description: "Status has been updated successfully." });
      setSelectedTask(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
    }
  });

  const { data: partnerData, refetch: refetchPartner } = useQuery<any>({
    queryKey: [`/api/admin/users/${customer?.userId}/partner-account`],
    enabled: !!customer?.userId,
  });

  const togglePartnerMutation = useMutation({
    mutationFn: async (isPartnerAccount: boolean) => {
      return apiRequest("PATCH", `/api/admin/users/${customer.userId}/partner-account`, { isPartnerAccount });
    },
    onSuccess: () => {
      refetchPartner();
      toast({ title: "Partner status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update partner status.", variant: "destructive" });
    }
  });

  const openBookingSheet = (booking: any) => {
    setSelectedBooking(booking);
    setEditedBookingStatus(booking.status || "pending");
  };

  const openProjectSheet = (project: any) => {
    setSelectedProject(project);
    setEditedProjectStatus(project.status || "active");
  };

  const openTaskSheet = (task: any) => {
    setSelectedTask(task);
    setEditedTaskStatus(task.status || "pending");
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-8 mt-20">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </main>
      </>
    );
  }

  if (!customer) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Customer Not Found</h2>
            <Link href="/admin/clients">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  const displayName = customer.firstName && customer.lastName 
    ? `${customer.firstName} ${customer.lastName}` 
    : customer.name || 'Unnamed Customer';

  return (
    <>
      <Helmet>
        <title>{displayName} - Customer Details - Apollo DroneWorks</title>
      </Helmet>
      
      <Header />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="mb-6">
          <Link href="/admin/clients">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Client Operations
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{displayName}</CardTitle>
                    <CardDescription>{customer.company || 'Individual Client'}</CardDescription>
                  </div>
                  <Badge variant={customer.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                    {customer.status || 'Active'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                      {customer.email}
                    </a>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <a href={`tel:${customer.phone}`} className="hover:underline">
                      {customer.phone}
                    </a>
                  </div>
                )}
                {customer.company && (
                  <div className="flex items-center gap-3">
                    <Building className="h-5 w-5 text-muted-foreground" />
                    <span>{customer.company}</span>
                  </div>
                )}
                {(customer.address || customer.city || customer.state) && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span>
                      {[customer.address, customer.city, customer.state, customer.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
                {customer.createdAt && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span>Customer since {new Date(customer.createdAt).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {customer.userId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Handshake className="h-4 w-4" />
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="partner-toggle" className="font-medium">Partner Account</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Applies {String(partnerData?.partnerDiscountPercentage ?? 10)}% partner discount at checkout</p>
                    </div>
                    <Switch
                      id="partner-toggle"
                      checked={partnerData?.isPartnerAccount ?? false}
                      onCheckedChange={(checked) => togglePartnerMutation.mutate(checked)}
                      disabled={togglePartnerMutation.isPending}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button className="w-full" variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  Log Call
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Bookings</span>
                  <Badge variant="outline">{customerBookings.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Projects</span>
                  <Badge variant="outline">{customerProjects.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Deals</span>
                  <Badge variant="outline">{deals.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Interactions</span>
                  <Badge variant="outline">{interactions.length}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="deals" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Deals
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-4">
            {customerBookings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customerBookings.map((booking: any) => (
                  <Card 
                    key={booking.id}
                    className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                    onClick={() => openBookingSheet(booking)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {booking.projectName || `Booking #${booking.id}`}
                          </CardTitle>
                          <CardDescription>
                            {(booking.scheduledDate ?? booking.date) ? new Date(booking.scheduledDate ?? booking.date).toLocaleDateString() : 'Date TBD'}
                          </CardDescription>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <Badge variant="outline" className="capitalize">{booking.status}</Badge>
                        {booking.totalAmount && (
                          <span className="font-medium text-primary">
                            ${Number(booking.totalAmount).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No bookings found for this customer.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            {customerProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customerProjects.map((project: any) => (
                  <Card 
                    key={project.id}
                    className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                    onClick={() => openProjectSheet(project)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          <CardDescription>{project.description}</CardDescription>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline" className="capitalize">{project.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No projects found for this customer.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="deals" className="space-y-4">
            {deals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deals.map((deal: any) => (
                  <Card 
                    key={deal.id}
                    className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{deal.name}</CardTitle>
                          <CardDescription>{deal.description}</CardDescription>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <Badge variant="outline" className="capitalize">{deal.stage}</Badge>
                        <span className="font-medium text-primary">
                          ${Number(deal.amount).toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No deals found for this customer.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            {tasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasks.map((task: any) => (
                  <Card 
                    key={task.id}
                    className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                    onClick={() => openTaskSheet(task)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                          <CardDescription>
                            Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                          </CardDescription>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="capitalize">{task.status}</Badge>
                        <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="capitalize">
                          {task.priority}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No tasks found for this customer.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Booking Detail Sheet */}
      <Sheet open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {selectedBooking?.projectName || `Booking #${selectedBooking?.id}`}
            </SheetTitle>
            <SheetDescription>
              View and update booking details
            </SheetDescription>
          </SheetHeader>
          {selectedBooking && (
            <div className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label>Customer</Label>
                <p className="text-sm text-muted-foreground">{selectedBooking.customerName || 'N/A'}</p>
              </div>
              <div className="space-y-2">
                <Label>Scheduled Date</Label>
                <p className="text-sm text-muted-foreground">
                  {(selectedBooking.scheduledDate ?? selectedBooking.date) ? new Date(selectedBooking.scheduledDate ?? selectedBooking.date).toLocaleDateString() : 'TBD'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <p className="text-sm text-muted-foreground">{selectedBooking.projectLocation || 'N/A'}</p>
              </div>
              <div className="space-y-2">
                <Label>Total Amount</Label>
                <p className="text-sm font-medium text-primary">
                  ${Number(selectedBooking.totalAmount || 0).toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editedBookingStatus} onValueChange={setEditedBookingStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1"
                  onClick={() => updateBookingMutation.mutate({ bookingId: selectedBooking.id, status: editedBookingStatus })}
                  disabled={updateBookingMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {updateBookingMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setSelectedBooking(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Project Detail Sheet */}
      <Sheet open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{selectedProject?.name}</SheetTitle>
            <SheetDescription>
              View and update project details
            </SheetDescription>
          </SheetHeader>
          {selectedProject && (
            <div className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground">{selectedProject.description || 'No description'}</p>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString() : 'TBD'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedProject.endDate ? new Date(selectedProject.endDate).toLocaleDateString() : 'TBD'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editedProjectStatus} onValueChange={setEditedProjectStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1"
                  onClick={() => updateProjectMutation.mutate({ projectId: selectedProject.id, status: editedProjectStatus })}
                  disabled={updateProjectMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setSelectedProject(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Task Detail Sheet */}
      <Sheet open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{selectedTask?.title}</SheetTitle>
            <SheetDescription>
              View and update task details
            </SheetDescription>
          </SheetHeader>
          {selectedTask && (
            <div className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground">{selectedTask.description || 'No description'}</p>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'No due date'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Badge variant={selectedTask.priority === 'high' ? 'destructive' : 'secondary'} className="capitalize">
                  {selectedTask.priority}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editedTaskStatus} onValueChange={setEditedTaskStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1"
                  onClick={() => updateTaskMutation.mutate({ taskId: selectedTask.id, status: editedTaskStatus })}
                  disabled={updateTaskMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {updateTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setSelectedTask(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
