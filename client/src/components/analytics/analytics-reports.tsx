import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DateRange } from "@/types/date-range";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import DateRangePicker from "@/components/finance/date-range-picker";
import { subMonths } from "date-fns";
import {
  ChevronDown,
  Download,
  Edit,
  FileBarChart,
  FileCog,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AnalyticsReportsProps {
  dateRange: DateRange;
}

// Define schema for report form
const reportFormSchema = z.object({
  name: z.string().min(1, "Report name is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Report type is required"),
  metrics: z.array(z.string()).min(1, "At least one metric is required"),
  groupBy: z.array(z.string()).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  isDefault: z.boolean().default(false),
  isScheduled: z.boolean().default(false),
  scheduleFrequency: z.string().optional(),
  recipients: z.string().optional(),
});

// Define report types
const REPORT_TYPES = [
  { value: "project", label: "Project Performance" },
  { value: "drone", label: "Equipment Performance" },
  { value: "client", label: "Client Analytics" },
  { value: "marketing", label: "Marketing Performance" },
  { value: "custom", label: "Custom Report" },
];

// Define grouping options by report type
const GROUP_BY_OPTIONS: Record<string, { value: string; label: string }[]> = {
  project: [
    { value: "serviceType", label: "Service Type" },
    { value: "clientType", label: "Client Type" },
    { value: "location", label: "Location" },
    { value: "month", label: "Month" },
    { value: "quarter", label: "Quarter" },
  ],
  drone: [
    { value: "droneModel", label: "Drone Model" },
    { value: "status", label: "Status" },
    { value: "month", label: "Month" },
  ],
  client: [
    { value: "clientType", label: "Client Type" },
    { value: "acquisitionSource", label: "Acquisition Source" },
    { value: "month", label: "Month" },
  ],
  marketing: [
    { value: "source", label: "Traffic Source" },
    { value: "medium", label: "Medium" },
    { value: "campaign", label: "Campaign" },
    { value: "month", label: "Month" },
  ],
  custom: [
    { value: "month", label: "Month" },
    { value: "quarter", label: "Quarter" },
    { value: "year", label: "Year" },
  ],
};

// Define metrics options by report type
const METRICS_OPTIONS: Record<string, { value: string; label: string }[]> = {
  project: [
    { value: "projectCount", label: "Project Count" },
    { value: "revenue", label: "Revenue" },
    { value: "costs", label: "Costs" },
    { value: "profit", label: "Profit" },
    { value: "profitMargin", label: "Profit Margin" },
    { value: "flightHours", label: "Flight Hours" },
    { value: "processingHours", label: "Processing Hours" },
    { value: "qualityScore", label: "Quality Score" },
  ],
  drone: [
    { value: "flightHours", label: "Flight Hours" },
    { value: "batteryCycles", label: "Battery Cycles" },
    { value: "batteryHealth", label: "Battery Health" },
    { value: "errorCounts", label: "Error Counts" },
    { value: "maintenanceFrequency", label: "Maintenance Frequency" },
    { value: "cameraShutterCount", label: "Camera Shutter Count" },
  ],
  client: [
    { value: "clientCount", label: "Client Count" },
    { value: "projectCount", label: "Project Count" },
    { value: "totalSpend", label: "Total Spend" },
    { value: "averageProjectValue", label: "Avg Project Value" },
    { value: "lifetimeValue", label: "Lifetime Value" },
    { value: "satisfactionScore", label: "Satisfaction Score" },
    { value: "retentionRate", label: "Retention Rate" },
  ],
  marketing: [
    { value: "visitors", label: "Visitors" },
    { value: "uniqueVisitors", label: "Unique Visitors" },
    { value: "pageViews", label: "Page Views" },
    { value: "bounceRate", label: "Bounce Rate" },
    { value: "timeOnSite", label: "Time on Site" },
    { value: "conversionRate", label: "Conversion Rate" },
    { value: "leads", label: "Leads" },
    { value: "costPerLead", label: "Cost per Lead" },
    { value: "revenue", label: "Revenue" },
    { value: "roi", label: "ROI" },
  ],
  custom: [
    { value: "projectCount", label: "Project Count" },
    { value: "revenue", label: "Revenue" },
    { value: "profit", label: "Profit" },
    { value: "clientCount", label: "Client Count" },
    { value: "flightHours", label: "Flight Hours" },
    { value: "visitors", label: "Website Visitors" },
    { value: "leads", label: "Leads" },
  ],
};

// Schedule frequency options
const SCHEDULE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const AnalyticsReports = ({ dateRange }: AnalyticsReportsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReportType, setSelectedReportType] = useState<string>("all");
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form setup
  const form = useForm<z.infer<typeof reportFormSchema>>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "",
      metrics: [],
      groupBy: [],
      isDefault: false,
      isScheduled: false,
      scheduleFrequency: "monthly",
      recipients: "",
    },
  });

  // Watch form values
  const watchReportType = form.watch("type");
  const watchIsScheduled = form.watch("isScheduled");

  // Form submission
  const onSubmit = async (values: z.infer<typeof reportFormSchema>) => {
    try {
      // Prepare report configuration data
      const reportData = {
        name: values.name,
        description: values.description || "",
        type: values.type,
        configuration: {
          metrics: values.metrics,
          filters: {},
          groupBy: values.groupBy || [],
          startDate: values.startDate?.toISOString(),
          endDate: values.endDate?.toISOString(),
        },
        isDefault: values.isDefault,
        schedule: values.isScheduled
          ? {
              frequency: values.scheduleFrequency,
              recipients: values.recipients
                ? values.recipients.split(",").map((r) => r.trim())
                : [],
            }
          : null,
      };

      if (editingReportId) {
        // Update existing report
        await apiRequest("PATCH", `/api/analytics/reports/${editingReportId}`, reportData);
        toast({
          title: "Report updated",
          description: "Your analytics report has been updated successfully.",
        });
      } else {
        // Create new report
        await apiRequest("POST", "/api/analytics/reports", reportData);
        toast({
          title: "Report created",
          description: "Your analytics report has been created successfully.",
        });
      }

      // Refresh reports list
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/reports"] });
      resetForm();
    } catch (error) {
      console.error("Failed to save report:", error);
      toast({
        title: "Failed to save report",
        description: "There was an error saving your report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Reset form
  const resetForm = () => {
    form.reset({
      name: "",
      description: "",
      type: "",
      metrics: [],
      groupBy: [],
      isDefault: false,
      isScheduled: false,
      scheduleFrequency: "monthly",
      recipients: "",
    });
    setIsCreatingReport(false);
    setEditingReportId(null);
  };

  // Fetch reports data
  const {
    data: reportsData = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["/api/analytics/reports"],
  });

  // Filter reports
  const filteredReports = Array.isArray(reportsData)
    ? reportsData.filter((report: any) => {
        const matchesSearch = searchTerm
          ? report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.description?.toLowerCase().includes(searchTerm.toLowerCase())
          : true;

        const matchesType =
          selectedReportType === "all" ? true : report.type === selectedReportType;

        return matchesSearch && matchesType;
      })
    : [];

  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  // Edit report
  const handleEditReport = (report: any) => {
    setEditingReportId(report.id);
    setIsCreatingReport(true);

    // Get report configuration
    const config = report.configuration || {};
    const schedule = report.schedule || {};

    // Set form values
    form.reset({
      name: report.name,
      description: report.description || "",
      type: report.type,
      metrics: config.metrics || [],
      groupBy: config.groupBy || [],
      startDate: config.startDate ? new Date(config.startDate) : undefined,
      endDate: config.endDate ? new Date(config.endDate) : undefined,
      isDefault: report.isDefault || false,
      isScheduled: !!report.schedule,
      scheduleFrequency: schedule.frequency || "monthly",
      recipients: Array.isArray(schedule.recipients)
        ? schedule.recipients.join(", ")
        : "",
    });
  };

  // Delete report
  const deleteReportMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/analytics/reports/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Report deleted",
        description: "Your analytics report has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/reports"] });
    },
    onError: () => {
      toast({
        title: "Failed to delete report",
        description: "There was an error deleting your report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteReport = (id: number) => {
    if (confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
      deleteReportMutation.mutate(id);
    }
  };

  // Duplicate report
  const handleDuplicateReport = (report: any) => {
    setIsCreatingReport(true);

    // Get report configuration
    const config = report.configuration || {};
    const schedule = report.schedule || {};

    // Set form values with modified name
    form.reset({
      name: `${report.name} (Copy)`,
      description: report.description || "",
      type: report.type,
      metrics: config.metrics || [],
      groupBy: config.groupBy || [],
      startDate: config.startDate ? new Date(config.startDate) : undefined,
      endDate: config.endDate ? new Date(config.endDate) : undefined,
      isDefault: false, // Don't copy default status
      isScheduled: !!report.schedule,
      scheduleFrequency: schedule.frequency || "monthly",
      recipients: Array.isArray(schedule.recipients)
        ? schedule.recipients.join(", ")
        : "",
    });
  };

  // Generate a report
  const generateReportMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/analytics/reports/${id}/generate`);
    },
    onSuccess: () => {
      toast({
        title: "Report generated",
        description: "Your report has been generated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/reports"] });
    },
    onError: () => {
      toast({
        title: "Failed to generate report",
        description: "There was an error generating your report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateReport = (id: number) => {
    generateReportMutation.mutate(id);
  };

  // Get report type label
  const getReportTypeLabel = (type: string) => {
    const reportType = REPORT_TYPES.find((t) => t.value === type);
    return reportType ? reportType.label : type;
  };

  // Get report metrics as string
  const getMetricsString = (metrics: string[]) => {
    if (!metrics || metrics.length === 0) return "No metrics";
    if (metrics.length <= 2) return metrics.join(", ");
    return `${metrics.slice(0, 2).join(", ")} +${metrics.length - 2} more`;
  };

  // Get form select options based on report type
  const getMetricsOptions = () => {
    if (!watchReportType) return [];
    return METRICS_OPTIONS[watchReportType] || [];
  };

  const getGroupByOptions = () => {
    if (!watchReportType) return [];
    return GROUP_BY_OPTIONS[watchReportType] || [];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">Analytics Reports</CardTitle>
              <CardDescription>
                Create, schedule, and view analytics reports
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search reports..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <Select
                value={selectedReportType}
                onValueChange={setSelectedReportType}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Report Types</SelectItem>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={() => {
                  resetForm();
                  setIsCreatingReport(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isCreatingReport ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingReportId ? "Edit Report" : "Create New Report"}
                </CardTitle>
                <CardDescription>
                  {editingReportId
                    ? "Modify your existing analytics report"
                    : "Configure a new analytics report"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Report Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Monthly Performance Report" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Describe the purpose of this report..."
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Report Type</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select report type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {REPORT_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Date (Optional)</FormLabel>
                                <FormControl>
                                  <div className="flex h-10">
                                    <Input
                                      type="date"
                                      value={
                                        field.value
                                          ? field.value.toISOString().split("T")[0]
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const date = e.target.value
                                          ? new Date(e.target.value)
                                          : undefined;
                                        field.onChange(date);
                                      }}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Date (Optional)</FormLabel>
                                <FormControl>
                                  <div className="flex h-10">
                                    <Input
                                      type="date"
                                      value={
                                        field.value
                                          ? field.value.toISOString().split("T")[0]
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const date = e.target.value
                                          ? new Date(e.target.value)
                                          : undefined;
                                        field.onChange(date);
                                      }}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        {watchReportType && (
                          <>
                            <FormField
                              control={form.control}
                              name="metrics"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Metrics</FormLabel>
                                  <div className="grid grid-cols-2 gap-2">
                                    {getMetricsOptions().map((metric) => (
                                      <FormItem
                                        key={metric.value}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(
                                              metric.value
                                            )}
                                            onCheckedChange={(checked) => {
                                              const currentValues = field.value || [];
                                              const newValues = checked
                                                ? [...currentValues, metric.value]
                                                : currentValues.filter(
                                                    (value) => value !== metric.value
                                                  );
                                              field.onChange(newValues);
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal">
                                          {metric.label}
                                        </FormLabel>
                                      </FormItem>
                                    ))}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="groupBy"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Group By (Optional)</FormLabel>
                                  <div className="grid grid-cols-2 gap-2">
                                    {getGroupByOptions().map((group) => (
                                      <FormItem
                                        key={group.value}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(
                                              group.value
                                            )}
                                            onCheckedChange={(checked) => {
                                              const currentValues = field.value || [];
                                              const newValues = checked
                                                ? [...currentValues, group.value]
                                                : currentValues.filter(
                                                    (value) => value !== group.value
                                                  );
                                              field.onChange(newValues);
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal">
                                          {group.label}
                                        </FormLabel>
                                      </FormItem>
                                    ))}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        <FormField
                          control={form.control}
                          name="isDefault"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Set as Default Report</FormLabel>
                                <FormDescription>
                                  This report will be shown by default on the dashboard
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="isScheduled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Schedule Automatic Delivery</FormLabel>
                                <FormDescription>
                                  Automatically generate and send this report on a schedule
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        {watchIsScheduled && (
                          <div className="grid grid-cols-1 gap-4">
                            <FormField
                              control={form.control}
                              name="scheduleFrequency"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Delivery Frequency</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select frequency" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {SCHEDULE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
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
                              name="recipients"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Recipients</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="email@example.com, email2@example.com"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Comma-separated list of email addresses
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          resetForm();
                          setIsCreatingReport(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingReportId ? "Update Report" : "Save Report"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <>
              <Tabs defaultValue="all" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="all">All Reports</TabsTrigger>
                  <TabsTrigger value="recent">Recently Generated</TabsTrigger>
                  <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  <Card>
                    <CardContent className="p-0">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[300px]">Report Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Metrics</TableHead>
                              <TableHead>Last Generated</TableHead>
                              <TableHead>Schedule</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading ? (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="h-24 text-center"
                                >
                                  <div className="flex justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : filteredReports.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="h-24 text-center"
                                >
                                  <div className="flex flex-col items-center justify-center">
                                    <FileBarChart className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">
                                      No reports found. Create your first report to get started.
                                    </p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredReports.map((report: any) => (
                                <TableRow key={report.id}>
                                  <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                      <span>{report.name}</span>
                                      {report.description && (
                                        <span className="text-xs text-muted-foreground">
                                          {report.description}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {getReportTypeLabel(report.type)}
                                  </TableCell>
                                  <TableCell>
                                    {getMetricsString(
                                      report.configuration?.metrics || []
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {report.lastGeneratedAt
                                      ? formatDate(report.lastGeneratedAt)
                                      : "Never"}
                                  </TableCell>
                                  <TableCell>
                                    {report.schedule ? (
                                      <div className="flex items-center">
                                        <Calendar className="h-4 w-4 mr-1 text-blue-600" />
                                        <span className="capitalize">
                                          {report.schedule.frequency}
                                        </span>
                                      </div>
                                    ) : (
                                      "Not scheduled"
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          className="h-8 w-8 p-0"
                                        >
                                          <span className="sr-only">Open menu</span>
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem
                                          onClick={() => handleGenerateReport(report.id)}
                                        >
                                          <FileBarChart className="mr-2 h-4 w-4" />
                                          <span>Generate Now</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleEditReport(report)}
                                        >
                                          <Edit className="mr-2 h-4 w-4" />
                                          <span>Edit</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleDuplicateReport(report)}
                                        >
                                          <FileCog className="mr-2 h-4 w-4" />
                                          <span>Duplicate</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-red-600"
                                          onClick={() => handleDeleteReport(report.id)}
                                        >
                                          <Trash className="mr-2 h-4 w-4" />
                                          <span>Delete</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="recent" className="space-y-4">
                  <Card>
                    <CardContent className="p-0">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[300px]">Report Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Generated On</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading ? (
                              <TableRow>
                                <TableCell
                                  colSpan={4}
                                  className="h-24 text-center"
                                >
                                  <div className="flex justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              <TableRow>
                                <TableCell
                                  colSpan={4}
                                  className="h-24 text-center"
                                >
                                  <div className="flex flex-col items-center justify-center">
                                    <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">
                                      No recently generated reports.
                                    </p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="scheduled" className="space-y-4">
                  <Card>
                    <CardContent className="p-0">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[300px]">Report Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Frequency</TableHead>
                              <TableHead>Recipients</TableHead>
                              <TableHead>Next Delivery</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading ? (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="h-24 text-center"
                                >
                                  <div className="flex justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredReports
                                .filter((report: any) => report.schedule)
                                .map((report: any) => (
                                  <TableRow key={report.id}>
                                    <TableCell className="font-medium">
                                      {report.name}
                                    </TableCell>
                                    <TableCell>
                                      {getReportTypeLabel(report.type)}
                                    </TableCell>
                                    <TableCell className="capitalize">
                                      {report.schedule?.frequency || "One-time"}
                                    </TableCell>
                                    <TableCell>
                                      {report.schedule?.recipients?.length || 0} recipients
                                    </TableCell>
                                    <TableCell>
                                      Not calculated
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditReport(report)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                            )}
                            {!isLoading &&
                              filteredReports.filter((report: any) => report.schedule)
                                .length === 0 && (
                                <TableRow>
                                  <TableCell
                                    colSpan={6}
                                    className="h-24 text-center"
                                  >
                                    <div className="flex flex-col items-center justify-center">
                                      <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                                      <p className="text-muted-foreground">
                                        No scheduled reports found.
                                      </p>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsReports;