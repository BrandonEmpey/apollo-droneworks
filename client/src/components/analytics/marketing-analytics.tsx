import { useState } from "react";
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
  Area,
  AreaChart,
  ComposedChart,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateRange } from "@/types/date-range";
import {
  ArrowUpDown,
  Search,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  BarChart2,
  Download,
  Globe,
  Share2,
  FileText,
  LinkIcon,
  ArrowRight,
} from "lucide-react";

interface MarketingAnalyticsProps {
  dateRange: DateRange;
}

// Sample data, will be replaced with actual API data
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const MarketingAnalytics = ({ dateRange }: MarketingAnalyticsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");

  // Fetch marketing analytics data
  const { data: marketingData = [], isLoading } = useQuery({
    queryKey: [
      "/api/analytics/marketing",
      {
        startDate: dateRange.from?.toISOString().split("T")[0],
        endDate: dateRange.to?.toISOString().split("T")[0],
      },
    ],
  });

  // Filter marketing data by search term and source
  const filteredData = Array.isArray(marketingData)
    ? marketingData.filter((item: any) => {
        const matchesSearch = searchTerm
          ? (item.campaign && item.campaign.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.source && item.source.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.medium && item.medium.toLowerCase().includes(searchTerm.toLowerCase()))
          : true;

        const matchesSource =
          selectedSource === "all" ? true : item.source === selectedSource;

        return matchesSearch && matchesSource;
      })
    : [];

  // Calculate marketing metrics
  const totalVisitors = filteredData.reduce(
    (sum: number, item: any) => sum + (item.visitors || 0),
    0
  );
  const totalLeads = filteredData.reduce(
    (sum: number, item: any) => sum + (item.leads || 0),
    0
  );
  const totalRevenue = filteredData.reduce(
    (sum: number, item: any) => sum + (item.revenue || 0),
    0
  );
  const overallConversionRate =
    totalVisitors > 0 ? (totalLeads / totalVisitors) * 100 : 0;

  // Calculate ROI
  const totalCost = filteredData.reduce(
    (sum: number, item: any) => sum + (item.cost || 0),
    0
  );
  const overallROI =
    totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

  // Marketing source distribution data
  const sourceDistributionData = Array.isArray(marketingData)
    ? Object.entries(
        marketingData.reduce(
          (acc: { [key: string]: { visitors: number; leads: number } }, item: any) => {
            const source = item.source || "Unknown";
            if (!acc[source]) {
              acc[source] = { visitors: 0, leads: 0 };
            }
            acc[source].visitors += item.visitors || 0;
            acc[source].leads += item.leads || 0;
            return acc;
          },
          {}
        )
      ).map(([name, data]) => ({
        name,
        visitors: data.visitors,
        leads: data.leads,
        conversion: data.visitors > 0 ? (data.leads / data.visitors) * 100 : 0,
      }))
    : [];

  // Monthly marketing performance trend
  const monthlyData = Array.isArray(marketingData)
    ? marketingData.reduce(
        (acc: { [key: string]: any }, item: any) => {
          if (item.date) {
            const month = new Date(item.date).toLocaleString("default", {
              month: "short",
              year: "numeric",
            });

            if (!acc[month]) {
              acc[month] = {
                month,
                visitors: 0,
                leads: 0,
                cost: 0,
                revenue: 0,
                conversion: 0,
                roi: 0,
              };
            }

            acc[month].visitors += item.visitors || 0;
            acc[month].leads += item.leads || 0;
            acc[month].cost += item.cost || 0;
            acc[month].revenue += item.revenue || 0;
          }
          return acc;
        },
        {}
      )
    : {};

  // Calculate derived metrics for monthly data
  Object.values(monthlyData).forEach((month: any) => {
    month.conversion =
      month.visitors > 0 ? (month.leads / month.visitors) * 100 : 0;
    month.roi =
      month.cost > 0 ? ((month.revenue - month.cost) / month.cost) * 100 : 0;
  });

  const monthlyChartData = Object.values(monthlyData).sort((a: any, b: any) => {
    const dateA = new Date(a.month);
    const dateB = new Date(b.month);
    return dateA.getTime() - dateB.getTime();
  });

  // Campaign performance data
  const campaignPerformanceData = Array.isArray(marketingData)
    ? Object.entries(
        marketingData.reduce((acc: { [key: string]: any }, item: any) => {
          const campaign = item.campaign || "Unknown";
          
          if (!acc[campaign]) {
            acc[campaign] = {
              name: campaign,
              visitors: 0,
              leads: 0,
              conversion: 0,
              cost: 0,
              revenue: 0,
              roi: 0,
            };
          }
          
          acc[campaign].visitors += item.visitors || 0;
          acc[campaign].leads += item.leads || 0;
          acc[campaign].cost += item.cost || 0;
          acc[campaign].revenue += item.revenue || 0;
          
          return acc;
        }, {})
      ).map(([_, data]) => {
        const conversion =
          data.visitors > 0 ? (data.leads / data.visitors) * 100 : 0;
        const roi =
          data.cost > 0 ? ((data.revenue - data.cost) / data.cost) * 100 : 0;
          
        return {
          ...data,
          conversion,
          roi,
        };
      })
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

  // Format number with comma separators
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  // Format percentage
  const formatPercent = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  // Get color based on ROI value
  const getRoiColor = (roi: number) => {
    if (roi >= 200) return "text-green-600";
    if (roi >= 100) return "text-emerald-600";
    if (roi >= 0) return "text-amber-600";
    return "text-red-600";
  };

  // Get color based on conversion rate
  const getConversionColor = (rate: number) => {
    if (rate >= 5) return "text-green-600";
    if (rate >= 2) return "text-emerald-600";
    if (rate >= 1) return "text-amber-600";
    return "text-red-600";
  };

  // Marketing source options for filter
  const sourceOptions = Array.isArray(marketingData)
    ? [...new Set(marketingData.map((item: any) => item.source))].filter(Boolean)
    : [];

  // Sort campaigns by revenue
  const topCampaigns = [...campaignPerformanceData].sort(
    (a, b) => b.revenue - a.revenue
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">Marketing Analytics</CardTitle>
              <CardDescription>
                Track campaign performance, conversions, and ROI
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search campaigns..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <Select
                value={selectedSource}
                onValueChange={setSelectedSource}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {sourceOptions.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" className="shrink-0">
                <Download className="h-4 w-4" />
              </Button>
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
                      Total Visitors
                    </p>
                    <h3 className="text-2xl font-bold mt-1">
                      {formatNumber(totalVisitors)}
                    </h3>
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
                      Total Leads
                    </p>
                    <h3 className="text-2xl font-bold mt-1">
                      {formatNumber(totalLeads)}
                    </h3>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <Target className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Conversion Rate
                    </p>
                    <h3 className={`text-2xl font-bold mt-1 ${getConversionColor(overallConversionRate)}`}>
                      {formatPercent(overallConversionRate)}
                    </h3>
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
                      Overall ROI
                    </p>
                    <h3 className={`text-2xl font-bold mt-1 ${getRoiColor(overallROI)}`}>
                      {formatPercent(overallROI)}
                    </h3>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-full">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sources">Traffic Sources</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top 5 Performing Campaigns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topCampaigns}
                          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={70}
                          />
                          <YAxis yAxisId="left" />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tickFormatter={(value) => `${value}%`}
                          />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === "Revenue") {
                                return [formatCurrency(value as number), name];
                              }
                              if (name === "ROI" || name === "Conversion") {
                                return [`${value}%`, name];
                              }
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar
                            yAxisId="left"
                            dataKey="revenue"
                            name="Revenue"
                            fill="#8884d8"
                          />
                          <Bar
                            yAxisId="right"
                            dataKey="roi"
                            name="ROI"
                            fill="#82ca9d"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Traffic to Leads Conversion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={monthlyChartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis yAxisId="left" />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tickFormatter={(value) => `${value}%`}
                          />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === "Conversion Rate") {
                                return [`${value}%`, name];
                              }
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar
                            yAxisId="left"
                            dataKey="visitors"
                            name="Visitors"
                            fill="#8884d8"
                            barSize={20}
                          />
                          <Bar
                            yAxisId="left"
                            dataKey="leads"
                            name="Leads"
                            fill="#82ca9d"
                            barSize={20}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="conversion"
                            name="Conversion Rate"
                            stroke="#ff7300"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sources" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Traffic Source Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sourceDistributionData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="visitors"
                            nameKey="name"
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {sourceDistributionData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [formatNumber(value as number), "Visitors"]}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Source Conversion Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={sourceDistributionData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis yAxisId="left" />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tickFormatter={(value) => `${value}%`}
                          />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === "Conversion Rate") {
                                return [`${value}%`, name];
                              }
                              return [formatNumber(value as number), name];
                            }}
                          />
                          <Legend />
                          <Bar
                            yAxisId="left"
                            dataKey="leads"
                            name="Leads"
                            fill="#82ca9d"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="conversion"
                            name="Conversion Rate"
                            stroke="#ff7300"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-4">
              <Card>
                <CardContent className="p-0 pt-6">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[220px]">
                            <Button
                              variant="ghost"
                              className="p-0 font-medium flex items-center"
                            >
                              Campaign
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="w-[140px]">
                            <Button
                              variant="ghost"
                              className="p-0 font-medium flex items-center"
                            >
                              Source / Medium
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">
                            <Button
                              variant="ghost"
                              className="p-0 font-medium flex items-center justify-end"
                            >
                              Visitors
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">
                            <Button
                              variant="ghost"
                              className="p-0 font-medium flex items-center justify-end"
                            >
                              Leads
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">Conversion</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">ROI</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="h-24 text-center"
                            >
                              Loading campaign data...
                            </TableCell>
                          </TableRow>
                        ) : campaignPerformanceData.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="h-24 text-center"
                            >
                              No campaign data found for the selected date range.
                            </TableCell>
                          </TableRow>
                        ) : (
                          campaignPerformanceData.map((campaign: any, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {campaign.name}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <Badge
                                    variant="outline"
                                    className="mb-1 inline-flex w-fit"
                                  >
                                    <Globe className="h-3 w-3 mr-1" />
                                    {campaign.source || "Unknown"}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {campaign.medium || "Unknown"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(campaign.visitors)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(campaign.leads)}
                              </TableCell>
                              <TableCell
                                className={`text-right ${getConversionColor(
                                  campaign.conversion
                                )}`}
                              >
                                {formatPercent(campaign.conversion)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(campaign.cost)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(campaign.revenue)}
                              </TableCell>
                              <TableCell
                                className={`text-right ${getRoiColor(
                                  campaign.roi
                                )}`}
                              >
                                {formatPercent(campaign.roi)}
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

            <TabsContent value="trends" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Cost vs. Revenue Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={monthlyChartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip
                            formatter={(value) => [formatCurrency(value as number), ""]}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="cost"
                            name="Marketing Cost"
                            stroke="#8884d8"
                            fill="#8884d8"
                            fillOpacity={0.3}
                            stackId="1"
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue"
                            stroke="#82ca9d"
                            fill="#82ca9d"
                            fillOpacity={0.3}
                            stackId="2"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>ROI Trend Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={monthlyChartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis
                            tickFormatter={(value) => `${value}%`}
                          />
                          <Tooltip
                            formatter={(value) => [`${value}%`, "ROI"]}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="roi"
                            name="ROI"
                            stroke="#ff7300"
                            activeDot={{ r: 8 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="conversion"
                            name="Conversion Rate"
                            stroke="#8884d8"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingAnalytics;