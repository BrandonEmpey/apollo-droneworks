import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, PlusCircle, CheckCircle, Clock, Search, Filter } from "lucide-react";
import { ProjectAnalytics, Employee, TimeEntry } from "@shared/schema";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// Form schema for time entry
const timeEntrySchema = z.object({
  employeeId: z.number({
    required_error: "Please select an employee",
  }),
  projectAnalyticsId: z.number().optional(),
  entryDate: z.date({
    required_error: "Date is required",
  }),
  hoursWorked: z.number({
    required_error: "Hours worked is required",
  }).min(0.01, "Hours must be greater than 0").max(24, "Hours cannot exceed 24"),
  description: z.string({
    required_error: "Description is required",
  }).min(3, "Description must be at least 3 characters"),
  billable: z.boolean().default(true),
});

type TimeEntryFormValues = z.infer<typeof timeEntrySchema>;

export default function TimeEntries() {
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      entryDate: new Date(),
      hoursWorked: 0,
      description: "",
      billable: true,
    },
  });

  const { data: timeEntries, isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/payroll/time-entries"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/payroll/employees"],
  });

  const { data: projects } = useQuery<ProjectAnalytics[]>({
    queryKey: ["/api/analytics/projects"],
  });

  const createTimeEntryMutation = useMutation({
    mutationFn: async (data: TimeEntryFormValues) => {
      await apiRequest("POST", "/api/payroll/time-entries", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/time-entries"] });
      toast({
        title: "Success",
        description: "Time entry recorded successfully",
      });
      setAddDialogOpen(false);
      form.reset({
        entryDate: new Date(),
        hoursWorked: 0,
        description: "",
        billable: true,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record time entry: " + error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TimeEntryFormValues) => {
    createTimeEntryMutation.mutate(data);
  };

  const getEmployeeById = (id: number) => {
    return employees?.find(emp => emp.id === id);
  };

  const getProjectById = (id: number | null) => {
    if (!id) return null;
    return projects?.find(proj => proj.id === id);
  };

  const filteredTimeEntries = timeEntries?.filter((entry) => {
    const searchLower = searchTerm.toLowerCase();
    const employee = getEmployeeById(entry.employeeId);
    const project = getProjectById(entry.projectAnalyticsId || null);
    
    return (
      format(new Date(entry.entryDate), "MMMM d, yyyy").toLowerCase().includes(searchLower) ||
      entry.description.toLowerCase().includes(searchLower) ||
      (employee && `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchLower)) ||
      (project && project.projectName.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search time entries..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="shrink-0">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Log Time
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Time Entries</CardTitle>
              <CardDescription>
                Track hours worked on projects
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : filteredTimeEntries && filteredTimeEntries.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTimeEntries.map((entry) => {
                    const employee = getEmployeeById(entry.employeeId);
                    const project = getProjectById(entry.projectAnalyticsId || null);
                    
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {format(new Date(entry.entryDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {project ? project.projectName : 'Non-project work'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {entry.description}
                        </TableCell>
                        <TableCell>
                          {Number(entry.hoursWorked).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {entry.approved ? (
                            <Badge variant="default">Approved</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                          {entry.billable && (
                            <Badge variant="secondary" className="ml-2">
                              Billable
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!entry.approved && (
                            <Button variant="ghost" size="sm">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? "No time entries match your search criteria"
                : "No time entries found. Add your first time entry to get started."}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Log Time Entry</DialogTitle>
            <DialogDescription>
              Record hours worked on a project or task.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
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

              <FormField
                control={form.control}
                name="projectAnalyticsId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => 
                        field.onChange(value ? parseInt(value) : undefined)
                      }
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Non-project work</SelectItem>
                        {projects?.map((project) => (
                          <SelectItem
                            key={project.id}
                            value={project.id.toString()}
                          >
                            {project.projectName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Link this time entry to a specific project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="entryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
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
                name="hoursWorked"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hours Worked</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.25"
                          min="0.25"
                          max="24"
                          className="pl-9"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => {
                            field.onChange(
                              e.target.value === ""
                                ? 0
                                : parseFloat(e.target.value)
                            );
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Enter hours in decimal format (e.g., 7.5 for 7 hours and 30 minutes)
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
                        placeholder="Describe the work performed"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Billable</FormLabel>
                      <FormDescription>
                        Is this time billable to a client?
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

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTimeEntryMutation.isPending}>
                  {createTimeEntryMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    "Save Time Entry"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}