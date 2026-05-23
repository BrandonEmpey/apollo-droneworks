import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Search, Filter, ChevronDown, ChevronsUpDown, AlertCircle, Download, Printer } from "lucide-react";
import { PayrollEntry, PayrollPeriod, Employee } from "@shared/schema";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";

export default function PayrollEntries() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [viewEntrySheet, setViewEntrySheet] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch payroll periods
  const { data: periods } = useQuery<PayrollPeriod[]>({
    queryKey: ["/api/payroll/periods"],
  });

  // Fetch payroll entries for the selected period
  const { data: payrollEntries, isLoading } = useQuery<PayrollEntry[]>({
    queryKey: ["/api/payroll/entries", selectedPeriodId],
    enabled: !!selectedPeriodId,
  });

  // Fetch all employees
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/payroll/employees"],
  });

  // Fetch single payroll entry when viewing details
  const { data: selectedEntry } = useQuery<PayrollEntry>({
    queryKey: ["/api/payroll/entries", selectedEntryId],
    enabled: !!selectedEntryId,
  });

  // Generate payroll mutation
  const generatePayrollMutation = useMutation({
    mutationFn: async (periodId: number) => {
      await apiRequest("POST", `/api/payroll/periods/${periodId}/generate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/entries"] });
      toast({
        title: "Success",
        description: "Payroll generated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate payroll: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Process payroll (mark as completed) mutation
  const processPayrollMutation = useMutation({
    mutationFn: async (periodId: number) => {
      await apiRequest("PATCH", `/api/payroll/periods/${periodId}`, {
        status: "completed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/periods"] });
      toast({
        title: "Success",
        description: "Payroll processed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process payroll: " + error.message,
        variant: "destructive",
      });
    },
  });

  const selectedPeriod = periods?.find(p => p.id === selectedPeriodId);
  
  const getEmployeeName = (employeeId: number) => {
    const employee = employees?.find(e => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  };

  const filteredEntries = payrollEntries?.filter((entry) => {
    const searchLower = searchTerm.toLowerCase();
    const employeeName = getEmployeeName(entry.employeeId).toLowerCase();
    
    return employeeName.includes(searchLower);
  });

  const handleViewEntry = (entryId: number) => {
    setSelectedEntryId(entryId);
    setViewEntrySheet(true);
  };

  const totalGrossPay = filteredEntries?.reduce((sum, entry) => sum + Number(entry.grossPay), 0) || 0;
  const totalTaxes = filteredEntries?.reduce((sum, entry) => sum + Number(entry.taxAmount), 0) || 0;
  const totalNetPay = filteredEntries?.reduce((sum, entry) => sum + Number(entry.netPay), 0) || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="w-full sm:w-72">
          <Select
            value={selectedPeriodId?.toString() || ""}
            onValueChange={(value) => setSelectedPeriodId(value ? parseInt(value) : null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a payroll period" />
            </SelectTrigger>
            <SelectContent>
              {periods?.map((period) => (
                <SelectItem key={period.id} value={period.id.toString()}>
                  {format(new Date(period.periodStart), "MMM d")} - {format(new Date(period.periodEnd), "MMM d, yyyy")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedPeriodId && (
          <div className="flex gap-2">
            <Button variant="outline" className="shrink-0">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  Actions
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => generatePayrollMutation.mutate(selectedPeriodId)}
                  disabled={generatePayrollMutation.isPending}
                >
                  Generate Payroll
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => processPayrollMutation.mutate(selectedPeriodId)}
                  disabled={processPayrollMutation.isPending || selectedPeriod?.status === "completed"}
                >
                  Process Payroll
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Export Pay Stubs
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Print Payroll Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {selectedPeriodId ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Payroll Details</CardTitle>
                  <CardDescription>
                    {selectedPeriod ? (
                      <>
                        Period: {format(new Date(selectedPeriod.periodStart), "MMM d")} - {format(new Date(selectedPeriod.periodEnd), "MMM d, yyyy")}
                        {" | "}
                        Payment Date: {format(new Date(selectedPeriod.paymentDate), "MMM d, yyyy")}
                        {" | "}
                        Status: <Badge variant={selectedPeriod.status === "completed" ? "default" : "outline"}>{selectedPeriod.status}</Badge>
                      </>
                    ) : (
                      "Loading period details..."
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : filteredEntries && filteredEntries.length > 0 ? (
                <>
                  <div className="relative w-full sm:w-72 mb-4">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employees..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Regular Hours</TableHead>
                          <TableHead>Overtime Hours</TableHead>
                          <TableHead>Gross Pay</TableHead>
                          <TableHead>Taxes</TableHead>
                          <TableHead>Net Pay</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{getEmployeeName(entry.employeeId)}</TableCell>
                            <TableCell>{Number(entry.regularHours).toFixed(2)}</TableCell>
                            <TableCell>{Number(entry.overtimeHours).toFixed(2)}</TableCell>
                            <TableCell>${Number(entry.grossPay).toFixed(2)}</TableCell>
                            <TableCell>${Number(entry.taxAmount).toFixed(2)}</TableCell>
                            <TableCell className="font-medium">${Number(entry.netPay).toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewEntry(entry.id)}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="border rounded-md p-8 flex flex-col items-center justify-center gap-2 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No payroll entries found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm
                      ? "No employees match your search criteria"
                      : "This payroll period doesn't have any entries yet. Generate the payroll to create entries."}
                  </p>
                  {!searchTerm && (
                    <Button 
                      className="mt-2"
                      onClick={() => generatePayrollMutation.mutate(selectedPeriodId)}
                      disabled={generatePayrollMutation.isPending}
                    >
                      {generatePayrollMutation.isPending ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                          Generating...
                        </>
                      ) : (
                        "Generate Payroll"
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
            
            {filteredEntries && filteredEntries.length > 0 && (
              <CardFooter className="border-t">
                <div className="w-full">
                  <Collapsible className="w-full">
                    <CollapsibleTrigger asChild>
                      <div className="flex justify-between items-center w-full cursor-pointer py-2">
                        <span className="text-sm font-medium">Payroll Summary</span>
                        <ChevronsUpDown className="h-4 w-4" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 pt-2">
                        <div className="grid grid-cols-2 text-sm">
                          <span className="text-muted-foreground">Total Employees:</span>
                          <span className="font-medium">{filteredEntries.length}</span>
                        </div>
                        <div className="grid grid-cols-2 text-sm">
                          <span className="text-muted-foreground">Total Gross Pay:</span>
                          <span className="font-medium">${totalGrossPay.toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-2 text-sm">
                          <span className="text-muted-foreground">Total Taxes:</span>
                          <span className="font-medium">${totalTaxes.toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-2 text-sm">
                          <span className="text-muted-foreground">Total Net Pay:</span>
                          <span className="font-medium">${totalNetPay.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                        <Button variant="outline" size="sm">
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </CardFooter>
            )}
          </Card>
        
          <Sheet open={viewEntrySheet} onOpenChange={setViewEntrySheet}>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Payroll Entry Details</SheetTitle>
                <SheetDescription>
                  Detailed information about this payroll entry
                </SheetDescription>
              </SheetHeader>
              
              {selectedEntry ? (
                <div className="space-y-6 mt-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Employee Information</h3>
                    <p className="text-lg font-semibold">{getEmployeeName(selectedEntry.employeeId)}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Pay Details</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Regular Hours:</span>
                          <span className="font-medium">{Number(selectedEntry.regularHours).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Overtime Hours:</span>
                          <span className="font-medium">{Number(selectedEntry.overtimeHours).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Bonus:</span>
                          <span className="font-medium">${Number(selectedEntry.bonusAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Commission:</span>
                          <span className="font-medium">${Number(selectedEntry.commissionAmount).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Gross Pay:</span>
                          <span className="font-medium">${Number(selectedEntry.grossPay).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Taxes:</span>
                          <span className="font-medium">${Number(selectedEntry.taxAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Deductions:</span>
                          <span className="font-medium">${Number(selectedEntry.deductionAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Net Pay:</span>
                          <span>${Number(selectedEntry.netPay).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {selectedEntry.deductionAmount > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Deduction Reason</h3>
                      <p className="text-sm">{selectedEntry.deductionReason || "No reason specified"}</p>
                    </div>
                  )}
                  
                  {selectedEntry.notes && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
                      <p className="text-sm">{selectedEntry.notes}</p>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t flex justify-end gap-2">
                    <Button variant="outline">
                      <Printer className="mr-2 h-4 w-4" />
                      Print Pay Stub
                    </Button>
                    <Button>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-lg font-medium mb-2">Select a Payroll Period</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Choose a payroll period from the dropdown above to view and manage payroll entries.
            </p>
            {!periods || periods.length === 0 ? (
              <Button
                variant="outline"
                onClick={() => {
                  // Navigate to periods creation
                }}
              >
                Create Your First Payroll Period
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}