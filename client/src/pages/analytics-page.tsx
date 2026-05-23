import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/ui/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Button } from "@/components/ui/button";
import { addDays, subDays, subMonths } from "date-fns";
import { DateRange } from "@/types/date-range";
import {
  BarChart2,
  PanelLeft,
  Users,
  TrendingUp,
  FileBarChart,
  Calendar,
} from "lucide-react";

// Import Analytics Components
import ProjectAnalytics from "@/components/analytics/project-analytics";
import DroneAnalytics from "@/components/analytics/drone-analytics";
import ClientAnalytics from "@/components/analytics/client-analytics";
import MarketingAnalytics from "@/components/analytics/marketing-analytics";
import AnalyticsReports from "@/components/analytics/analytics-reports";

const AnalyticsPage = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("project");
  
  // Set default date range to last 30 days
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Quick date range selectors
  const setDateRangeToday = () => {
    const today = new Date();
    setDateRange({ from: today, to: today });
  };

  const setDateRangeYesterday = () => {
    const yesterday = subDays(new Date(), 1);
    setDateRange({ from: yesterday, to: yesterday });
  };

  const setDateRange7Days = () => {
    setDateRange({
      from: subDays(new Date(), 7),
      to: new Date(),
    });
  };

  const setDateRange30Days = () => {
    setDateRange({
      from: subDays(new Date(), 30),
      to: new Date(),
    });
  };

  const setDateRange90Days = () => {
    setDateRange({
      from: subDays(new Date(), 90),
      to: new Date(),
    });
  };

  const setDateRangeThisMonth = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateRange({
      from: firstDayOfMonth,
      to: today,
    });
  };

  const setDateRangeLastMonth = () => {
    const today = new Date();
    const firstDayLastMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );
    const lastDayLastMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      0
    );
    setDateRange({
      from: firstDayLastMonth,
      to: lastDayLastMonth,
    });
  };

  const setDateRangeYTD = () => {
    const today = new Date();
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
    setDateRange({
      from: firstDayOfYear,
      to: today,
    });
  };
  
  // Add Last Year (365 days) option
  const setDateRangeLastYear = () => {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(today.getDate() - 365);
    setDateRange({
      from: oneYearAgo,
      to: today,
    });
  };
  
  // Add All Time option
  const setDateRangeAllTime = () => {
    // Using an early date to represent "all time" - Jan 1, 2020
    const allTimeStart = new Date(2020, 0, 1);
    const today = new Date();
    setDateRange({
      from: allTimeStart,
      to: today,
    });
  };

  return (
    <>
      <Helmet>
        <title>Analytics Dashboard | Apollo DroneWorks</title>
      </Helmet>
      <Layout
        user={user}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      >
        <div className="w-full py-6 space-y-6">
          {/* Page Header */}
          <div className="container px-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Data Analytics
              </h1>
              <p className="text-muted-foreground">
                Track project, equipment, client, and marketing performance
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => window.open('/service-analytics', '_blank')}
                className="flex items-center gap-2"
              >
                <BarChart2 className="h-4 w-4" />
                Service Analytics
              </Button>
              <DatePickerWithRange
                dateRange={dateRange}
                setDateRange={setDateRange}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="h-9 w-9 shrink-0"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Top Controls Section */}
          <div className="container px-6">
            <div className="flex flex-wrap gap-6 mb-4">
              {/* Left Section - Date Range Selectors + Analytics Tabs */}
              <div className="w-full lg:w-3/5 space-y-4">
                {/* Date Range Quick Selectors */}
                <div>
                  <div className="grid grid-cols-5 gap-2 mb-2">
                    {/* First row of 5 buttons */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={setDateRangeToday}
                      className="h-8"
                    >
                      Today
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={setDateRangeYesterday}
                      className="h-8"
                    >
                      Yesterday
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={setDateRange7Days}
                      className="h-8"
                    >
                      Last 7 Days
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={setDateRange30Days}
                      className="h-8"
                    >
                      Last 30 Days
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={setDateRange90Days}
                      className="h-8"
                    >
                      Last 90 Days
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-2">
                    {/* Second row of 5 buttons */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={setDateRangeThisMonth}
                      className="h-8"
                    >
                      This Month
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={setDateRangeLastMonth}
                      className="h-8"
                    >
                      Last Month
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={setDateRangeYTD}
                      className="h-8"
                    >
                      Year to Date
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={setDateRangeLastYear}
                      className="h-8"
                    >
                      Last Year
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={setDateRangeAllTime}
                      className="h-8"
                    >
                      All Time
                    </Button>
                  </div>
                </div>
                
                {/* Analytics Sections Tabs - Horizontal */}
                {sidebarOpen && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Analytics Sections</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={activeTab === "project" ? "default" : "outline"}
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => setActiveTab("project")}
                        >
                          <BarChart2 className="h-4 w-4" />
                          <span>Projects</span>
                        </Button>
                        <Button
                          variant={activeTab === "drone" ? "default" : "outline"}
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => setActiveTab("drone")}
                        >
                          <Calendar className="h-4 w-4" />
                          <span>Equipment</span>
                        </Button>
                        <Button
                          variant={activeTab === "client" ? "default" : "outline"}
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => setActiveTab("client")}
                        >
                          <Users className="h-4 w-4" />
                          <span>Clients</span>
                        </Button>
                        <Button
                          variant={activeTab === "marketing" ? "default" : "outline"}
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => setActiveTab("marketing")}
                        >
                          <TrendingUp className="h-4 w-4" />
                          <span>Marketing</span>
                        </Button>
                        <Button
                          variant={activeTab === "reports" ? "default" : "outline"}
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => setActiveTab("reports")}
                        >
                          <FileBarChart className="h-4 w-4" />
                          <span>Reports</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* Right Section - Selected Period card */}
              <div className="w-full lg:w-1/4 lg:ml-auto">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Selected Period</CardTitle>
                    <CardDescription>
                      {dateRange.from && dateRange.to
                        ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                        : "No date range selected"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dateRange.from && dateRange.to && (
                      <div className="text-sm text-muted-foreground">
                        <p className="mb-1">
                          Days: {Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1}
                        </p>
                        {/* Show week numbers or other relevant info */}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
          
          {/* Main Content - Full Width */}
          <div className="container px-6">
            {/* Main Content Area */}
            <div className="w-full">
              {activeTab === "project" && (
                <ProjectAnalytics dateRange={dateRange} />
              )}
              
              {activeTab === "drone" && (
                <DroneAnalytics dateRange={dateRange} />
              )}
              
              {activeTab === "client" && (
                <ClientAnalytics dateRange={dateRange} />
              )}
              
              {activeTab === "marketing" && (
                <MarketingAnalytics dateRange={dateRange} />
              )}
              
              {activeTab === "reports" && (
                <AnalyticsReports dateRange={dateRange} />
              )}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default AnalyticsPage;