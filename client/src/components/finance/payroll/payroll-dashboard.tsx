import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Employee, PayrollPeriod } from "@shared/schema";
import { format } from "date-fns";
import { 
  Clock, Users, CalendarDays, DollarSign, 
  AlertTriangle, CheckCircle2, PlusCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PayrollManagement from "./payroll-management";

export default function PayrollDashboard() {
  // Fetch employees
  const { data: employees, isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/payroll/employees"],
  });

  // Fetch active payroll periods
  const { data: periods, isLoading: loadingPeriods } = useQuery<PayrollPeriod[]>({
    queryKey: ["/api/payroll/periods"],
  });

  // Filter only active employees
  const activeEmployees = employees?.filter(employee => employee.isActive) || [];
  
  // Filter only active payroll periods (draft or processing)
  const activePeriods = periods?.filter(period => 
    period.status === "draft" || period.status === "processing"
  ) || [];

  // Get upcoming pay dates
  const upcomingPayDates = periods?.filter(period => 
    new Date(period.paymentDate) > new Date()
  ).sort((a, b) => 
    new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
  ).slice(0, 3) || [];

  // Stats
  const stats = {
    activeEmployees: activeEmployees.length,
    activePeriods: activePeriods.length,
    completedPeriods: periods?.filter(p => p.status === "completed").length || 0,
    nextPayDate: upcomingPayDates.length > 0 ? upcomingPayDates[0].paymentDate : null,
  };

  // Loading state
  const isLoading = loadingEmployees || loadingPeriods;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payroll Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your payroll system, employees, and upcoming pay periods.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Employees
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeEmployees}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeEmployees === 1 ? 'Employee' : 'Employees'} eligible for payroll
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Pay Periods
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activePeriods}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activePeriods === 1 ? 'Period' : 'Periods'} in draft or processing status
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Next Pay Date
                </CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.nextPayDate ? format(new Date(stats.nextPayDate), "MMM d") : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.nextPayDate 
                    ? `Due on ${format(new Date(stats.nextPayDate), "EEEE, MMMM d, yyyy")}`
                    : "No upcoming pay dates"
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completed Periods
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedPeriods}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.completedPeriods === 1 ? 'Period' : 'Periods'} processed and completed
                </p>
              </CardContent>
            </Card>
          </div>

          {activeEmployees.length === 0 && (
            <Card className="border-dashed bg-muted/50">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <div className="mb-4 rounded-full bg-primary-foreground p-3">
                  <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold">No Active Employees</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  You don't have any active employees in the system. Add your first employee to start processing payroll.
                </p>
                <Button size="sm">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </CardContent>
            </Card>
          )}

          {upcomingPayDates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Pay Dates</CardTitle>
                <CardDescription>
                  Scheduled payroll dates for the next periods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingPayDates.map((period) => (
                    <div key={period.id} className="flex items-center justify-between">
                      <div className="flex flex-col space-y-1">
                        <p className="font-medium">{period.notes || `Pay Period #${period.id}`}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <CalendarDays className="mr-1 h-3 w-3" />
                          <span>
                            {format(new Date(period.periodStart), "MMM d")} - {format(new Date(period.periodEnd), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex flex-col items-end space-y-1">
                          <p className="text-sm font-medium">
                            {format(new Date(period.paymentDate), "EEEE, MMMM d, yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground">Payment Date</p>
                        </div>
                        <div className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          period.status === "draft" 
                            ? "bg-muted text-muted-foreground" 
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {period.status === "draft" ? "Draft" : "Processing"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          <PayrollManagement />
        </>
      )}
    </div>
  );
}