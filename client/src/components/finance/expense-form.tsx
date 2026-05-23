import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Loader2, ReceiptIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Expense interface matching the database model
interface Expense {
  id: number;
  amount: number;
  date: string;
  description: string;
  categoryId: number;
  vendor: string;
  notes: string;
  isDeductible: boolean;
  paymentMethod: string;
  receiptUrl: string;
}

// Expense schema for validation
const expenseSchema = z.object({
  amount: z
    .string()
    .nonempty("Amount is required")
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      "Amount must be a positive number"
    ),
  date: z.date({
    required_error: "Date is required",
    invalid_type_error: "Date format is invalid",
  }),
  description: z.string().default(""),
  categoryId: z.string().nonempty("Category is required"),
  vendor: z.string().default(""),
  notes: z.string().default(""),
  isDeductible: z.boolean().default(false),
  paymentMethod: z.string().default(""),
  receiptUrl: z.string().default(""),
});

// ExpenseFormProps interface
interface ExpenseFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  expenseId?: number | null;
}

export default function ExpenseForm({
  onClose,
  onSuccess,
  expenseId = null,
}: ExpenseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form definition
  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: "",
      date: new Date(),
      description: "",
      categoryId: "",
      vendor: "",
      notes: "",
      isDeductible: false,
      paymentMethod: "",
      receiptUrl: "",
    },
  });

  // Fetch expense categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/expense-categories"],
  });

  // Fetch expense data if editing
  const { data: expense, isLoading: expenseLoading } = useQuery<Expense | undefined>({
    queryKey: [`/api/expenses/${expenseId}`],
    enabled: expenseId !== null,
  });

  // Set form values when editing existing expense
  useEffect(() => {
    if (expense && !expenseLoading) {
      form.reset({
        amount: expense.amount.toString(),
        date: new Date(expense.date),
        description: expense.description || "",
        categoryId: expense.categoryId.toString(),
        vendor: expense.vendor || "",
        notes: expense.notes || "",
        isDeductible: expense.isDeductible || false,
        paymentMethod: expense.paymentMethod || "",
        receiptUrl: expense.receiptUrl || "",
      });
    }
  }, [expense, expenseLoading, form]);

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/expenses", formData, {
        'Content-Type': 'multipart/form-data',
      } as any);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      if (onSuccess) onSuccess();
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add expense",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("PATCH", `/api/expenses/${expenseId}`, formData, {
        'Content-Type': 'multipart/form-data',
      } as any);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: [`/api/expenses/${expenseId}`] });
      if (onSuccess) onSuccess();
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update expense",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Form submission handler
  const onSubmit = async (values: z.infer<typeof expenseSchema>) => {
    setIsSubmitting(true);
    
    // Create FormData for file upload
    const formData = new FormData();
    
    // Add form fields to FormData
    formData.append("amount", values.amount);
    formData.append("date", values.date.toISOString().split("T")[0]);
    formData.append("categoryId", values.categoryId);
    formData.append("isDeductible", values.isDeductible.toString());
    
    // Add optional fields if they exist
    if (values.description) formData.append("description", values.description);
    if (values.vendor) formData.append("vendor", values.vendor);
    if (values.notes) formData.append("notes", values.notes);
    if (values.paymentMethod) formData.append("paymentMethod", values.paymentMethod);
    
    // Add receipt file if exists
    if (receiptFile) {
      formData.append("receipt", receiptFile);
    }
    
    // Determine if creating or updating
    if (expenseId) {
      updateExpenseMutation.mutate(formData);
    } else {
      createExpenseMutation.mutate(formData);
    }
  };

  // Handle form close
  const handleClose = () => {
    form.reset();
    setReceiptFile(null);
    setIsSubmitting(false);
    onClose();
  };

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setReceiptFile(event.target.files[0]);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] bg-gray-900 border-gray-700 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {expenseId ? "Edit Expense" : "Add New Expense"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {expenseId
              ? "Update expense details"
              : "Enter the details of your new expense"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">Expense Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amount Field */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Amount*</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-white">$</span>
                          <Input
                            placeholder="0.00"
                            type="number"
                            step="0.01"
                            min="0.01"
                            className="pl-8 bg-gray-800 border-gray-600 text-white"
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
                      <FormLabel className="text-white">Date*</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:text-white",
                                !field.value && "text-gray-400"
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
                            disabled={(date) => date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Category Field */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Category*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoriesLoading ? (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="ml-2">Loading categories...</span>
                          </div>
                        ) : (
                          Array.isArray(categories) && categories.map((category) => (
                            <SelectItem
                              key={category.id}
                              value={category.id.toString()}
                            >
                              {category.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description Field */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief description of the expense"
                        className="bg-gray-800 border-gray-600 text-white"
                        {...field}
                        value={field.value || ""}
                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

              {/* Vendor Field */}
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Vendor/Merchant</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Where was this purchased from?"
                        className="bg-gray-800 border-gray-600 text-white"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
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
                    <FormLabel className="text-white">Payment Method</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || ""}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
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
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tax Deductible Checkbox */}
              <FormField
                control={form.control}
                name="isDeductible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-700 bg-gray-800/50 p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-gray-500"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-white">Tax Deductible</FormLabel>
                      <FormDescription className="text-gray-400">
                        Mark if this expense is tax deductible for business purposes
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Receipt Upload */}
              <div className="rounded-md border border-gray-700 bg-gray-800/50 p-4">
                <FormLabel className="block mb-2 text-white">Receipt Upload</FormLabel>
                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    className="flex-1 bg-gray-800 border-gray-600 text-white file:text-white"
                  />
                  {receiptFile && (
                    <p className="text-sm text-gray-400 truncate">
                      {receiptFile.name}
                    </p>
                  )}
                </div>
                {!receiptFile && expense?.receiptUrl && (
                  <div className="flex items-center mt-2 text-sm text-blue-400">
                    <ReceiptIcon className="h-4 w-4 mr-1" />
                    <a
                      href={expense.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      View existing receipt
                    </a>
                  </div>
                )}
                <FormDescription className="mt-2 text-gray-400">
                  Upload a photo or scan of your receipt (max 5MB)
                </FormDescription>
              </div>

              {/* Notes Field */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this expense"
                        className="resize-none bg-gray-800 border-gray-600 text-white"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gold text-black hover:bg-gold/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {expenseId ? "Updating..." : "Saving..."}
                  </>
                ) : (
                  <>{expenseId ? "Update" : "Save"}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}