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
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DateRange } from "@/types/date-range";
import {
  ArrowUpDown,
  Search,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  Star,
  Tag,
  Mail,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  Filter,
  BarChart2,
  Table as TableIcon, 
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateAnalyticsPDF, exportToCSV, exportToExcel, captureChartAsImage } from "@/lib/pdfExport";

interface ClientAnalyticsProps {
  dateRange: DateRange;
}

// Sample data, will be replaced with actual API data
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const ClientAnalytics = ({ dateRange }: ClientAnalyticsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClientType, setSelectedClientType] = useState<string>("all");
  
  // Create refs for charts to use with chart export functionality
  const clientTypeChartRef = useRef<HTMLDivElement>(null);
  const clientScatterChartRef = useRef<HTMLDivElement>(null);
  const acquisitionSourceChartRef = useRef<HTMLDivElement>(null);
  const acquisitionTrendChartRef = useRef<HTMLDivElement>(null);

  // Fetch client analytics data
  const { data: clientData = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/analytics/clients"],
  });

  // Fetch client projects data
  const { data: clientProjects = [], isLoading: projectsLoading } = useQuery({
    queryKey: [
      "/api/analytics/client-projects",
      {
        startDate: dateRange.from?.toISOString().split("T")[0],
        endDate: dateRange.to?.toISOString().split("T")[0],
      },
    ],
  });

  // Filter clients by search term and type
  const filteredClients = Array.isArray(clientData)
    ? clientData.filter((client: any) => {
        const matchesSearch = searchTerm
          ? (client.name && client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
          : true;

        const matchesType =
          selectedClientType === "all"
            ? true
            : client.clientType === selectedClientType;

        return matchesSearch && matchesType;
      })
    : [];

  // Calculate client metrics
  const totalClients = filteredClients.length;
  const activeClients = filteredClients.filter(
    (client: any) => client.projectCount > 0
  ).length;
  const totalSpend = filteredClients.reduce(
    (sum: number, client: any) => sum + (Number(client.totalSpend) || 0),
    0
  );
  const averageLifetimeValue = totalClients
    ? filteredClients.reduce(
        (sum: number, client: any) => sum + (Number(client.lifetimeValue) || 0),
        0
      ) / totalClients
    : 0;

  // Client type distribution data
  const clientTypeData = Array.isArray(clientData)
    ? Object.entries(
        clientData.reduce((acc: { [key: string]: number }, client: any) => {
          const clientType = client.clientType || "Unknown";
          acc[clientType] = (acc[clientType] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value }))
    : [];

  // Acquisition source distribution data
  const acquisitionSourceData = Array.isArray(clientData)
    ? Object.entries(
        clientData.reduce(
          (acc: { [key: string]: number }, client: any) => {
            const source = client.acquisitionSource || "Unknown";
            acc[source] = (acc[source] || 0) + 1;
            return acc;
          },
          {}
        )
      ).map(([name, value]) => ({ name, value }))
    : [];

  // Client retention data
  const retentionRateData = Array.isArray(clientData)
    ? clientData
        .filter((client: any) => client.retentionRate !== undefined)
        .map((client: any) => ({
          name: client.name || `Client ${client.id}`,
          value: client.retentionRate * 100,
        }))
    : [];

  // Client spend vs project count scatter data
  const clientValueScatterData = Array.isArray(filteredClients)
    ? filteredClients.map((client: any) => ({
        name: client.name || `Client ${client.id}`,
        projectCount: client.projectCount || 0,
        totalSpend: client.totalSpend || 0,
        lifetimeValue: client.lifetimeValue || 0,
      }))
    : [];

  // Client acquisition over time
  const acquisitionTrendData = Array.isArray(clientData)
    ? clientData.reduce((acc: { [key: string]: any }, client: any) => {
        if (client.acquisitionDate) {
          const month = new Date(client.acquisitionDate).toLocaleString(
            "default",
            {
              month: "short",
              year: "numeric",
            }
          );

          if (!acc[month]) {
            acc[month] = {
              month,
              clients: 0,
              revenue: 0,
            };
          }

          acc[month].clients += 1;
          acc[month].revenue += client.totalSpend || 0;
        }
        return acc;
      }, {})
    : {};

  const monthlyAcquisitionData = Object.values(acquisitionTrendData).sort(
    (a: any, b: any) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    }
  );

  // Client type options for filter
  const clientTypeOptions = Array.isArray(clientData)
    ? Array.from(new Set(clientData.map((client: any) => client.clientType || ""))).filter(
        Boolean
      )
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

  // Get satisfaction indicator
  const getSatisfactionIndicator = (score: number) => {
    if (score >= 8) {
      return (
        <div className="flex items-center">
          <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
          <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
          <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
          <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
          <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
          <span className="ml-1 text-green-600">{score}/10</span>
        </div>
      );
    } else if (score >= 6) {
      return (
        <div className="flex items-center">
          <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
          <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
          <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
          <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
          <Star className="h-4 w-4 mr-1 text-muted-foreground" />
          <span className="ml-1 text-amber-600">{score}/10</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center">
          <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
          <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
          <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
          <Star className="h-4 w-4 mr-1 text-muted-foreground" />
          <Star className="h-4 w-4 mr-1 text-muted-foreground" />
          <span className="ml-1 text-red-600">{score}/10</span>
        </div>
      );
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString();
  };

  const isLoading = clientsLoading || projectsLoading;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">Client Analytics</CardTitle>
              <CardDescription>
                Analyze client demographics, spending, and engagement metrics
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <Select
                value={selectedClientType}
                onValueChange={setSelectedClientType}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Client Types</SelectItem>
                  {clientTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
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
                      { header: 'Client Name', dataKey: 'name' },
                      { header: 'Type', dataKey: 'clientType' },
                      { header: 'Projects', dataKey: 'projectCount' },
                      { header: 'Revenue', dataKey: 'totalSpend' },
                      { header: 'Avg Value', dataKey: 'averageProjectValue' },
                      { header: 'Last Project', dataKey: 'lastProjectDate' }
                    ];
                    
                    // Prepare data for PDF
                    const data = filteredClients.map(client => ({
                      ...client,
                      totalSpend: formatCurrency(Number(client.totalSpend) || 0),
                      averageProjectValue: formatCurrency(Number(client.averageProjectValue) || 0),
                      lastProjectDate: formatDate(client.lastProjectDate),
                    }));
                    
                    // Generate and save PDF
                    const doc = generateAnalyticsPDF(
                      'Client Analytics Report',
                      `${filteredClients.length} clients`,
                      data,
                      columns,
                      dateRange.from && dateRange.to 
                        ? { 
                            from: dateRange.from?.toLocaleDateString() || '', 
                            to: dateRange.to?.toLocaleDateString() || '' 
                          } 
                        : undefined
                    );
                    
                    doc.save('apollo-client-analytics.pdf');
                  }}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => {
                    // Create columns for PDF with charts
                    const columns = [
                      { header: 'Client Name', dataKey: 'name' },
                      { header: 'Type', dataKey: 'clientType' },
                      { header: 'Projects', dataKey: 'projectCount' },
                      { header: 'Revenue', dataKey: 'totalSpend' },
                      { header: 'Avg Value', dataKey: 'averageProjectValue' },
                      { header: 'Last Project', dataKey: 'lastProjectDate' }
                    ];
                    
                    // Prepare data for PDF
                    const data = filteredClients.map(client => ({
                      ...client,
                      totalSpend: formatCurrency(Number(client.totalSpend) || 0),
                      averageProjectValue: formatCurrency(Number(client.averageProjectValue) || 0),
                      lastProjectDate: formatDate(client.lastProjectDate),
                    }));
                    
                    // Capture charts as images
                    const chartImages: string[] = [];
                    try {
                      if (clientTypeChartRef.current) {
                        const chartImage = await captureChartAsImage(clientTypeChartRef);
                        chartImages.push(chartImage);
                      }
                      
                      if (clientScatterChartRef.current) {
                        const chartImage = await captureChartAsImage(clientScatterChartRef);
                        chartImages.push(chartImage);
                      }
                      
                      if (acquisitionSourceChartRef.current) {
                        const chartImage = await captureChartAsImage(acquisitionSourceChartRef);
                        chartImages.push(chartImage);
                      }
                      
                      if (acquisitionTrendChartRef.current) {
                        const chartImage = await captureChartAsImage(acquisitionTrendChartRef);
                        chartImages.push(chartImage);
                      }
                    } catch (error) {
                      console.error('Error capturing charts:', error);
                    }
                    
                    // Generate and save PDF with charts
                    const doc = generateAnalyticsPDF(
                      'Client Analytics Report with Charts',
                      `${filteredClients.length} clients`,
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
                    
                    doc.save('apollo-client-analytics-with-charts.pdf');
                  }}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export as PDF with Charts
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    // Export to CSV
                    const data = filteredClients.map(client => ({
                      Client_Name: client.name || `Client ${client.id}`,
                      Client_Type: client.clientType || 'Unknown',
                      Acquisition_Source: client.acquisitionSource || 'Unknown',
                      Acquisition_Date: client.acquisitionDate ? formatDate(client.acquisitionDate) : 'Unknown',
                      Projects: client.projectCount || 0,
                      Total_Spend: client.totalSpend || 0,
                      Average_Project_Value: client.averageProjectValue || 0,
                      Last_Project_Date: client.lastProjectDate ? formatDate(client.lastProjectDate) : 'Unknown',
                      Lifetime_Value: client.lifetimeValue || 0,
                      Retention_Rate: `${(client.retentionRate || 0) * 100}%`,
                    }));
                    
                    exportToCSV(data, 'apollo-client-analytics.csv');
                  }}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    // Export to Excel
                    const data = filteredClients.map(client => ({
                      Client_Name: client.name || `Client ${client.id}`,
                      Client_Type: client.clientType || 'Unknown',
                      Acquisition_Source: client.acquisitionSource || 'Unknown',
                      Acquisition_Date: client.acquisitionDate ? formatDate(client.acquisitionDate) : 'Unknown',
                      Projects: client.projectCount || 0,
                      Total_Spend: client.totalSpend || 0,
                      Average_Project_Value: client.averageProjectValue || 0,
                      Last_Project_Date: client.lastProjectDate ? formatDate(client.lastProjectDate) : 'Unknown',
                      Lifetime_Value: client.lifetimeValue || 0,
                      Retention_Rate: `${(client.retentionRate || 0) * 100}%`,
                    }));
                    
                    exportToExcel(data, 'apollo-client-analytics.xlsx', 'Client Analytics Report');
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
                      Total Clients
                    </p>
                    <h3 className="text-2xl font-bold mt-1">{totalClients}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activeClients} active clients
                    </p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Revenue
                    </p>
                    <h3 className="text-2xl font-bold mt-1">
                      {formatCurrency(totalSpend)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lifetime client spend
                    </p>
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
                      Avg. Client Value
                    </p>
                    <h3 className="text-2xl font-bold mt-1">
                      {formatCurrency(averageLifetimeValue)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lifetime average
                    </p>
                  </div>
                  <div className="p-2 bg-amber-100 rounded-full">
                    <TrendingUp className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Avg. Projects / Client
                    </p>
                    <h3 className="text-2xl font-bold mt-1">
                      {totalClients
                        ? (
                            filteredClients.reduce(
                              (sum: number, client: any) =>
                                sum + (client.projectCount || 0),
                              0
                            ) / totalClients
                          ).toFixed(1)
                        : "0"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Project frequency
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-full">
                    <BarChart2 className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Client Overview</TabsTrigger>
              <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
              <TabsTrigger value="details">Client Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Type Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80" ref={clientTypeChartRef}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={clientTypeData}
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
                            {clientTypeData.map((_, index) => (
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
                    <CardTitle>Client Spend vs. Project Count</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80" ref={clientScatterChartRef}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart
                          margin={{
                            top: 20,
                            right: 20,
                            bottom: 20,
                            left: 20,
                          }}
                        >
                          <CartesianGrid />
                          <XAxis
                            type="number"
                            dataKey="projectCount"
                            name="Projects"
                            unit=" projects"
                          />
                          <YAxis
                            type="number"
                            dataKey="totalSpend"
                            name="Total Spend"
                            tickFormatter={(value) => `$${value}`}
                          />
                          <ZAxis
                            type="number"
                            dataKey="lifetimeValue"
                            range={[50, 500]}
                            name="Lifetime Value"
                          />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === "Total Spend") {
                                return [formatCurrency(value as number), name];
                              }
                              return [value, name];
                            }}
                            cursor={{ strokeDasharray: "3 3" }}
                          />
                          <Legend />
                          <Scatter
                            name="Clients"
                            data={clientValueScatterData}
                            fill="#8884d8"
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="acquisition" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Acquisition Source</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80" ref={acquisitionSourceChartRef}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={acquisitionSourceData}
                          layout="vertical"
                          margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={90}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip formatter={(value) => [`${value} clients`, "Count"]} />
                          <Legend />
                          <Bar
                            dataKey="value"
                            name="Number of Clients"
                            fill="#8884d8"
                          >
                            {acquisitionSourceData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Client Acquisition Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80" ref={acquisitionTrendChartRef}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={monthlyAcquisitionData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis yAxisId="left" />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === "Revenue") {
                                return [formatCurrency(value as number), name];
                              }
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="clients"
                            name="New Clients"
                            stroke="#8884d8"
                            activeDot={{ r: 8 }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue"
                            stroke="#82ca9d"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="engagement" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Retention Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={retentionRateData}
                          margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 70,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={70}
                          />
                          <YAxis domain={[0, 100]} />
                          <Tooltip formatter={(value) => [`${value}%`, "Retention Rate"]} />
                          <Legend />
                          <Bar
                            dataKey="value"
                            name="Retention Rate"
                            fill="#82ca9d"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Client Satisfaction Scores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={
                            Array.isArray(filteredClients)
                              ? filteredClients
                                  .filter((client: any) => client.satisfactionScore !== undefined)
                                  .map((client: any) => ({
                                    name: client.name || `Client ${client.id}`,
                                    score: client.satisfactionScore * 10,
                                  }))
                                  .sort((a, b) => b.score - a.score)
                                  .slice(0, 10)
                              : []
                          }
                          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={70}
                          />
                          <YAxis domain={[0, 10]} />
                          <Tooltip formatter={(value) => [`${value}/10`, "Satisfaction Score"]} />
                          <Legend />
                          <Bar
                            dataKey="score"
                            name="Satisfaction Score"
                            fill="#FFBB28"
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
                          <TableHead className="w-[200px]">
                            <Button
                              variant="ghost"
                              className="p-0 font-medium flex items-center"
                            >
                              Client
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="p-0 font-medium flex items-center"
                            >
                              Projects
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="p-0 font-medium flex items-center"
                            >
                              Total Spend
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>Satisfaction</TableHead>
                          <TableHead>Last Project</TableHead>
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
                              Loading client data...
                            </TableCell>
                          </TableRow>
                        ) : filteredClients.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="h-24 text-center"
                            >
                              No clients found matching your criteria.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredClients.map((client: any) => (
                            <TableRow key={client.id}>
                              <TableCell className="font-medium">
                                <div>
                                  {client.name || `Client ${client.id}`}
                                  <div className="text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      {client.email && (
                                        <div className="flex items-center">
                                          <Mail className="h-3 w-3 mr-1" />
                                          {client.email}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {client.clientType || "Unknown"}
                                </Badge>
                              </TableCell>
                              <TableCell>{client.projectCount || 0}</TableCell>
                              <TableCell>
                                {formatCurrency(client.totalSpend || 0)}
                              </TableCell>
                              <TableCell>
                                {client.satisfactionScore
                                  ? getSatisfactionIndicator(
                                      client.satisfactionScore * 10
                                    )
                                  : "No data"}
                              </TableCell>
                              <TableCell>
                                {client.lastProjectDate
                                  ? formatDate(client.lastProjectDate)
                                  : "Never"}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <User className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <ExternalLink className="h-4 w-4" />
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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientAnalytics;