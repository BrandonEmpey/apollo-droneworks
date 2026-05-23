import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  TooltipProps,
} from "recharts";

// Custom tooltip component with proper styling
const CustomPieTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-300 rounded shadow-sm">
        <p className="text-black font-medium">{payload[0].payload.name}</p>
        <p className="text-black">Count: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateRange } from "@/types/date-range";
import {
  ArrowUpDown,
  Search,
  Calendar,
  DollarSign,
  Clock,
  MapPin,
  Star,
  TrendingUp,
  Filter,
  Layers,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateAnalyticsPDF, exportToCSV, exportToExcel, captureChartAsImage } from "@/lib/pdfExport";
import { AdvancedFilter, FilterState, FilterOption } from "@/components/ui/advanced-filter";

interface ProjectAnalyticsProps {
  dateRange: DateRange;
}

// Sample data, will be replaced with actual API data
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const ProjectAnalytics = ({ dateRange }: ProjectAnalyticsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedServiceType, setSelectedServiceType] = useState<string>("all");
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({});
  
  // Chart refs for image capture
  const serviceTypeChartRef = useRef<HTMLDivElement>(null);
  const revenueByLocationChartRef = useRef<HTMLDivElement>(null);
  const monthlyTrendsChartRef = useRef<HTMLDivElement>(null);
  const profitMarginChartRef = useRef<HTMLDivElement>(null);
  const flightHoursChartRef = useRef<HTMLDivElement>(null);
  const projectStatusChartRef = useRef<HTMLDivElement>(null);

  // Fetch project analytics data
  const { data: projectData = [], isLoading } = useQuery({
    queryKey: [
      "/api/analytics/projects",
      {
        startDate: dateRange.from?.toISOString().split("T")[0],
        endDate: dateRange.to?.toISOString().split("T")[0],
      },
    ],
  });

  // Define advanced filter options
  const filterOptions: FilterOption[] = [
    {
      type: 'select',
      field: 'status',
      label: 'Project Status',
      options: [
        { value: 'completed', label: 'Completed' },
        { value: 'in-progress', label: 'In Progress' },
        { value: 'scheduled', label: 'Scheduled' }
      ]
    },
    {
      type: 'range',
      field: 'revenue',
      label: 'Revenue Range',
      min: 0,
      max: 10000,
      step: 100
    },
    {
      type: 'date',
      field: 'startDate',
      label: 'Start Date'
    },
    {
      type: 'date',
      field: 'endDate',
      label: 'End Date'
    },
    {
      type: 'range',
      field: 'profitMargin',
      label: 'Profit Margin (%)',
      min: 0,
      max: 100,
      step: 1
    },
    {
      type: 'range',
      field: 'flightHours',
      label: 'Flight Hours',
      min: 0,
      max: 100,
      step: 0.5
    },
    {
      type: 'checkbox',
      field: 'hasRework',
      label: 'Required Rework'
    }
  ];

  // Handle advanced filter changes
  const handleFilterChange = (filters: FilterState) => {
    setAdvancedFilters(filters);
  };

  // Filter projects by search term, service type, and advanced filters
  const filteredProjects = Array.isArray(projectData) 
    ? projectData.filter((project: any) => {
        const matchesSearch = searchTerm 
          ? project.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.serviceType?.toLowerCase().includes(searchTerm.toLowerCase())
          : true;
          
        const matchesServiceType = selectedServiceType === "all" 
          ? true 
          : project.serviceType === selectedServiceType;
          
        // Apply advanced filters
        const matchesAdvancedFilters = Object.entries(advancedFilters).every(([field, value]) => {
          if (!value) return true; // Skip empty filters
          
          switch (field) {
            case 'status':
              return !value || value === 'all' || value === project.status;
              
            case 'revenue':
              const revenue = Number(project.revenue) || 0;
              return revenue >= value.min && revenue <= value.max;
              
            case 'startDate':
              if (!value) return true;
              const projectDate = new Date(project.startDate || project.date);
              return !value || projectDate >= new Date(value);
              
            case 'endDate':
              if (!value) return true;
              const completionDate = new Date(project.completionDate || project.date);
              return !value || completionDate <= new Date(value);
              
            case 'profitMargin':
              const margin = Number(project.profitMargin) || 0;
              return margin >= value.min && margin <= value.max;
              
            case 'flightHours':
              const hours = Number(project.flightHours) || 0;
              return hours >= value.min && hours <= value.max;
              
            case 'hasRework':
              return !value || project.hasRework === value;
              
            default:
              return true;
          }
        });
        
        return matchesSearch && matchesServiceType && matchesAdvancedFilters;
      })
    : [];
  
  // Aggregate service type distribution data
  const serviceTypeData = Array.isArray(projectData)
    ? Object.entries(
        projectData.reduce((acc: {[key: string]: number}, project: any) => {
          const serviceType = project.serviceType || "Unknown";
          acc[serviceType] = (acc[serviceType] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value }))
    : [];
    
  // Calculate total project metrics
  const totalProjects = filteredProjects.length;
  const totalRevenue = filteredProjects.reduce(
    (sum: number, project: any) => sum + (Number(project.revenue) || 0),
    0
  );
  const totalProfit = filteredProjects.reduce(
    (sum: number, project: any) => sum + (Number(project.profit) || 0),
    0
  );
  const totalFlightHours = filteredProjects.reduce(
    (sum: number, project: any) => sum + (Number(project.flightHours) || 0),
    0
  );
  const averageProfitMargin = totalProjects
    ? filteredProjects.reduce(
        (sum: number, project: any) => sum + (Number(project.profitMargin) || 0),
        0
      ) / totalProjects
    : 0;
  
  // Monthly data for trend charts
  const monthlyData = Array.isArray(projectData)
    ? projectData.reduce((acc: {[key: string]: any}, project: any) => {
        if (project.completionDate) {
          const month = new Date(project.completionDate).toLocaleString("default", {
            month: "short",
            year: "numeric",
          });
          
          if (!acc[month]) {
            acc[month] = {
              month,
              revenue: 0,
              profit: 0,
              projects: 0,
              flightHours: 0,
            };
          }
          
          acc[month].revenue += Number(project.revenue) || 0;
          acc[month].profit += Number(project.profit) || 0;
          acc[month].projects += 1;
          acc[month].flightHours += Number(project.flightHours) || 0;
        }
        return acc;
      }, {})
    : {};
  
  const monthlyChartData = Object.values(monthlyData).sort((a: any, b: any) => {
    const dateA = new Date(a.month);
    const dateB = new Date(b.month);
    return dateA.getTime() - dateB.getTime();
  });
  
  // Service type options for filter
  const serviceTypeOptions = Array.isArray(projectData)
    ? Array.from(new Set(projectData.map((project: any) => project.serviceType || ""))).filter(Boolean)
    : [];

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">Project Analytics</CardTitle>
              <CardDescription>
                Analyze project performance metrics and trends
              </CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <Select
                value={selectedServiceType}
                onValueChange={setSelectedServiceType}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Service Types</SelectItem>
                  {serviceTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <AdvancedFilter 
                options={filterOptions}
                onFilterChange={handleFilterChange}
              />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={async () => {
                    // Capture charts as images
                    const chartImages = await Promise.all([
                      serviceTypeChartRef.current ? captureChartAsImage(serviceTypeChartRef) : null,
                      monthlyTrendsChartRef.current ? captureChartAsImage(monthlyTrendsChartRef) : null,
                      revenueByLocationChartRef.current ? captureChartAsImage(revenueByLocationChartRef) : null,
                      flightHoursChartRef.current ? captureChartAsImage(flightHoursChartRef) : null,
                      profitMarginChartRef.current ? captureChartAsImage(profitMarginChartRef) : null
                    ]);
                    
                    // Export to PDF
                    const doc = generateAnalyticsPDF(
                      "Project Analytics Report",
                      "Performance metrics and trends",
                      filteredProjects,
                      [
                        { header: "Service Type", dataKey: "serviceType" },
                        { header: "Location", dataKey: "location" },
                        { header: "Revenue", dataKey: "revenue" },
                        { header: "Profit", dataKey: "profit" },
                        { header: "Flight Hours", dataKey: "flightHours" },
                        { header: "Status", dataKey: "status" }
                      ],
                      {
                        from: dateRange.from?.toLocaleDateString() || "",
                        to: dateRange.to?.toLocaleDateString() || ""
                      },
                      chartImages.filter(Boolean)
                    );
                    doc.save("project-analytics-report.pdf");
                  }}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    // Export to CSV
                    exportToCSV(
                      filteredProjects,
                      "project-analytics-report.csv"
                    );
                  }}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    // Export to Excel
                    exportToExcel(
                      filteredProjects,
                      "project-analytics-report.xlsx",
                      "Project Analytics Report"
                    );
                  }}>
                    <Table className="mr-2 h-4 w-4" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Projects
                    </p>
                    <h3 className="text-2xl font-bold mt-1">{totalProjects}</h3>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Layers className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Revenue
                    </p>
                    <h3 className="text-2xl font-bold mt-1">
                      {formatCurrency(totalRevenue)}
                    </h3>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Flight Hours
                    </p>
                    <h3 className="text-2xl font-bold mt-1">
                      {totalFlightHours.toFixed(1)}
                    </h3>
                  </div>
                  <div className="p-2 bg-amber-100 rounded-full">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Avg. Profit Margin
                    </p>
                    <h3 className="text-2xl font-bold mt-1">
                      {averageProfitMargin.toFixed(1)}%
                    </h3>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-full">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="types">Project Types</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="details">Project Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Service Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80" ref={serviceTypeChartRef}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={serviceTypeData}
                          layout="vertical"
                          margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={120}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" name="Count" fill="#8884d8">
                            {serviceTypeData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Project Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80" ref={monthlyTrendsChartRef}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={monthlyChartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue"
                            stroke="#8884d8"
                            activeDot={{ r: 8 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="profit"
                            name="Profit"
                            stroke="#82ca9d"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="types" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Type Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80" ref={serviceTypeChartRef}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={serviceTypeData}
                            cx="50%"
                            cy="50%"
                            labelLine
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            // Simplified label to avoid text getting cut off
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                          >
                            {serviceTypeData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                          <Legend layout="vertical" verticalAlign="bottom" align="center" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Service Type Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80" ref={revenueByLocationChartRef}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={serviceTypeData}
                          layout="vertical"
                          margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis 
                            type="category" 
                            dataKey="name"
                            width={90}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="value"
                            name="Count"
                            fill="#8884d8"
                          >
                            {serviceTypeData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="trends" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80" ref={flightHoursChartRef}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={monthlyChartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="projects"
                            name="Project Count"
                            stroke="#8884d8"
                            activeDot={{ r: 8 }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="flightHours"
                            name="Flight Hours"
                            stroke="#82ca9d"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Profit Margin Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80" ref={profitMarginChartRef}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={monthlyChartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Legend />
                          <Bar
                            dataKey="revenue"
                            name="Revenue"
                            stackId="a"
                            fill="#8884d8"
                          />
                          <Bar
                            dataKey="profit"
                            name="Profit"
                            stackId="a"
                            fill="#82ca9d"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardContent className="p-0 pt-6">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">
                            <Button variant="ghost" className="p-0 font-medium flex items-center">
                              Service Type
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" className="p-0 font-medium flex items-center">
                              Location
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">
                            <Button variant="ghost" className="p-0 font-medium flex items-center justify-end">
                              Revenue
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">
                            <Button variant="ghost" className="p-0 font-medium flex items-center justify-end">
                              Profit Margin
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">
                            <Button variant="ghost" className="p-0 font-medium flex items-center justify-end">
                              Flight Hours
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">
                            <Button variant="ghost" className="p-0 font-medium flex items-center justify-end">
                              Completion Date
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="h-24 text-center"
                            >
                              Loading project data...
                            </TableCell>
                          </TableRow>
                        ) : filteredProjects.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="h-24 text-center"
                            >
                              No projects found matching your criteria.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredProjects.map((project: any) => (
                            <TableRow key={project.id}>
                              <TableCell className="font-medium">
                                {project.serviceType}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                                  {project.location || "Unknown"}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(project.revenue || 0)}
                              </TableCell>
                              <TableCell className="text-right">
                                {(project.profitMargin || 0).toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-right">
                                {(project.flightHours || 0).toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right">
                                {project.completionDate
                                  ? new Date(
                                      project.completionDate
                                    ).toLocaleDateString()
                                  : "N/A"}
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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectAnalytics;