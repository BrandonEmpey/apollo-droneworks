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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
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
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DateRange } from "@/types/date-range";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  BarChart2,
  Battery,
  Calendar,
  Clock,
  Plane,
  AlertTriangle,
  ArrowUpDown,
  Download,
  FileDown,
  FileSpreadsheet,
  Filter,
  Wrench,
  RotateCw,
  Check,
  AlertCircle,
  Ban,
  Plus,
  Table as TableIcon,
} from "lucide-react";
import { generateAnalyticsPDF, exportToCSV, exportToExcel, captureChartAsImage } from "@/lib/pdfExport";

interface DroneAnalyticsProps {
  dateRange: DateRange;
}

// Sample data, will be replaced with actual API data
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const DroneAnalytics = ({ dateRange }: DroneAnalyticsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  
  // Create refs for charts to use with chart export functionality
  const statusChartRef = useRef<HTMLDivElement>(null);
  const flightHoursChartRef = useRef<HTMLDivElement>(null);
  const batteryHealthChartRef = useRef<HTMLDivElement>(null);
  const monthlyFlightChartRef = useRef<HTMLDivElement>(null);

  // Fetch drone analytics data
  const { data: droneData = [], isLoading: dronasLoading } = useQuery({
    queryKey: ["/api/analytics/drones"],
  });

  // Fetch flight logs data
  const { data: flightLogs = [], isLoading: flightLogsLoading } = useQuery({
    queryKey: [
      "/api/analytics/flight-logs",
      {
        startDate: dateRange.from?.toISOString().split("T")[0],
        endDate: dateRange.to?.toISOString().split("T")[0],
      },
    ],
  });

  // Filter drones by search term and status
  const filteredDrones = Array.isArray(droneData)
    ? droneData.filter((drone: any) => {
        const matchesSearch = searchTerm
          ? drone.droneName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            drone.droneModel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            drone.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
          : true;

        const matchesStatus = selectedStatus === "all"
          ? true
          : drone.status === selectedStatus;

        return matchesSearch && matchesStatus;
      })
    : [];

  // Calculate total fleet metrics
  const totalDrones = filteredDrones.length;
  const activeDrones = filteredDrones.filter(
    (drone: any) => drone.status === "active"
  ).length;
  const maintenanceDrones = filteredDrones.filter(
    (drone: any) => drone.status === "maintenance"
  ).length;
  const retiredDrones = filteredDrones.filter(
    (drone: any) => drone.status === "retired"
  ).length;
  
  const totalFlightHours = filteredDrones.reduce(
    (sum: number, drone: any) => sum + (Number(drone.flightHours) || 0),
    0
  );
  
  const averageBatteryHealth = totalDrones
    ? filteredDrones.reduce(
        (sum: number, drone: any) => sum + (Number(drone.batteryHealth) || 0),
        0
      ) / totalDrones
    : 0;

  // Prepare data for charts
  const statusDistribution = [
    { name: "Active", value: activeDrones },
    { name: "Maintenance", value: maintenanceDrones },
    { name: "Retired", value: retiredDrones },
  ];

  // Battery health distribution
  const batteryHealthData = Array.isArray(droneData)
    ? droneData.map((drone: any) => ({
        name: drone.droneName,
        value: drone.batteryHealth || 0,
      }))
    : [];

  // Flight hours by drone
  const flightHoursData = Array.isArray(droneData)
    ? droneData
        .filter((drone: any) => drone.status !== "retired")
        .map((drone: any) => ({
          name: drone.droneName,
          flightHours: drone.flightHours || 0,
        }))
        .sort((a, b) => b.flightHours - a.flightHours)
        .slice(0, 10)
    : [];

  // Monthly flight hours trend
  const monthlyFlightData = Array.isArray(flightLogs)
    ? flightLogs.reduce((acc: { [key: string]: any }, log: any) => {
        if (log.flightDate) {
          const month = new Date(log.flightDate).toLocaleString("default", {
            month: "short",
            year: "numeric",
          });

          if (!acc[month]) {
            acc[month] = {
              month,
              totalHours: 0,
              flights: 0,
              avgDuration: 0,
            };
          }

          acc[month].totalHours += Number(log.duration) || 0;
          acc[month].flights += 1;
          acc[month].avgDuration =
            acc[month].totalHours / acc[month].flights;
        }
        return acc;
      }, {})
    : {};

  const monthlyChartData = Object.values(monthlyFlightData).sort(
    (a: any, b: any) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    }
  );

  // Format for display
  const formatFlightHours = (hours: number) => {
    return `${hours.toFixed(1)} hrs`;
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Active</Badge>;
      case "maintenance":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">Maintenance</Badge>;
      case "retired":
        return <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">Retired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get battery health indicator
  const getBatteryHealthIndicator = (health: number) => {
    if (health >= 80) {
      return (
        <div className="flex items-center">
          <Battery className="h-4 w-4 mr-1 text-green-600" />
          <Progress
            value={health}
            className="h-2 w-12 bg-green-100"
          />
          <span className="ml-2 text-green-600">{health}%</span>
        </div>
      );
    } else if (health >= 50) {
      return (
        <div className="flex items-center">
          <Battery className="h-4 w-4 mr-1 text-amber-600" />
          <Progress
            value={health}
            className="h-2 w-12 bg-amber-100"
          />
          <span className="ml-2 text-amber-600">{health}%</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center">
          <Battery className="h-4 w-4 mr-1 text-red-600" />
          <Progress
            value={health}
            className="h-2 w-12 bg-red-100"
          />
          <span className="ml-2 text-red-600">{health}%</span>
        </div>
      );
    }
  };

  // Get next maintenance indicator
  const getMaintenanceIndicator = (nextMaintenanceDue: string) => {
    if (!nextMaintenanceDue) return "Not scheduled";

    const dueDate = new Date(nextMaintenanceDue);
    const today = new Date();
    const daysUntilDue = Math.floor(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDue < 0) {
      return (
        <div className="flex items-center">
          <AlertCircle className="h-4 w-4 mr-1 text-red-600" />
          <span className="text-red-600">Overdue by {Math.abs(daysUntilDue)} days</span>
        </div>
      );
    } else if (daysUntilDue < 7) {
      return (
        <div className="flex items-center">
          <AlertTriangle className="h-4 w-4 mr-1 text-amber-600" />
          <span className="text-amber-600">Due in {daysUntilDue} days</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
          <span>{dueDate.toLocaleDateString()}</span>
        </div>
      );
    }
  };

  const isLoading = dronasLoading || flightLogsLoading;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">Drone & Equipment Analytics</CardTitle>
              <CardDescription>
                Track drone performance, maintenance, and flight metrics
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search drones..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    // Create columns for PDF
                    const columns = [
                      { header: 'Drone Name', dataKey: 'droneName' },
                      { header: 'Model', dataKey: 'droneModel' },
                      { header: 'Status', dataKey: 'status' },
                      { header: 'Flight Hours', dataKey: 'flightHours' },
                      { header: 'Battery Health', dataKey: 'batteryHealth' },
                      { header: 'Last Maintenance', dataKey: 'lastMaintenance' }
                    ];
                    
                    // Prepare data for PDF
                    const data = filteredDrones.map(drone => ({
                      ...drone,
                      flightHours: formatFlightHours(Number(drone.flightHours) || 0),
                      batteryHealth: `${drone.batteryHealth || 0}%`,
                      lastMaintenance: drone.lastMaintenance 
                        ? new Date(drone.lastMaintenance).toLocaleDateString() 
                        : 'Never'
                    }));
                    
                    // Generate and save PDF
                    const doc = generateAnalyticsPDF(
                      'Drone Analytics Report',
                      `${filteredDrones.length} drones`,
                      data,
                      columns,
                      dateRange.from && dateRange.to 
                        ? { 
                            from: dateRange.from?.toLocaleDateString() || '', 
                            to: dateRange.to?.toLocaleDateString() || '' 
                          } 
                        : undefined
                    );
                    
                    doc.save('apollo-drone-analytics.pdf');
                  }}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => {
                    // Create columns for PDF
                    const columns = [
                      { header: 'Drone Name', dataKey: 'droneName' },
                      { header: 'Model', dataKey: 'droneModel' },
                      { header: 'Status', dataKey: 'status' },
                      { header: 'Flight Hours', dataKey: 'flightHours' },
                      { header: 'Battery Health', dataKey: 'batteryHealth' },
                      { header: 'Last Maintenance', dataKey: 'lastMaintenance' }
                    ];
                    
                    // Prepare data for PDF
                    const data = filteredDrones.map(drone => ({
                      ...drone,
                      flightHours: formatFlightHours(Number(drone.flightHours) || 0),
                      batteryHealth: `${drone.batteryHealth || 0}%`,
                      lastMaintenance: drone.lastMaintenance 
                        ? new Date(drone.lastMaintenance).toLocaleDateString() 
                        : 'Never'
                    }));
                    
                    // Capture charts as images
                    const chartImages: string[] = [];
                    try {
                      if (statusChartRef.current) {
                        const chartImage = await captureChartAsImage(statusChartRef);
                        chartImages.push(chartImage);
                      }
                      
                      if (flightHoursChartRef.current) {
                        const chartImage = await captureChartAsImage(flightHoursChartRef);
                        chartImages.push(chartImage);
                      }
                      
                      if (batteryHealthChartRef.current) {
                        const chartImage = await captureChartAsImage(batteryHealthChartRef);
                        chartImages.push(chartImage);
                      }
                      
                      if (monthlyFlightChartRef.current) {
                        const chartImage = await captureChartAsImage(monthlyFlightChartRef);
                        chartImages.push(chartImage);
                      }
                    } catch (error) {
                      console.error('Error capturing charts:', error);
                    }
                    
                    // Generate and save PDF with charts
                    const doc = generateAnalyticsPDF(
                      'Drone Analytics Report with Charts',
                      `${filteredDrones.length} drones`,
                      data,
                      columns,
                      dateRange.from && dateRange.to 
                        ? { 
                            from: dateRange.from?.toLocaleDateString() || '', 
                            to: dateRange.to?.toLocaleDateString() || '' 
                          } 
                        : undefined,
                      chartImages
                    );
                    
                    doc.save('apollo-drone-analytics-with-charts.pdf');
                  }}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export as PDF with Charts
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    // Export to CSV
                    const data = filteredDrones.map(drone => ({
                      Drone_Name: drone.droneName || `Drone ${drone.id}`,
                      Drone_Model: drone.droneModel || 'Unknown',
                      Serial_Number: drone.serialNumber || 'Unknown',
                      Status: drone.status || 'Unknown',
                      Flight_Hours: drone.flightHours || 0,
                      Battery_Health: `${drone.batteryHealth || 0}%`,
                      Last_Maintenance: drone.lastMaintenance ? new Date(drone.lastMaintenance).toLocaleDateString() : 'Never',
                      Next_Maintenance_Due: drone.nextMaintenanceDue ? new Date(drone.nextMaintenanceDue).toLocaleDateString() : 'Not Scheduled'
                    }));
                    
                    exportToCSV(data, 'apollo-drone-analytics.csv');
                  }}>
                    <TableIcon className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    // Export to Excel
                    const data = filteredDrones.map(drone => ({
                      Drone_Name: drone.droneName || `Drone ${drone.id}`,
                      Drone_Model: drone.droneModel || 'Unknown',
                      Serial_Number: drone.serialNumber || 'Unknown',
                      Status: drone.status || 'Unknown',
                      Flight_Hours: drone.flightHours || 0,
                      Battery_Health: `${drone.batteryHealth || 0}%`,
                      Last_Maintenance: drone.lastMaintenance ? new Date(drone.lastMaintenance).toLocaleDateString() : 'Never',
                      Next_Maintenance_Due: drone.nextMaintenanceDue ? new Date(drone.nextMaintenanceDue).toLocaleDateString() : 'Not Scheduled'
                    }));
                    
                    exportToExcel(data, 'apollo-drone-analytics.xlsx', 'Drone Analytics Report');
                  }}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
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
                      Total Drones
                    </p>
                    <h3 className="text-2xl font-bold mt-1">{totalDrones}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activeDrones} active, {maintenanceDrones} in maintenance
                    </p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Plane className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Flight Hours
                    </p>
                    <h3 className="text-2xl font-bold mt-1">
                      {formatFlightHours(totalFlightHours)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fleet lifetime
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Avg. Battery Health
                    </p>
                    <h3 className="text-2xl font-bold mt-1">
                      {averageBatteryHealth.toFixed(1)}%
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fleet average
                    </p>
                  </div>
                  <div className="p-2 bg-amber-100 rounded-full">
                    <Battery className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Maintenance Due
                    </p>
                    <h3 className="text-2xl font-bold mt-1">
                      {maintenanceDrones}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Drones needing service
                    </p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-full">
                    <Wrench className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Fleet Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="flights">Flight Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Drone Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80" ref={statusChartRef}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {statusDistribution.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top 10 Drones by Flight Hours</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80" ref={flightHoursChartRef}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={flightHoursData}
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
                          <Tooltip formatter={(value) => [`${value} hours`, "Flight Hours"]} />
                          <Legend />
                          <Bar
                            dataKey="flightHours"
                            name="Flight Hours"
                            fill="#8884d8"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Battery Health Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80" ref={batteryHealthChartRef}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={batteryHealthData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={70}
                          />
                          <YAxis domain={[0, 100]} />
                          <Tooltip formatter={(value) => [`${value}%`, "Battery Health"]} />
                          <Legend />
                          <Bar
                            dataKey="value"
                            name="Battery Health"
                            fill="#82ca9d"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Flight Hours Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80" ref={monthlyFlightChartRef}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={monthlyChartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value} hours`, ""]} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="totalHours"
                            name="Total Flight Hours"
                            stroke="#8884d8"
                            activeDot={{ r: 8 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="flights"
                            name="Number of Flights"
                            stroke="#82ca9d"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-4">
              <Card>
                <CardContent className="p-0 pt-6">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">
                            <Button
                              variant="ghost"
                              className="p-0 font-medium flex items-center"
                            >
                              Drone
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="p-0 font-medium flex items-center"
                            >
                              Flight Hours
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>Battery Health</TableHead>
                          <TableHead>Last Maintenance</TableHead>
                          <TableHead>Next Maintenance</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="h-24 text-center"
                            >
                              Loading drone data...
                            </TableCell>
                          </TableRow>
                        ) : filteredDrones.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="h-24 text-center"
                            >
                              No drones found matching your criteria.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredDrones.map((drone: any) => (
                            <TableRow key={drone.id}>
                              <TableCell className="font-medium">
                                <div>
                                  {drone.droneName}
                                  <div className="text-xs text-muted-foreground">
                                    {drone.droneModel} • {drone.serialNumber}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(drone.status)}
                              </TableCell>
                              <TableCell>
                                {formatFlightHours(drone.flightHours || 0)}
                              </TableCell>
                              <TableCell>
                                {getBatteryHealthIndicator(
                                  drone.batteryHealth || 0
                                )}
                              </TableCell>
                              <TableCell>
                                {drone.lastMaintenance
                                  ? new Date(
                                      drone.lastMaintenance
                                    ).toLocaleDateString()
                                  : "Never"}
                              </TableCell>
                              <TableCell>
                                {getMaintenanceIndicator(
                                  drone.nextMaintenanceDue
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <Wrench className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
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

            <TabsContent value="flights" className="space-y-4">
              <Card>
                <CardContent className="p-0 pt-6">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="p-0 font-medium flex items-center"
                            >
                              Date
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>Drone</TableHead>
                          <TableHead>Pilot</TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="p-0 font-medium flex items-center"
                            >
                              Duration
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>Battery Used</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="h-24 text-center"
                            >
                              Loading flight logs...
                            </TableCell>
                          </TableRow>
                        ) : Array.isArray(flightLogs) && flightLogs.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="h-24 text-center"
                            >
                              No flight logs found for the selected date range.
                            </TableCell>
                          </TableRow>
                        ) : (
                          Array.isArray(flightLogs) && flightLogs.slice(0, 10).map((log: any) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                {log.flightDate
                                  ? new Date(log.flightDate).toLocaleDateString()
                                  : "Unknown"}
                              </TableCell>
                              <TableCell className="font-medium">
                                {log.droneName || "Unknown Drone"}
                              </TableCell>
                              <TableCell>{log.pilotName || "Unknown"}</TableCell>
                              <TableCell>{log.purpose || "General"}</TableCell>
                              <TableCell>
                                {log.duration
                                  ? `${log.duration.toFixed(1)} hrs`
                                  : "Unknown"}
                              </TableCell>
                              <TableCell>
                                {log.batteryUsed
                                  ? `${log.batteryUsed}%`
                                  : "Unknown"}
                              </TableCell>
                              <TableCell>{log.location || "Unknown"}</TableCell>
                              <TableCell>
                                {log.successful ? (
                                  <div className="flex items-center">
                                    <Check className="h-4 w-4 mr-1 text-green-600" />
                                    <span className="text-green-600">
                                      Successful
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <Ban className="h-4 w-4 mr-1 text-red-600" />
                                    <span className="text-red-600">Failed</span>
                                  </div>
                                )}
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

export default DroneAnalytics;