import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Employee, ProjectAnalytics, TimeEntry } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft } from "lucide-react";

interface TimeEntryFormProps {
  timeEntryId?: number | null;
  employeeId?: number | null;
  onClose: () => void;
}

// Define form schema
const timeEntryFormSchema = z.object({
  description: z.string().min(2, { message: "Description must be at least 2 characters" }),
  entryDate: z.string().min(1, { message: "Entry date is required" }),
  hoursWorked: z.string().min(1, { message: "Hours worked is required" }),
  employeeId: z.number().nullable().optional(),
  projectAnalyticsId: z.number().nullable().optional(),
  billable: z.boolean().default(false),
  approved: z.boolean().default(false),
});

export default function TimeEntryForm({ timeEntryId, employeeId, onClose }: TimeEntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = timeEntryId !== undefined && timeEntryId !== null && timeEntryId > 0;

  // Setup form
  const form = useForm<z.infer<typeof timeEntryFormSchema>>({
    resolver: zodResolver(timeEntryFormSchema),
    defaultValues: {
      description: "",
      entryDate: new Date().toISOString().split("T")[0],
      hoursWorked: "",
      employeeId: employeeId || null,
      projectAnalyticsId: null,
      billable: false,
      approved: false,
    },
  });

  // Fetch employees for dropdown
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/payroll/employees"],
    enabled: !employeeId, // Only fetch if employeeId is not provided
  });

  // Fetch projects for dropdown
  const { data: projects } = useQuery<ProjectAnalytics[]>({
    queryKey: ["/api/analytics/projects"],
  });

  // Fetch time entry if editing
  const { data: timeEntry, isLoading: loadingTimeEntry } = useQuery<TimeEntry>({
    queryKey: ["/api/payroll/time-entries", timeEntryId],
    enabled: isEditing,
  });

  // Set form values when time entry data is loaded
  useEffect(() => {
    if (timeEntry) {
      form.reset({
        description: timeEntry.description,
        entryDate: new Date(timeEntry.entryDate).toISOString().split("T")[0],
        hoursWorked: timeEntry.hoursWorked,
        employeeId: timeEntry.employeeId,
        projectAnalyticsId: timeEntry.projectAnalyticsId,
        billable: timeEntry.billable,
        approved: timeEntry.approved,
      });
    }
  }, [timeEntry, form]);

  // Create mutation
  const createTimeEntryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof timeEntryFormSchema>) => {
      const response = await apiRequest("POST", "/api/payroll/time-entries", {
        ...data,
        // Parse numeric values
        hoursWorked: data.hoursWorked,
        employeeId: data.employeeId || null,
        projectAnalyticsId: data.projectAnalyticsId || null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/time-entries"] });
      if (employeeId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/payroll/employees/${employeeId}/time-entries`] 
        });
      }
      toast({
        title: "Success",
        description: "Time entry created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create time entry: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateTimeEntryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof timeEntryFormSchema>) => {
      const response = await apiRequest("PATCH", `/api/payroll/time-entries/${timeEntryId}`, {
        ...data,
        // Parse numeric values
        hoursWorked: data.hoursWorked,
        employeeId: data.employeeId || null,
        projectAnalyticsId: data.projectAnalyticsId || null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/time-entries", timeEntryId] });
      if (employeeId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/payroll/employees/${employeeId}/time-entries`] 
        });
      }
      toast({
        title: "Success",
        description: "Time entry updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update time entry: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: z.infer<typeof timeEntryFormSchema>) => {
    if (isEditing) {
      updateTimeEntryMutation.mutate(data);
    } else {
      createTimeEntryMutation.mutate(data);
    }
  };

  // Loading state
  const isLoading = isEditing && loadingTimeEntry;
  const isSaving = createTimeEntryMutation.isPending || updateTimeEntryMutation.isPending;

  // Format project name for dropdown
  const getProjectName = (project: ProjectAnalytics) => {
    return `${project.projectName || `Project #${project.id}`} - ${project.serviceType || 'Unknown Service'}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold">
            {isEditing ? "Edit Time Entry" : "Add New Time Entry"}
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
                <CardTitle>Time Entry Details</CardTitle>
                <CardDescription>Record employee time for payroll and project tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!employeeId && (
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          defaultValue={field.value ? field.value.toString() : undefined}
                          value={field.value ? field.value.toString() : undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an employee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {employees?.map((employee) => (
                              <SelectItem
                                key={employee.id}
                                value={employee.id.toString()}
                              >
                                {employee.firstName} {employee.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="entryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hoursWorked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours Worked</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.25"
                          min="0"
                          placeholder="8"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter hours in decimal format (e.g., 8.5 for 8 hours 30 minutes)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the work performed..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectAnalyticsId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                        defaultValue={field.value ? field.value.toString() : undefined}
                        value={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {projects?.map((project) => (
                            <SelectItem
                              key={project.id}
                              value={project.id.toString()}
                            >
                              {getProjectName(project)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Associate this time entry with a project for analytics
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Billable</FormLabel>
                        <FormDescription>
                          Indicates if this time can be billed to a client
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

                <FormField
                  control={form.control}
                  name="approved"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Approved</FormLabel>
                        <FormDescription>
                          Time entries must be approved for payroll processing
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
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? isEditing
                      ? "Updating..."
                      : "Creating..."
                    : isEditing
                      ? "Update Time Entry"
                      : "Create Time Entry"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}
    </div>
  );
}