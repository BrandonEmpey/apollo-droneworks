import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import DateRangePicker from "@/components/finance/date-range-picker";
import { DateRange } from "@/types/date-range";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Printer, PieChart, BarChart, Plus } from "lucide-react";
import { subMonths } from "date-fns";
import { Input } from "@/components/ui/input";

// Types for report generation
interface ReportOptions {
  name: string;
  type: string;
  dateRange: DateRange;
  groupBy?: string;
  includeCategories?: string[];
  includeTaxItems?: boolean;
  includePendingItems?: boolean;
  showDetailsView?: boolean;
}

const FinancialReportsList = () => {
  // Set default date range to last 3 months
  const defaultDateRange = {
    from: subMonths(new Date(), 3),
    to: new Date(),
  };
  
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  const [showNewReportDialog, setShowNewReportDialog] = useState(false);
  const [reportOptions, setReportOptions] = useState<ReportOptions>({
    name: "",
    type: "income-expense",
    dateRange: defaultDateRange,
    groupBy: "month",
    includeTaxItems: true,
    includePendingItems: false,
    showDetailsView: false,
  });

  // Fetch financial reports data
  const { data: reports, isLoading } = useQuery<any[]>({
    queryKey: ["/api/financial-reports"],
  });

  // Fetch expense categories for the report filter options
  const { data: categories } = useQuery<any[]>({
    queryKey: ["/api/expense-categories"],
  });

  const handleCreateReport = () => {
    // Logic to create report would go here (to be implemented)
    setShowNewReportDialog(false);
    // Reset report options
    setReportOptions({
      name: "",
      type: "income-expense",
      dateRange: defaultDateRange,
      groupBy: "month",
      includeTaxItems: true,
      includePendingItems: false,
      showDetailsView: false,
    });
  };

  const renderReportTypeIcon = (type: string) => {
    switch (type) {
      case "income-expense":
        return <BarChart className="h-5 w-5 text-blue-500" />;
      case "profit-loss":
        return <PieChart className="h-5 w-5 text-green-500" />;
      case "tax-summary":
        return <FileText className="h-5 w-5 text-amber-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatReportType = (type: string) => {
    switch (type) {
      case "income-expense":
        return "Income & Expense";
      case "profit-loss":
        return "Profit & Loss";
      case "tax-summary":
        return "Tax Summary";
      case "expense-category":
        return "Expense by Category";
      case "client-profitability":
        return "Client Profitability";
      default:
        return type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold">Financial Reports</h2>
        </div>
        <div className="mb-6">
          <Dialog open={showNewReportDialog} onOpenChange={setShowNewReportDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Generate Financial Report</DialogTitle>
              <DialogDescription>
                Configure your report parameters below.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="report-name">Report Name</Label>
                  <Input 
                    id="report-name" 
                    placeholder="Q2 Financial Summary"
                    value={reportOptions.name}
                    onChange={(e) => setReportOptions({
                      ...reportOptions,
                      name: e.target.value
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select 
                    value={reportOptions.type}
                    onValueChange={(value) => setReportOptions({
                      ...reportOptions,
                      type: value
                    })}
                  >
                    <SelectTrigger id="report-type">
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Standard Reports</SelectLabel>
                        <SelectItem value="income-expense">Income & Expense</SelectItem>
                        <SelectItem value="profit-loss">Profit & Loss</SelectItem>
                        <SelectItem value="tax-summary">Tax Summary</SelectItem>
                        <SelectItem value="expense-category">Expense by Category</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Advanced Reports</SelectLabel>
                        <SelectItem value="client-profitability">Client Profitability</SelectItem>
                        <SelectItem value="service-revenue">Service Revenue</SelectItem>
                        <SelectItem value="cash-flow">Cash Flow</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <DateRangePicker 
                    dateRange={reportOptions.dateRange}
                    onChange={(range) => {
                      if (range.from && range.to) {
                        setReportOptions({
                          ...reportOptions,
                          dateRange: range
                        });
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="group-by">Group By</Label>
                  <Select 
                    value={reportOptions.groupBy}
                    onValueChange={(value) => setReportOptions({
                      ...reportOptions,
                      groupBy: value
                    })}
                  >
                    <SelectTrigger id="group-by">
                      <SelectValue placeholder="Select grouping" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="quarter">Quarter</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label>Additional Options</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-tax-items"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={reportOptions.includeTaxItems}
                      onChange={(e) => setReportOptions({
                        ...reportOptions,
                        includeTaxItems: e.target.checked
                      })}
                    />
                    <Label htmlFor="include-tax-items" className="text-sm font-medium">
                      Include tax-deductible items
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-pending"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={reportOptions.includePendingItems}
                      onChange={(e) => setReportOptions({
                        ...reportOptions,
                        includePendingItems: e.target.checked
                      })}
                    />
                    <Label htmlFor="include-pending" className="text-sm font-medium">
                      Include pending transactions
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-details"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={reportOptions.showDetailsView}
                      onChange={(e) => setReportOptions({
                        ...reportOptions,
                        showDetailsView: e.target.checked
                      })}
                    />
                    <Label htmlFor="show-details" className="text-sm font-medium">
                      Show detailed view
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowNewReportDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateReport}>
                Generate Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : reports && reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{report.name}</CardTitle>
                  {renderReportTypeIcon(report.type)}
                </div>
                <CardDescription>
                  {formatReportType(report.type)} • {new Date(report.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>
                    {new Date(report.dateRange.from).toLocaleDateString()} - {new Date(report.dateRange.to).toLocaleDateString()}
                  </p>
                  <p className="mt-1">
                    {report.summary?.totalItems || 0} transactions included
                  </p>
                  {report.summary?.totalIncome !== undefined && (
                    <div className="mt-2">
                      <div className="flex justify-between">
                        <span>Income:</span>
                        <span className="font-medium text-green-600">
                          ${Number(report.summary.totalIncome).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expenses:</span>
                        <span className="font-medium text-red-600">
                          ${Number(report.summary.totalExpenses).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t mt-1 pt-1">
                        <span>Net:</span>
                        <span className={`font-medium ${Number(report.summary.netProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${Number(report.summary.netProfit).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between py-2">
                <Button variant="outline" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  View
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Printer className="h-4 w-4" />
                    <span className="sr-only">Print</span>
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Download</span>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
          <div className="rounded-full bg-muted p-6">
            <FileText className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">No reports yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Generate your first financial report to get insights into your business performance.
            </p>
            <Button onClick={() => setShowNewReportDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </div>
        </div>
      )}

      {/* Sample Report Preview Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Sample Income & Expense Report</CardTitle>
          <CardDescription>Preview of a sample Income & Expense report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Jan 2025</TableCell>
                  <TableCell className="text-right">$2,840.00</TableCell>
                  <TableCell className="text-right">$1,240.00</TableCell>
                  <TableCell className="text-right text-green-600">$1,600.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Feb 2025</TableCell>
                  <TableCell className="text-right">$3,150.00</TableCell>
                  <TableCell className="text-right">$1,895.00</TableCell>
                  <TableCell className="text-right text-green-600">$1,255.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Mar 2025</TableCell>
                  <TableCell className="text-right">$4,230.00</TableCell>
                  <TableCell className="text-right">$2,340.00</TableCell>
                  <TableCell className="text-right text-green-600">$1,890.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Apr 2025</TableCell>
                  <TableCell className="text-right">$5,120.00</TableCell>
                  <TableCell className="text-right">$2,680.00</TableCell>
                  <TableCell className="text-right text-green-600">$2,440.00</TableCell>
                </TableRow>
                <TableRow className="font-medium bg-muted/50">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">$15,340.00</TableCell>
                  <TableCell className="text-right">$8,155.00</TableCell>
                  <TableCell className="text-right text-green-600">$7,185.00</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between py-2">
          <div>
            <p className="text-sm text-muted-foreground">
              Report Generated: April 15, 2025
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default FinancialReportsList;