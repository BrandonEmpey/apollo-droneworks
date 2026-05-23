import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertTriangle, 
  Calendar, 
  ChevronLeft, 
  Clock, 
  DollarSign, 
  ExternalLink, 
  FileCheck, 
  FilePieChart, 
  Loader2, 
  PlayCircle, 
  Download,
  Users,
} from "lucide-react";
import { 
  PayrollPeriod, 
  PayrollEntry, 
  Employee, 
  TimeEntry 
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";

interface PayrollPeriodDetailsProps {
  periodId: number;
  onBack: () => void;
}

export default function PayrollPeriodDetails({ 
  periodId, 
  onBack 
}: PayrollPeriodDetailsProps) {
  const [selectedTab, setSelectedTab] = useState("summary");
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch payroll period
  const { 
    data: period, 
    isLoading: isLoadingPeriod 
  } = useQuery<PayrollPeriod>({
    queryKey: [`/api/payroll/periods/${periodId}`],
  });

  // Fetch employees
  const { data: employees, isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/payroll/employees"],
  });

  // Fetch payroll entries for this period
  const { 
    data: payrollEntries, 
    isLoading: isLoadingEntries 
  } = useQuery<PayrollEntry[]>({
    queryKey: [`/api/payroll/periods/${periodId}/entries`],
  });

  // Process payroll mutation
  const processPayrollMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST", 
        `/api/payroll/periods/${periodId}/process`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/payroll/periods/${periodId}`] 
      });
      setIsProcessDialogOpen(false);
      toast({
        title: "Success",
        description: "Payroll processing started",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to process payroll: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Complete payroll mutation
  const completePayrollMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST", 
        `/api/payroll/periods/${periodId}/complete`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/payroll/periods/${periodId}`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/payroll/periods"] 
      });
      setIsCompleteDialogOpen(false);
      toast({
        title: "Success",
        description: "Payroll processing completed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to complete payroll: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Create payroll entry mutation
  const createPayrollEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(
        "POST", 
        `/api/payroll/entries`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/payroll/periods/${periodId}/entries`] 
      });
      toast({
        title: "Success",
        description: "Payroll entry created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create payroll entry: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Get employee name from ID
  const getEmployeeName = (employeeId: number | null) => {
    if (!employeeId) return "Unknown";
    const employee = employees?.find(e => e.id === employeeId);
    return employee 
      ? `${employee.firstName} ${employee.lastName}`
      : "Unknown Employee";
  };

  // Calculate total hours for all time entries in this period
  const getTotalHours = (entries: PayrollEntry[] | undefined) => {
    if (!entries) return 0;
    
    return entries.reduce((total, entry) => {
      const regularHours = parseFloat(entry.regularHours || "0");
      const overtimeHours = parseFloat(entry.overtimeHours || "0");
      return total + regularHours + overtimeHours;
    }, 0);
  };

  // Calculate total pay for all entries
  const getTotalPay = (entries: PayrollEntry[] | undefined) => {
    if (!entries) return 0;
    
    return entries.reduce((total, entry) => {
      return total + parseFloat(entry.grossPay || "0");
    }, 0);
  };

  // Get count of unique employees in entries
  const getUniqueEmployeeCount = (entries: PayrollEntry[] | undefined) => {
    if (!entries) return 0;
    
    const uniqueIds = new Set(entries.map(entry => 
      entry.employeeId
    ).filter(Boolean));
    
    return uniqueIds.size;
  };

  // Format currency
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(num);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMMM d, yyyy");
    } catch (e) {
      return dateStr;
    }
  };

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case 'processing':
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case 'completed':
        return "bg-green-100 text-green-800 hover:bg-green-200";
      default:
        return "";
    }
  };

  // Loading state
  const isLoading = isLoadingPeriod || isLoadingEntries || isLoadingEmployees;

  // Calculate completion percentage for progress bar
  const getCompletionPercentage = () => {
    if (!period) return 0;
    
    switch (period.status) {
      case 'draft':
        return 0;
      case 'processing':
        return 50;
      case 'completed':
        return 100;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {period?.notes || `Pay Period #${periodId}`}
            </h1>
            <p className="text-muted-foreground">
              {period && `${formatDate(period.periodStart)} - ${formatDate(period.periodEnd)}`}
            </p>
          </div>
        </div>
        
        {period && period.status !== 'completed' && (
          <div className="flex gap-2">
            {period.status === 'draft' && (
              <Button 
                onClick={() => setIsProcessDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Process Payroll
              </Button>
            )}
            
            {period.status === 'processing' && (
              <Button 
                onClick={() => setIsCompleteDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <FileCheck className="mr-2 h-4 w-4" />
                Complete Payroll
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          {/* Status and Progress */}
          <Card className="bg-slate-50">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(period?.status || 'draft')}>
                      {period?.status === 'draft' && 'Draft'}
                      {period?.status === 'processing' && 'Processing'}
                      {period?.status === 'completed' && 'Completed'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {period?.status === 'draft' && 'Ready to process'}
                      {period?.status === 'processing' && 'In progress'}
                      {period?.status === 'completed' && `Completed on ${period?.updatedAt ? formatDate(period.updatedAt.toString()) : 'Unknown'}`}
                    </span>
                  </div>
                </div>
                
                <div className="w-full md:w-1/2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{getCompletionPercentage()}%</span>
                  </div>
                  <Progress value={getCompletionPercentage()} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pay Period Details */}
          <Tabs 
            defaultValue="summary" 
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="space-y-4"
          >
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="entries">Payroll Entries</TabsTrigger>
              <TabsTrigger value="reports" disabled={period?.status !== 'completed'}>
                Reports
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Key Statistics */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Pay
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(getTotalPay(payrollEntries))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Gross pay before deductions
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Employees
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {getUniqueEmployeeCount(payrollEntries)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Employees in this pay period
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {getTotalHours(payrollEntries).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total hours worked
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Period Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Period Information</CardTitle>
                  <CardDescription>
                    Details for this payroll period
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Period Dates</div>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        {period && `${formatDate(period.periodStart)} - ${formatDate(period.periodEnd)}`}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Payment Date</div>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        {period && formatDate(period.paymentDate)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Notes</div>
                    <div className="text-sm">
                      {period?.notes || "No notes for this pay period"}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Actions Needed */}
              {period?.status === 'draft' && payrollEntries?.length === 0 && (
                <Card className="border-dashed bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">Actions Needed</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">No payroll entries found</p>
                        <p className="text-sm text-amber-700">
                          Before processing this payroll period, you need to create 
                          payroll entries for your employees.
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => setSelectedTab("entries")}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Go to Payroll Entries
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="entries" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payroll Entries</CardTitle>
                  <CardDescription>
                    Employee payments for this pay period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {payrollEntries && payrollEntries.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Regular Hours</TableHead>
                          <TableHead>Overtime Hours</TableHead>
                          <TableHead>Gross Pay</TableHead>
                          <TableHead>Tax Amount</TableHead>
                          <TableHead>Net Pay</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payrollEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">
                              {getEmployeeName(entry.employeeId)}
                            </TableCell>
                            <TableCell>{entry.regularHours || "0"}</TableCell>
                            <TableCell>{entry.overtimeHours || "0"}</TableCell>
                            <TableCell>{formatCurrency(entry.grossPay)}</TableCell>
                            <TableCell>{formatCurrency(entry.taxAmount)}</TableCell>
                            <TableCell>{formatCurrency(entry.netPay)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-8 text-center">
                      <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <Users className="h-6 w-6 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">No Payroll Entries</h3>
                      <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        There are no payroll entries for this period yet. 
                        Payroll entries will be created when you process the payroll.
                      </p>
                      {period?.status === 'draft' && (
                        <Button
                          onClick={() => setIsProcessDialogOpen(true)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Process Payroll
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reports" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payroll Reports</CardTitle>
                  <CardDescription>
                    Reports and documents for this payroll period
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border bg-slate-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-medium">
                          Payroll Summary Report
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground mb-4">
                          Complete summary of all payments made during this period
                        </p>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" className="w-full">
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                      </CardFooter>
                    </Card>
                    
                    <Card className="border bg-slate-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-medium">
                          Tax Withholding Report
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground mb-4">
                          Details of taxes withheld for each employee
                        </p>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" className="w-full">
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Process Payroll Dialog */}
          <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Process Payroll</DialogTitle>
                <DialogDescription>
                  Start processing payroll for this period. This will calculate
                  pay for all employees with approved time entries.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="rounded-md border p-4 bg-blue-50">
                  <div className="flex gap-3">
                    <div className="text-blue-600 shrink-0 mt-0.5">
                      <FilePieChart className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">
                        What happens when processing payroll?
                      </h4>
                      <ul className="mt-1 text-sm text-blue-700 list-disc pl-5 space-y-1">
                        <li>Time entries will be collected and validated</li>
                        <li>Regular and overtime hours will be calculated</li>
                        <li>Gross pay, taxes, and deductions will be computed</li>
                        <li>Payroll entries for each employee will be generated</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-md border p-4 bg-amber-50">
                  <div className="flex gap-3">
                    <div className="text-amber-600 shrink-0 mt-0.5">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">
                        Important Note
                      </h4>
                      <p className="mt-1 text-sm text-amber-700">
                        You will have a chance to review the payroll before finalizing it.
                        Once payroll is complete, it cannot be modified.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsProcessDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => processPayrollMutation.mutate()}
                  disabled={processPayrollMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {processPayrollMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Start Processing
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Complete Payroll Dialog */}
          <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Complete Payroll</DialogTitle>
                <DialogDescription>
                  Finalize and complete this payroll period. This will lock
                  all entries and generate final reports.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="rounded-md border p-4 bg-amber-50">
                  <div className="flex gap-3">
                    <div className="text-amber-600 shrink-0 mt-0.5">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">
                        Warning
                      </h4>
                      <p className="mt-1 text-sm text-amber-700">
                        This action cannot be undone. Once payroll is marked as
                        complete, entries cannot be modified.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-md border p-4 bg-green-50">
                  <div className="flex gap-3">
                    <div className="text-green-600 shrink-0 mt-0.5">
                      <FileCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-green-800">
                        What happens after completion?
                      </h4>
                      <ul className="mt-1 text-sm text-green-700 list-disc pl-5 space-y-1">
                        <li>Final reports will be generated</li>
                        <li>Payment records will be created</li>
                        <li>All entries will be locked to prevent changes</li>
                        <li>The period will be marked as completed</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCompleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => completePayrollMutation.mutate()}
                  disabled={completePayrollMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {completePayrollMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <FileCheck className="mr-2 h-4 w-4" />
                      Complete Payroll
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}