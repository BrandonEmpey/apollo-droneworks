import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Trash2 } from "lucide-react";
import { Employee, Department } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Define props
interface EmployeeFormProps {
  employeeId?: number | null;
  onClose: () => void;
}

// Define form schema
const employeeFormSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters" }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  phone: z.string().optional(),
  position: z.string().min(1, { message: "Position is required" }),
  departmentId: z.number({ required_error: "Department is required" }).nullable().default(null),
  payType: z.enum(["hourly", "salary"], {
    required_error: "Pay type is required",
  }),
  payRate: z.string().min(1, { message: "Pay rate is required" }),
  hireDate: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

export default function EmployeeForm({ employeeId, onClose }: EmployeeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = employeeId !== undefined && employeeId !== null && employeeId > 0;
  
  // Setup form
  const form = useForm<z.infer<typeof employeeFormSchema>>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      position: "",
      departmentId: null,
      payType: "hourly",
      payRate: "",
      hireDate: new Date().toISOString().split('T')[0],
      isActive: true,
      notes: "",
    },
  });
  
  // Fetch departments for dropdown
  const { data: departments, isLoading: loadingDepartments } = useQuery<Department[]>({
    queryKey: ["/api/payroll/departments"],
  });
  
  // Fetch employee data if editing
  const { data: employee, isLoading: loadingEmployee } = useQuery<Employee>({
    queryKey: ["/api/payroll/employees", employeeId],
    enabled: isEditing,
  });
  
  // Create mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof employeeFormSchema>) => {
      const response = await apiRequest("POST", "/api/payroll/employees", {
        ...data,
        // Parse the numeric fields
        payRate: parseFloat(data.payRate),
        departmentId: Number(data.departmentId),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/employees"] });
      toast({
        title: "Success",
        description: "Employee created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create employee: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof employeeFormSchema>) => {
      const response = await apiRequest("PATCH", `/api/payroll/employees/${employeeId}`, {
        ...data,
        // Parse the numeric fields
        payRate: parseFloat(data.payRate),
        departmentId: Number(data.departmentId),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/employees", employeeId] });
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update employee: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Set form values when employee data is loaded
  useEffect(() => {
    if (employee) {
      form.reset({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone || "",
        position: employee.position,
        departmentId: employee.departmentId,
        payType: employee.payType as "hourly" | "salary",
        payRate: String(employee.payRate),
        hireDate: employee.hireDate ? employee.hireDate.toString().split('T')[0] : undefined,
        isActive: employee.isActive,
        notes: employee.notes || "",
      });
    }
  }, [employee, form]);
  
  // Handle form submission
  const onSubmit = (data: z.infer<typeof employeeFormSchema>) => {
    if (isEditing) {
      updateEmployeeMutation.mutate(data);
    } else {
      createEmployeeMutation.mutate(data);
    }
  };
  
  // Loading state
  const isLoading = loadingDepartments || (isEditing && loadingEmployee);
  const isSaving = createEmployeeMutation.isPending || updateEmployeeMutation.isPending;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold">
            {isEditing ? "Edit Employee" : "Add New Employee"}
          </h2>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Enter the employee's basic information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
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
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john.doe@example.com" type="email" {...field} />
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
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="(123) 456-7890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active Status</FormLabel>
                        <FormDescription>
                          Inactive employees will not appear in payroll processing
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
                <CardDescription>Job information and department</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <Input placeholder="Drone Operator" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="departmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(Number(value))}
                          defaultValue={field.value ? field.value.toString() : undefined}
                          value={field.value ? field.value.toString() : undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments?.map((department) => (
                              <SelectItem 
                                key={department.id} 
                                value={department.id.toString()}
                              >
                                {department.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hire Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Payroll Information</CardTitle>
                <CardDescription>Pay type and rate information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="payType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pay Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select pay type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="salary">Salary</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="payRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {form.watch("payType") === "hourly" ? "Hourly Rate ($)" : "Annual Salary ($)"}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step={form.watch("payType") === "hourly" ? "0.01" : "1"} 
                            min="0" 
                            placeholder={form.watch("payType") === "hourly" ? "25.00" : "50000"} 
                            {...field} 
                          />
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
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes about this employee..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : isEditing ? "Update Employee" : "Create Employee"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}