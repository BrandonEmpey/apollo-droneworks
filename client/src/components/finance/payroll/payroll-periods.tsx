import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, isAfter, isBefore } from "date-fns";
import { CalendarIcon, PlusCircle, Trash2, Edit, AlertTriangle, Eye } from "lucide-react";
import { PayrollPeriod } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PayrollPeriodDetails from "./payroll-period-details";

// Define the form schema for creating a payroll period
const payrollPeriodSchema = z.object({
  notes: z.string().min(2, { message: "Description must be at least 2 characters" }),
  periodStart: z.date({ required_error: "Start date is required" }),
  periodEnd: z.date({ required_error: "End date is required" }),
  paymentDate: z.date({ required_error: "Payment date is required" }),
});

export default function PayrollPeriods() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [showPeriodDetails, setShowPeriodDetails] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Setup form
  const form = useForm<z.infer<typeof payrollPeriodSchema>>({
    resolver: zodResolver(payrollPeriodSchema),
    defaultValues: {
      notes: "",
    },
  });

  // Fetch all periods
  const { data: periods, isLoading } = useQuery<PayrollPeriod[]>({
    queryKey: ["/api/payroll/periods"],
  });

  // Create a new payroll period
  const createPeriodMutation = useMutation({
    mutationFn: async (data: z.infer<typeof payrollPeriodSchema>) => {
      const response = await apiRequest("POST", "/api/payroll/periods", {
        ...data,
        status: "draft", // Default status for new periods
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/periods"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Payroll period created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create payroll period: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete a payroll period
  const deletePeriodMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/payroll/periods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/periods"] });
      setIsDeleteDialogOpen(false);
      setSelectedPeriodId(null);
      toast({
        title: "Success",
        description: "Payroll period deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete payroll period: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: z.infer<typeof payrollPeriodSchema>) => {
    // Validate that end date is after start date
    if (isAfter(data.periodStart, data.periodEnd)) {
      form.setError("periodEnd", {
        type: "manual",
        message: "End date must be after start date",
      });
      return;
    }

    // Validate that payment date is after or equal to end date
    if (isBefore(data.paymentDate, data.periodEnd)) {
      form.setError("paymentDate", {
        type: "manual",
        message: "Payment date must be on or after the period end date",
      });
      return;
    }

    createPeriodMutation.mutate(data);
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      case "completed":
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Handle view period details
  const handleViewPeriodDetails = (id: number) => {
    setSelectedPeriodId(id);
    setShowPeriodDetails(true);
  };

  // Handle back from period details
  const handleBackFromDetails = () => {
    setShowPeriodDetails(false);
    setSelectedPeriodId(null);
  };

  if (showPeriodDetails && selectedPeriodId) {
    return (
      <PayrollPeriodDetails 
        periodId={selectedPeriodId} 
        onBack={handleBackFromDetails} 
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Payroll Periods</h2>
          <p className="text-muted-foreground">
            Manage your payroll periods and schedules
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Period
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Payroll Period</DialogTitle>
              <DialogDescription>
                Set up a new payroll period for processing employee payments.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period Description</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., January 2025 - First Half" {...field} />
                      </FormControl>
                      <FormDescription>
                        A descriptive name/note for this pay period.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="periodStart"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="periodEnd"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Pay Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                      </Popover>
                      <FormDescription>
                        The date when employees will be paid
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createPeriodMutation.isPending}
                  >
                    {createPeriodMutation.isPending ? "Creating..." : "Create Period"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : periods && periods.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">
                      {period.notes || "Pay Period #" + period.id}
                    </TableCell>
                    <TableCell>
                      {format(new Date(period.periodStart), "MMM d")} - {" "}
                      {format(new Date(period.periodEnd), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(period.paymentDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{getStatusBadge(period.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleViewPeriodDetails(period.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          disabled={period.status !== "draft"}
                          onClick={() => {
                            // Open edit dialog (not implemented yet)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          disabled={period.status !== "draft"}
                          onClick={() => {
                            setSelectedPeriodId(period.id);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <h3 className="text-lg font-medium mb-2">No Payroll Periods</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                You haven't created any payroll periods yet. Create one to start processing payroll.
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create First Period
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this payroll period? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border p-3 bg-amber-50">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-amber-700">
              Only draft periods can be deleted. Periods with payroll data cannot be removed.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedPeriodId !== null) {
                  deletePeriodMutation.mutate(selectedPeriodId);
                }
              }}
              disabled={deletePeriodMutation.isPending}
            >
              {deletePeriodMutation.isPending ? "Deleting..." : "Delete Period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}