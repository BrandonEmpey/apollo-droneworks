import { useState, useMemo } from "react";
import { 
  CircleDollarSign, 
  Clock, 
  TrendingUp, 
  Users, 
  Percent,
  Calendar
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { PayrollAnalytics, BillableHoursAnalytics } from "@/hooks/use-payroll-analytics";

interface PayrollPerformanceMetricsProps {
  payrollData: PayrollAnalytics[];
  billableData: BillableHoursAnalytics | undefined;
}

export function PayrollPerformanceMetrics({ 
  payrollData, 
  billableData 
}: PayrollPerformanceMetricsProps) {
  
  const metrics = useMemo(() => {
    // Calculate total values from payroll data
    let totalGrossPay = 0;
    let totalNetPay = 0;
    let totalTaxAmount = 0;
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let employeeCount = 0;
    let periodCount = 0;
    
    // Use Set to count unique employees and periods
    const uniqueEmployees = new Set();
    const uniquePeriods = new Set();
    
    payrollData.forEach(entry => {
      // Sum up financial values
      totalGrossPay += parseFloat(entry.totalGrossPay || '0');
      totalNetPay += parseFloat(entry.totalNetPay || '0');
      totalTaxAmount += parseFloat(entry.totalTaxAmount || '0');
      totalRegularHours += parseFloat(entry.totalRegularHours || '0');
      totalOvertimeHours += parseFloat(entry.totalOvertimeHours || '0');
      
      // Track unique employees and periods
      if (entry.employeeId) uniqueEmployees.add(entry.employeeId);
      if (entry.periodId) uniquePeriods.add(entry.periodId);
    });
    
    // Get billable ratio
    const billableHours = parseFloat(billableData?.billableHours || '0');
    const totalHours = parseFloat(billableData?.totalHours || '0');
    const billableRatio = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
    
    // Calculate average pay per hour
    const totalHoursWorked = totalRegularHours + totalOvertimeHours;
    const averagePayPerHour = totalHoursWorked > 0 ? totalGrossPay / totalHoursWorked : 0;
    
    return {
      totalGrossPay: totalGrossPay.toFixed(2),
      totalNetPay: totalNetPay.toFixed(2),
      totalTaxAmount: totalTaxAmount.toFixed(2),
      totalRegularHours: totalRegularHours.toFixed(2),
      totalOvertimeHours: totalOvertimeHours.toFixed(2),
      billableRatio: billableRatio.toFixed(2),
      uniqueEmployeesCount: uniqueEmployees.size,
      uniquePeriodsCount: uniquePeriods.size,
      averagePayPerHour: averagePayPerHour.toFixed(2)
    };
  }, [payrollData, billableData]);
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Gross Payroll
          </CardTitle>
          <CircleDollarSign className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${metrics.totalGrossPay}
          </div>
          <p className="text-xs text-muted-foreground">
            Net: ${metrics.totalNetPay} | Tax: ${metrics.totalTaxAmount}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Hours Worked
          </CardTitle>
          <Clock className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(parseFloat(metrics.totalRegularHours) + parseFloat(metrics.totalOvertimeHours)).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Regular: {metrics.totalRegularHours} | Overtime: {metrics.totalOvertimeHours}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Average Pay Rate
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${metrics.averagePayPerHour}
          </div>
          <p className="text-xs text-muted-foreground">
            Per hour based on total gross pay
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Billable Ratio
          </CardTitle>
          <Percent className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.billableRatio}%
          </div>
          <p className="text-xs text-muted-foreground">
            Billable Hours: {billableData?.billableHours || '0'} of {billableData?.totalHours || '0'}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Employees
          </CardTitle>
          <Users className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.uniqueEmployeesCount}
          </div>
          <p className="text-xs text-muted-foreground">
            Unique employees with payroll entries
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Pay Periods
          </CardTitle>
          <Calendar className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.uniquePeriodsCount}
          </div>
          <p className="text-xs text-muted-foreground">
            Included pay periods in this data
          </p>
        </CardContent>
      </Card>
    </div>
  );
}