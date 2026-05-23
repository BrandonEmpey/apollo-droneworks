import React, { useState } from "react";
import { format } from "date-fns";
import {
  usePayrollAnalytics,
  useBillableHoursAnalytics,
  useSyncAnalyticsData,
  GroupByOption,
  PayrollAnalyticsFilters,
  BillableHoursFilters
} from "@/hooks/use-payroll-analytics";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
import { PayrollPerformanceMetrics } from "./payroll-performance-metrics";
import { PayrollTrendsChart } from "./payroll-trends-chart";
import { BillableHoursChart } from "./billable-hours-chart";
import { PayrollDataTable } from "./payroll-data-table";
import { BillableHoursTable } from "./billable-hours-table";

export function PayrollAnalyticsDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Filter states
  const [payrollFilters, setPayrollFilters] = useState<PayrollAnalyticsFilters>({
    groupBy: 'monthly',
    startDate: format(new Date(new Date().setMonth(new Date().getMonth() - 6)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  
  const [billableFilters, setBillableFilters] = useState<BillableHoursFilters>({
    startDate: format(new Date(new Date().setMonth(new Date().getMonth() - 6)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  
  // Queries
  const { 
    data: payrollData, 
    isLoading: isLoadingPayroll,
    isError: isPayrollError, 
    refetch: refetchPayroll 
  } = usePayrollAnalytics(payrollFilters);
  
  const { 
    data: billableData,
    isLoading: isLoadingBillable,
    isError: isBillableError,
    refetch: refetchBillable
  } = useBillableHoursAnalytics(billableFilters);
  
  const { mutate: syncAnalytics, isPending: isSyncing } = useSyncAnalyticsData();
  
  // Handlers
  const handleGroupByChange = (value: GroupByOption) => {
    setPayrollFilters({
      ...payrollFilters,
      groupBy: value
    });
  };
  
  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setPayrollFilters({
      ...payrollFilters,
      [field]: value
    });
    setBillableFilters({
      ...billableFilters,
      [field]: value
    });
  };
  
  const handleSyncData = () => {
    syncAnalytics();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Payroll Analytics</h2>
        <Button 
          onClick={handleSyncData} 
          disabled={isSyncing}
          className="bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-700 hover:to-amber-500"
        >
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Synchronizing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Analytics Data
            </>
          )}
        </Button>
      </div>
      
      <div className="bg-[#132642] p-4 rounded-md shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <Label htmlFor="startDate" className="text-white">Start Date</Label>
            <Input 
              id="startDate"
              type="date" 
              value={payrollFilters.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)} 
            />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="endDate" className="text-white">End Date</Label>
            <Input 
              id="endDate"
              type="date" 
              value={payrollFilters.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)} 
            />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="groupBy" className="text-white">Group By</Label>
            <Select value={payrollFilters.groupBy} onValueChange={handleGroupByChange}>
              <SelectTrigger id="groupBy">
                <SelectValue placeholder="Select grouping" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="period">Pay Period</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button 
              onClick={() => {
                refetchPayroll();
                refetchBillable();
              }} 
              variant="outline" 
              className="w-full"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
      
      {isLoadingPayroll || isLoadingBillable ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          <span className="ml-2 text-lg">Loading analytics data...</span>
        </div>
      ) : isPayrollError || isBillableError ? (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Error Loading Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              There was an error loading the analytics data. Please try again or contact support.
            </p>
            <Button 
              onClick={() => {
                refetchPayroll();
                refetchBillable();
              }} 
              variant="destructive" 
              className="mt-4"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Performance Metrics */}
          <PayrollPerformanceMetrics 
            payrollData={payrollData || []} 
            billableData={billableData} 
          />
          
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="payroll">Payroll Analysis</TabsTrigger>
              <TabsTrigger value="billable">Billable Hours</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Payroll Trends</CardTitle>
                    <CardDescription>
                      Historical payroll expenses over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <PayrollTrendsChart data={payrollData || []} />
                  </CardContent>
                  <CardFooter>
                    <p className="text-sm text-muted-foreground">
                      Based on {payrollData?.length || 0} data points from {payrollFilters.startDate} to {payrollFilters.endDate}
                    </p>
                  </CardFooter>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Billable vs Non-Billable Hours</CardTitle>
                    <CardDescription>
                      Distribution of billable hours by project
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <BillableHoursChart data={billableData} />
                  </CardContent>
                  <CardFooter>
                    <p className="text-sm text-muted-foreground">
                      Total: {billableData?.totalHours || 0} hours | Billable: {billableData?.billablePercentage || 0}%
                    </p>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="payroll" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Payroll Data</CardTitle>
                  <CardDescription>
                    {payrollFilters.groupBy === 'monthly' && 'Monthly payroll summary'}
                    {payrollFilters.groupBy === 'employee' && 'Payroll data grouped by employee'}
                    {payrollFilters.groupBy === 'period' && 'Payroll data grouped by pay period'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PayrollDataTable 
                    data={payrollData || []} 
                    groupBy={payrollFilters.groupBy || 'monthly'} 
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="billable" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Billable Hours Analysis</CardTitle>
                  <CardDescription>
                    Detailed breakdown of billable and non-billable hours by project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BillableHoursTable data={billableData} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}