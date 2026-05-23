import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Booking, Service, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Loader2, Calendar, Clock, MapPin, Banknote, User as UserIcon, FileDown } from "lucide-react";
import { format } from "date-fns";

interface BookingManagerProps {
  bookings: Booking[];
  services: Service[];
  users?: User[];
}

export function BookingManager({ bookings, services, users }: BookingManagerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Form data for booking editing
  const [bookingForm, setBookingForm] = useState({
    userId: 0,
    serviceId: 0,
    date: "",
    status: "",
    address: "",
    notes: "",
    totalPrice: 0,
    paymentStatus: ""
  });
  
  // Booking Mutations
  const updateBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/bookings/${data.id}`, {
        userId: data.userId,
        serviceId: data.serviceId,
        date: data.date,
        status: data.status,
        projectLocation: data.address,
        notes: data.notes,
        totalPrice: data.totalPrice,
        paymentStatus: data.paymentStatus
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Updated",
        description: "The booking has been successfully updated.",
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update booking: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/bookings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Deleted",
        description: "The booking has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete booking: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentBooking) {
      updateBookingMutation.mutate({
        id: currentBooking.id,
        ...bookingForm,
      });
    }
  };
  
  // Open dialog for editing booking
  const openEditDialog = (booking: Booking) => {
    setCurrentBooking(booking);
    setBookingForm({
      userId: booking.userId,
      serviceId: booking.serviceId,
      date: new Date(booking.scheduledDate ?? booking.date).toISOString().slice(0, 16), // Format for datetime-local input
      status: booking.status,
      address: booking.projectLocation || "",
      notes: booking.notes || "",
      totalPrice: booking.totalPrice,
      paymentStatus: booking.paymentStatus
    });
    setIsDialogOpen(true);
  };

  // Format price for display - displays whole dollars (prices stored in dollars)
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };
  
  // Get service name by ID
  const getServiceName = (serviceId: number) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : `Service #${serviceId}`;
  };
  
  // Get user name by ID
  const getUserName = (userId: number) => {
    if (!users) return `User #${userId}`;
    
    const user = users.find(u => u.id === userId);
    if (!user) return `User #${userId}`;
    
    return user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`
      : user.username;
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge className="bg-green-600">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-600">In Progress</Badge>;
      case "pending":
        return <Badge className="bg-yellow-600">Pending</Badge>;
      case "cancelled":
        return <Badge className="bg-red-600">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // Get payment status badge
  const getPaymentBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return <Badge className="bg-green-600">Paid</Badge>;
      case "pending":
        return <Badge className="bg-yellow-600">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-600">Failed</Badge>;
      case "unpaid":
        return <Badge className="bg-gray-600">Unpaid</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Filter bookings by status
  const filteredBookings = statusFilter === "all" 
    ? bookings 
    : bookings.filter(booking => booking.status.toLowerCase() === statusFilter);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-offwhite">Manage Bookings</h2>
        <div className="flex space-x-2">
          <Select 
            value={statusFilter} 
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[180px] bg-[#080d17] border-gold-dark/30">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-[#0b111f] border-gold-dark/30">
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {filteredBookings.length === 0 ? (
        <Card className="bg-[#132642] border-gold-dark/30">
          <CardContent className="pt-6">
            <p className="text-center text-offwhite">
              {statusFilter === "all" 
                ? "No bookings found."
                : `No ${statusFilter} bookings found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table className="border border-gold-dark/30 rounded-md overflow-hidden">
            <TableHeader className="bg-[#080d17]">
              <TableRow>
                <TableHead className="text-offwhite">ID</TableHead>
                <TableHead className="text-offwhite">Service</TableHead>
                <TableHead className="text-offwhite">Client</TableHead>
                <TableHead className="text-offwhite">Date/Time</TableHead>
                <TableHead className="text-offwhite">Location</TableHead>
                <TableHead className="text-offwhite text-center">Status</TableHead>
                <TableHead className="text-offwhite text-right">Price</TableHead>
                <TableHead className="text-offwhite text-center">Payment</TableHead>
                <TableHead className="text-offwhite text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow 
                  key={booking.id}
                  className="bg-[#132642] border-b border-gold-dark/10 hover:bg-[#1c304d]"
                >
                  <TableCell className="font-medium text-offwhite">
                    #{booking.id}
                  </TableCell>
                  <TableCell className="text-offwhite">
                    {getServiceName(booking.serviceId)}
                  </TableCell>
                  <TableCell className="text-offwhite">
                    <div className="flex items-center">
                      <UserIcon className="h-3.5 w-3.5 mr-1.5 text-offwhite/60" />
                      {getUserName(booking.userId)}
                    </div>
                  </TableCell>
                  <TableCell className="text-offwhite/80">
                    {(() => {
                      const apptDate = booking.scheduledDate ? new Date(booking.scheduledDate) : booking.date ? new Date(booking.date) : null;
                      return apptDate ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center">
                            <Calendar className="h-3.5 w-3.5 mr-1.5 text-offwhite/60 shrink-0" />
                            <span>{format(apptDate, "MMM d, yyyy")}</span>
                          </div>
                          <div className="flex items-center text-sm text-offwhite/60">
                            <Clock className="h-3 w-3 mr-1.5 text-offwhite/40 shrink-0" />
                            <span>{format(apptDate, "h:mm a")}</span>
                          </div>
                        </div>
                      ) : <span className="text-offwhite/30 text-sm">—</span>;
                    })()}
                  </TableCell>
                  <TableCell className="text-offwhite/80 max-w-[160px]">
                    {booking.projectLocation ? (
                      <div className="flex items-start">
                        <MapPin className="h-3.5 w-3.5 mr-1.5 text-offwhite/60 mt-0.5 flex-shrink-0" />
                        <span className="truncate text-sm">{booking.projectLocation}</span>
                      </div>
                    ) : (
                      <span className="text-offwhite/30 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(booking.status)}
                  </TableCell>
                  <TableCell className="text-right text-offwhite/80">
                    {formatPrice(booking.totalPrice)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getPaymentBadge(booking.paymentStatus)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Download receipt PDF"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = `/api/receipts/${booking.id}/pdf`;
                          a.download = `APLDW-${String(booking.id).padStart(6, "0")}.pdf`;
                          a.click();
                        }}
                        className="h-8 w-8 text-offwhite hover:text-gold hover:bg-transparent"
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit booking"
                        onClick={() => openEditDialog(booking)}
                        className="h-8 w-8 text-offwhite hover:text-gold hover:bg-transparent"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete booking"
                        className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-transparent"
                        disabled={deleteBookingMutation.isPending}
                        onClick={() => deleteBookingMutation.mutate(booking.id)}
                      >
                        {deleteBookingMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#0b111f] border-gold-dark/30 text-offwhite">
          <DialogHeader>
            <DialogTitle className="text-xl text-gold">
              Edit Booking #{currentBooking?.id}
            </DialogTitle>
            <DialogDescription>
              Update the details of this booking.
            </DialogDescription>
          </DialogHeader>

          {currentBooking?.projectLocation && (
            <div className="flex items-start gap-2 px-1 py-2 bg-[#080d17]/60 rounded-md border border-gold-dark/20">
              <MapPin className="h-4 w-4 text-gold mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-offwhite/60 mb-0.5">Project Location</p>
                <p className="text-sm text-offwhite font-medium">{currentBooking.projectLocation}</p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="userId">Client</Label>
                  <Select 
                    value={bookingForm.userId.toString()} 
                    onValueChange={(value) => setBookingForm({ ...bookingForm, userId: parseInt(value) })}
                    disabled={!users || users.length === 0}
                  >
                    <SelectTrigger id="userId" className="bg-[#080d17] border-gold-dark/30">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0b111f] border-gold-dark/30">
                      {users && users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="serviceId">Service</Label>
                  <Select 
                    value={bookingForm.serviceId.toString()} 
                    onValueChange={(value) => setBookingForm({ ...bookingForm, serviceId: parseInt(value) })}
                  >
                    <SelectTrigger id="serviceId" className="bg-[#080d17] border-gold-dark/30">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0b111f] border-gold-dark/30">
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date & Time</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={bookingForm.date}
                    onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                    className="bg-[#080d17] border-gold-dark/30"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={bookingForm.status} 
                    onValueChange={(value) => setBookingForm({ ...bookingForm, status: value })}
                  >
                    <SelectTrigger id="status" className="bg-[#080d17] border-gold-dark/30">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0b111f] border-gold-dark/30">
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Service location address"
                  value={bookingForm.address}
                  onChange={(e) => setBookingForm({ ...bookingForm, address: e.target.value })}
                  className="bg-[#080d17] border-gold-dark/30"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="totalPrice">Price (in cents)</Label>
                  <Input
                    id="totalPrice"
                    type="number"
                    value={bookingForm.totalPrice.toString()}
                    onChange={(e) => setBookingForm({ ...bookingForm, totalPrice: parseInt(e.target.value) })}
                    className="bg-[#080d17] border-gold-dark/30"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select 
                    value={bookingForm.paymentStatus} 
                    onValueChange={(value) => setBookingForm({ ...bookingForm, paymentStatus: value })}
                  >
                    <SelectTrigger id="paymentStatus" className="bg-[#080d17] border-gold-dark/30">
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0b111f] border-gold-dark/30">
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes or special requirements"
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  className="min-h-[100px] bg-[#080d17] border-gold-dark/30"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-gold-dark/30 text-offwhite hover:bg-[#132642]"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gold text-black hover:bg-gold-light"
                disabled={updateBookingMutation.isPending}
              >
                {updateBookingMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}