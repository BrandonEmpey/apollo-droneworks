import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Download, FileSpreadsheet } from "lucide-react";
import { PayrollAnalytics, GroupByOption } from "@/hooks/use-payroll-analytics";
import { formatCurrency } from "@/lib/utils";

interface PayrollDataTableProps {
  data: PayrollAnalytics[];
  groupBy: GroupByOption;
}

export function PayrollDataTable({ data, groupBy }: PayrollDataTableProps) {
  // Export to CSV function
  const exportToCsv = () => {
    if (data.length === 0) return;
    
    // Determine headers based on groupBy
    let headers: string[] = [];
    if (groupBy === 'monthly') {
      headers = ['Month', 'Gross Pay', 'Net Pay', 'Tax Amount', 'Regular Hours', 'Overtime Hours', 'Entry Count'];
    } else if (groupBy === 'employee') {
      headers = ['Employee', 'Position', 'Gross Pay', 'Net Pay', 'Tax Amount', 'Regular Hours', 'Overtime Hours', 'Period Count'];
    } else if (groupBy === 'period') {
      headers = ['Period Start', 'Period End', 'Status', 'Gross Pay', 'Net Pay', 'Tax Amount', 'Regular Hours', 'Overtime Hours', 'Employee Count'];
    }
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(item => {
        if (groupBy === 'monthly') {
          return [
            item.month,
            formatCurrency(item.totalGrossPay),
            formatCurrency(item.totalNetPay),
            formatCurrency(item.totalTaxAmount),
            item.totalRegularHours,
            item.totalOvertimeHours,
            item.entryCount
          ].join(',');
        } else if (groupBy === 'employee') {
          return [
            item.employeeName,
            item.position,
            formatCurrency(item.totalGrossPay),
            formatCurrency(item.totalNetPay),
            formatCurrency(item.totalTaxAmount),
            item.totalRegularHours,
            item.totalOvertimeHours,
            item.periodCount
          ].join(',');
        } else if (groupBy === 'period') {
          return [
            item.periodStart,
            item.periodEnd,
            item.status,
            formatCurrency(item.totalGrossPay),
            formatCurrency(item.totalNetPay),
            formatCurrency(item.totalTaxAmount),
            item.totalRegularHours,
            item.totalOvertimeHours,
            item.employeeCount
          ].join(',');
        }
        return [];
      })
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payroll_data_${groupBy}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">No payroll data available</h3>
        <p className="text-muted-foreground">
          There is no payroll data for the selected filters. Try changing your filter criteria.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={exportToCsv}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            {groupBy === 'monthly' && (
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Gross Pay</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead className="text-right">Tax Amount</TableHead>
                <TableHead className="text-right">Regular Hours</TableHead>
                <TableHead className="text-right">Overtime Hours</TableHead>
                <TableHead className="text-right">Entries</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            )}
            
            {groupBy === 'employee' && (
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="text-right">Gross Pay</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead className="text-right">Tax Amount</TableHead>
                <TableHead className="text-right">Regular Hours</TableHead>
                <TableHead className="text-right">Overtime Hours</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            )}
            
            {groupBy === 'period' && (
              <TableRow>
                <TableHead>Period Start</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Gross Pay</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead className="text-right">Tax Amount</TableHead>
                <TableHead className="text-right">Employees</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            )}
          </TableHeader>
          
          <TableBody>
            {groupBy === 'monthly' && data.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{item.month}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalGrossPay)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalNetPay)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalTaxAmount)}</TableCell>
                <TableCell className="text-right">{item.totalRegularHours}</TableCell>
                <TableCell className="text-right">{item.totalOvertimeHours}</TableCell>
                <TableCell className="text-right">{item.entryCount}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => {}}>View Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {}}>Download Report</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            
            {groupBy === 'employee' && data.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{item.employeeName}</TableCell>
                <TableCell>{item.position}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalGrossPay)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalNetPay)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalTaxAmount)}</TableCell>
                <TableCell className="text-right">{item.totalRegularHours}</TableCell>
                <TableCell className="text-right">{item.totalOvertimeHours}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => {}}>View Employee</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {}}>Download Report</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            
            {groupBy === 'period' && data.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{item.periodStart}</TableCell>
                <TableCell>{item.periodEnd}</TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      item.status === 'paid' ? 'default' : 
                      item.status === 'pending' ? 'outline' : 
                      'secondary'
                    }
                  >
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalGrossPay)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalNetPay)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalTaxAmount)}</TableCell>
                <TableCell className="text-right">{item.employeeCount}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => {}}>View Period</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {}}>Download Report</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}