import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

// Define income schema
const incomeSchema = z.object({
  amount: z.string().min(1, {
    message: "Amount is required.",
  }),
  date: z.date(),
  description: z.string().optional(),
  client: z.string().optional(),
  category: z.string().optional(),
  paymentMethod: z.string().optional(),
  invoiceId: z.string().optional(),
  notes: z.string().optional(),
  projectId: z.string().optional(),
  bookingId: z.string().optional(),
  quoteId: z.string().optional(),
  status: z.string(),
  taxWithheld: z.string().optional(),
});

interface IncomeFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  incomeId?: number | null;
}

interface Income {
  id: number;
  amount: number;
  date: string;
  description?: string;
  client?: string;
  category?: string;
  paymentMethod?: string;
  invoiceId?: string;
  notes?: string;
  projectId?: number;
  bookingId?: number;
  quoteId?: number;
  status: string;
  taxWithheld?: number;
  attachmentUrl?: string;
}

interface Project {
  id: number;
  name: string;
}

interface Booking {
  id: number;
  serviceName: string;
  date: string;
  scheduledDate?: string;
  customerName?: string;
}

interface Quote {
  id: number;
  clientName: string;
  date: string;
}

export default function IncomeForm({
  onClose,
  onSuccess,
  incomeId = null,
}: IncomeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Form definition
  const form = useForm<z.infer<typeof incomeSchema>>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      amount: "",
      date: new Date(),
      description: "",
      client: "",
      category: "",
      paymentMethod: "",
      invoiceId: "",
      notes: "",
      projectId: "",
      bookingId: "",
      quoteId: "",
      status: "completed",
      taxWithheld: "",
    },
  });

  // Income categories
  const incomeCategories = [
    { id: "service", name: "Service Fee" },
    { id: "drone_photography", name: "Drone Photography" },
    { id: "aerial_videography", name: "Aerial Videography" },
    { id: "photogrammetry", name: "Photogrammetry" },
    { id: "mapping", name: "Mapping & Surveying" },
    { id: "inspection", name: "Inspection Services" },
    { id: "consulting", name: "Consulting" },
    { id: "training", name: "Training Services" },
    { id: "equipment_rental", name: "Equipment Rental" },
    { id: "post_production", name: "Post-Production" },
    { id: "other", name: "Other Income" },
  ];

  // Income statuses
  const statuses = [
    { id: "pending", name: "Pending" },
    { id: "completed", name: "Completed" },
    { id: "cancelled", name: "Cancelled" },
    { id: "refunded", name: "Refunded" },
    { id: "partially_paid", name: "Partially Paid" },
  ];

  // Fetch income data if editing
  const { data: income, isLoading: incomeLoading } = useQuery<Income>({
    queryKey: [`/api/income/${incomeId}`],
    enabled: incomeId !== null,
  });

  // Fetch projects for linking
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: true,
  });

  // Fetch bookings for linking
  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: true,
  });

  // Fetch quotes for linking
  const { data: quotes } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
    enabled: true,
  });

  // Set form values when editing existing income
  useEffect(() => {
    if (income && !incomeLoading) {
      form.reset({
        amount: income.amount.toString(),
        date: new Date(income.date),
        description: income.description || "",
        client: income.client || "",
        category: income.category || "",
        paymentMethod: income.paymentMethod || "",
        invoiceId: income.invoiceId || "",
        notes: income.notes || "",
        projectId: income.projectId?.toString() || "",
        bookingId: income.bookingId?.toString() || "",
        quoteId: income.quoteId?.toString() || "",
        status: income.status || "completed",
        taxWithheld: income.taxWithheld?.toString() || "",
      });
    }
  }, [income, incomeLoading, form]);

  // Create income mutation
  const createIncomeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/income", formData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Income added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/income"] });
      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add income",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Update income mutation
  const updateIncomeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("PATCH", `/api/income/${incomeId}`, formData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Income updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/income"] });
      queryClient.invalidateQueries({ queryKey: [`/api/income/${incomeId}`] });
      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update income",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Form submission handler
  const onSubmit = async (values: z.infer<typeof incomeSchema>) => {
    setIsSubmitting(true);
    
    // Create FormData for file upload
    const formData = new FormData();
    
    // Add form fields to FormData
    formData.append("amount", values.amount);
    formData.append("date", values.date.toISOString().split("T")[0]);
    formData.append("status", values.status);
    
    // Add optional fields if they exist
    if (values.description) formData.append("description", values.description);
    if (values.client) formData.append("client", values.client);
    if (values.category) formData.append("category", values.category);
    if (values.paymentMethod) formData.append("paymentMethod", values.paymentMethod);
    if (values.invoiceId) formData.append("invoiceId", values.invoiceId);
    if (values.notes) formData.append("notes", values.notes);
    if (values.taxWithheld) formData.append("taxWithheld", values.taxWithheld);
    
    // Add related items if selected
    if (values.projectId) formData.append("projectId", values.projectId);
    if (values.bookingId) formData.append("bookingId", values.bookingId);
    if (values.quoteId) formData.append("quoteId", values.quoteId);
    
    // Add attachment file if exists
    if (attachmentFile) {
      formData.append("attachment", attachmentFile);
    }
    
    // Determine if creating or updating
    if (incomeId) {
      updateIncomeMutation.mutate(formData);
    } else {
      createIncomeMutation.mutate(formData);
    }
  };

  // Handle form close
  const handleClose = () => {
    form.reset();
    setAttachmentFile(null);
    setIsSubmitting(false);
    setActiveTab("general");
    onClose();
  };

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setAttachmentFile(event.target.files[0]);
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="space-y-4">
      <div className="sm:max-w-[700px]">
        <div className="mb-4">
          <h3 className="text-xl font-semibold">
            {incomeId ? "Edit Income" : "Add New Income"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {incomeId
              ? "Update income details"
              : "Enter the details of your new income"}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="general" value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="relationships">Relationships</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Amount Field */}
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount*</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5">$</span>
                            <Input
                              placeholder="0.00"
                              type="number"
                              step="0.01"
                              min="0.01"
                              className="pl-8"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date Field */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date*</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "MMM dd, yyyy")
                                ) : (
                                  <span>Select date</span>
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

                {/* Description Field */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of the income" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Client Field */}
                <FormField
                  control={form.control}
                  name="client"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <FormControl>
                        <Input placeholder="Client or customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category Field */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {incomeCategories.map((category) => (
                            <SelectItem
                              key={category.id}
                              value={category.id}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="details" className="space-y-4">
                {/* Status Field */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statuses.map((status) => (
                            <SelectItem
                              key={status.id}
                              value={status.id}
                            >
                              {status.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Payment Method Field */}
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="How was this paid?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="debit_card">Debit Card</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Invoice ID Field */}
                <FormField
                  control={form.control}
                  name="invoiceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Invoice reference number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tax Withheld Field */}
                <FormField
                  control={form.control}
                  name="taxWithheld"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Withheld</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5">$</span>
                          <Input
                            placeholder="0.00"
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-8"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Amount of tax withheld from this payment, if applicable
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Attachment Upload */}
                <div className="rounded-md border p-4">
                  <FormLabel className="block mb-2">Attachment</FormLabel>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                    {attachmentFile && (
                      <p className="text-sm text-muted-foreground truncate">
                        {attachmentFile.name}
                      </p>
                    )}
                  </div>
                  {!attachmentFile && income?.attachmentUrl && (
                    <div className="flex items-center mt-2 text-sm text-blue-600">
                      <FileText className="h-4 w-4 mr-1" />
                      <a
                        href={income.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View existing attachment
                      </a>
                    </div>
                  )}
                  <FormDescription className="mt-2">
                    Upload invoice, receipt, or other documentation (max 5MB)
                  </FormDescription>
                </div>
              </TabsContent>
              
              <TabsContent value="relationships" className="space-y-4">
                {/* Project ID Field */}
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Associated Project</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "_none_" ? "" : val)}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="_none_">None</SelectItem>
                          {Array.isArray(projects) && projects.length > 0 ? (
                            projects.map((project) => (
                              <SelectItem
                                key={project.id}
                                value={project.id.toString()}
                              >
                                {project.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="_no_projects_" disabled>
                              No projects available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Link this income to a specific project
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Booking ID Field */}
                <FormField
                  control={form.control}
                  name="bookingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Associated Booking</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          const newVal = val === "_none_" ? "" : val;
                          field.onChange(newVal);
                          if (newVal && Array.isArray(bookings)) {
                            const booking = bookings.find((b) => b.id.toString() === newVal);
                            if (booking) {
                              const rawDate = booking.scheduledDate ?? booking.date;
                              const parsed = rawDate ? new Date(rawDate) : null;
                              if (parsed && !isNaN(parsed.getTime())) {
                                form.setValue("date", parsed);
                              }
                              if (booking.customerName) {
                                form.setValue("client", booking.customerName);
                              }
                            }
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a booking" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="_none_">None</SelectItem>
                          {Array.isArray(bookings) && bookings.length > 0 ? (
                            bookings.map((booking) => (
                              <SelectItem
                                key={booking.id}
                                value={booking.id.toString()}
                              >
                                {booking.serviceName} - {new Date(booking.scheduledDate ?? booking.date).toLocaleDateString()}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="_no_bookings_" disabled>
                              No bookings available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Link this income to a specific booking
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quote ID Field */}
                <FormField
                  control={form.control}
                  name="quoteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Associated Quote</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          const newVal = val === "_none_" ? "" : val;
                          field.onChange(newVal);
                          if (newVal && Array.isArray(quotes)) {
                            const quote = quotes.find((q) => q.id.toString() === newVal);
                            if (quote?.clientName) {
                              form.setValue("client", quote.clientName);
                            }
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a quote" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="_none_">None</SelectItem>
                          {Array.isArray(quotes) && quotes.length > 0 ? (
                            quotes.map((quote) => (
                              <SelectItem
                                key={quote.id}
                                value={quote.id.toString()}
                              >
                                {quote.clientName} - {new Date(quote.date).toLocaleDateString()}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="_no_quotes_" disabled>
                              No quotes available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Link this income to a specific quote
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes Field */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes for this income entry"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {incomeId ? "Updating..." : "Saving..."}
                  </>
                ) : (
                  <>{incomeId ? "Update" : "Save"}</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}