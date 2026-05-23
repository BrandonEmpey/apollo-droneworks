import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, FileSpreadsheet } from "lucide-react";
import { BillableHoursAnalytics } from "@/hooks/use-payroll-analytics";

interface BillableHoursTableProps {
  data: BillableHoursAnalytics | undefined;
}

export function BillableHoursTable({ data }: BillableHoursTableProps) {
  // Export to CSV function
  const exportToCsv = () => {
    if (!data || !data.entriesByProject || data.entriesByProject.length === 0) return;
    
    // Headers
    const headers = ['Project Name', 'Service Type', 'Total Hours', 'Billable Hours', 'Non-Billable Hours', 'Billable %'];
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.entriesByProject.map(item => {
        return [
          `"${item.projectName}"`,
          `"${item.serviceType}"`,
          item.totalHours,
          item.billableHours,
          item.nonBillableHours,
          item.billablePercentage
        ].join(',');
      }),
      // Add summary row
      ['TOTAL', '', data.totalHours, data.billableHours, data.nonBillableHours, data.billablePercentage].join(',')
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `billable_hours_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">No billable hours data available</h3>
        <p className="text-muted-foreground">
          There is no billable hours data for the selected filters. Try changing your filter criteria.
        </p>
      </div>
    );
  }
  
  // If there's no project data
  if (!data.entriesByProject || data.entriesByProject.length === 0) {
    return (
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Overall Billable Hours</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Hours</p>
              <p className="text-2xl font-bold">{data.totalHours}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Billable Hours</p>
              <p className="text-2xl font-bold">{data.billableHours}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Non-Billable Hours</p>
              <p className="text-2xl font-bold">{data.nonBillableHours}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Billable Percentage</p>
              <p className="text-2xl font-bold">{data.billablePercentage}%</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Billable Ratio</p>
            <Progress 
              value={parseFloat(data.billablePercentage)} 
              className="h-4"
            />
          </div>
        </div>
        <p className="text-center text-muted-foreground">
          No project-specific billable hours data available.
        </p>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Overall: {data.billablePercentage}% Billable</h3>
          <p className="text-sm text-muted-foreground">
            {data.billableHours} of {data.totalHours} hours are billable
          </p>
        </div>
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
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Service Type</TableHead>
              <TableHead className="text-right">Total Hours</TableHead>
              <TableHead className="text-right">Billable Hours</TableHead>
              <TableHead className="text-right">Non-Billable Hours</TableHead>
              <TableHead className="text-right">Billable %</TableHead>
              <TableHead>Billable Ratio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.entriesByProject.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{item.projectName}</TableCell>
                <TableCell>{item.serviceType}</TableCell>
                <TableCell className="text-right">{item.totalHours}</TableCell>
                <TableCell className="text-right">{item.billableHours}</TableCell>
                <TableCell className="text-right">{item.nonBillableHours}</TableCell>
                <TableCell className="text-right">{item.billablePercentage}%</TableCell>
                <TableCell>
                  <Progress 
                    value={parseFloat(item.billablePercentage)} 
                    className="h-2"
                  />
                </TableCell>
              </TableRow>
            ))}
            
            {/* Summary row */}
            <TableRow className="bg-muted/50">
              <TableCell className="font-bold" colSpan={2}>TOTAL</TableCell>
              <TableCell className="text-right font-bold">{data.totalHours}</TableCell>
              <TableCell className="text-right font-bold">{data.billableHours}</TableCell>
              <TableCell className="text-right font-bold">{data.nonBillableHours}</TableCell>
              <TableCell className="text-right font-bold">{data.billablePercentage}%</TableCell>
              <TableCell>
                <Progress 
                  value={parseFloat(data.billablePercentage)} 
                  className="h-2"
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}