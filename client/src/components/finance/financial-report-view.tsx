import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ChevronDown, 
  ChevronUp, 
  Download, 
  FileText, 
  Filter, 
  Mail, 
  Printer, 
  Share2, 
  X 
} from "lucide-react";
import {
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Bar,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DateRange } from "@/types/date-range";

// Define interfaces for strongly typed components
interface Category {
  id: number;
  name: string;
  amount: number;
  percentage?: number;
  items?: ExpenseItem[];
}

interface ExpenseItem {
  id: number;
  date: string;
  description: string;
  amount: number;
  category?: {
    id: number;
    name: string;
  };
  vendor?: string;
  paymentMethod?: string;
  isTaxDeductible?: boolean;
}

interface IncomeItem {
  id: number;
  date: string;
  description: string;
  amount: number;
  client?: string;
  status?: string;
  paymentMethod?: string;
}

interface MonthlyDataPoint {
  name: string;
  income: number;
  expenses: number;
}

interface ReportSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalItems?: number;
  profitMargin?: number;
  taxDeductible?: number;
}

interface Report {
  id: number;
  name: string;
  type: string;
  dateRange: DateRange;
  categories?: Category[];
  incomeDetails?: IncomeItem[];
  expenseDetails?: ExpenseItem[];
  monthlyData?: MonthlyDataPoint[];
  summary: ReportSummary;
  createdAt: string;
  userId: number;
}

interface FinancialReportViewProps {
  report: Report;
  onClose: () => void;
}

const FinancialReportView = ({ report, onClose }: FinancialReportViewProps) => {
  const [showDetails, setShowDetails] = useState(true);
  
  const pieChartColors = [
    "#4CAF50", "#2196F3", "#FF9800", "#9C27B0", "#3F51B5", 
    "#E91E63", "#795548", "#607D8B", "#F44336", "#9E9E9E"
  ];
  
  // Format currency values
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };
  
  // Prepare expense by category data for pie chart
  const expensesByCategoryData = report?.categories?.map((category: Category, index: number) => ({
    name: category.name,
    value: category.amount,
  })) || [];
  
  // Prepare monthly data for bar chart
  const monthlyData = report?.monthlyData || [
    { name: 'Jan', income: 4000, expenses: 2400 },
    { name: 'Feb', income: 3000, expenses: 1398 },
    { name: 'Mar', income: 2000, expenses: 9800 },
    { name: 'Apr', income: 2780, expenses: 3908 },
    { name: 'May', income: 1890, expenses: 4800 },
    { name: 'Jun', income: 2390, expenses: 3800 },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{report.name}</h2>
          <p className="text-muted-foreground">
            {new Date(report.dateRange?.from).toLocaleDateString()} - {new Date(report.dateRange?.to).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Printer className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Print report</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download as PDF</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Share Report</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Mail className="mr-2 h-4 w-4" /> Email
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" /> Generate Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Report Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
          <CardDescription>
            Overview of financial performance for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Income</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(report.summary?.totalIncome || 0)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(report.summary?.totalExpenses || 0)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Net Profit</p>
              <p className={`text-2xl font-bold ${(report.summary?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(report.summary?.netProfit || 0)}
              </p>
              <p className="text-sm text-muted-foreground">
                {report.summary?.profitMargin?.toFixed(1) || 0}% margin
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Visualization Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income Analysis</TabsTrigger>
          <TabsTrigger value="expenses">Expense Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
              <CardDescription>Income vs. Expenses by month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value) => formatCurrency(Number(value))} 
                    />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#4CAF50" />
                    <Bar dataKey="expenses" name="Expenses" fill="#F44336" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="income" className="space-y-4">
          {/* Income Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Income Distribution</CardTitle>
              <CardDescription>Breakdown by client or service</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Income data would go here */}
              <div className="text-center py-12 text-muted-foreground">
                Income distribution visualization will be shown here
              </div>
            </CardContent>
          </Card>
          
          {/* Income Details Table */}
          {showDetails && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Income Details</CardTitle>
                  <CardDescription>
                    All income transactions for this period
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <Filter className="mr-2 h-4 w-4" /> Filter
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(report.incomeDetails || []).map((item: IncomeItem) => (
                        <TableRow key={item.id}>
                          <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.client}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.status === 'received' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {item.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(item.amount))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between py-2 border-t">
                <p className="text-sm text-muted-foreground">
                  {report.incomeDetails?.length || 0} transactions
                </p>
                <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
                  {showDetails ? (
                    <>
                      <ChevronUp className="mr-2 h-4 w-4" /> Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" /> Show Details
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="expenses" className="space-y-4">
          {/* Expenses by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
              <CardDescription>Breakdown of expenses by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        
                        return percent > 0.05 ? (
                          <text 
                            x={x} 
                            y={y} 
                            fill="white" 
                            textAnchor={x > cx ? 'start' : 'end'} 
                            dominantBaseline="central"
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        ) : null;
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expensesByCategoryData.map((entry: {name: string, value: number}, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={pieChartColors[index % pieChartColors.length]} 
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value) => formatCurrency(Number(value))} 
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Expense Details Table */}
          {showDetails && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Expense Details</CardTitle>
                  <CardDescription>
                    All expense transactions for this period
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <Filter className="mr-2 h-4 w-4" /> Filter
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Tax Deductible</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(report.expenseDetails || []).map((item: ExpenseItem) => (
                        <TableRow key={item.id}>
                          <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.category?.name || 'Uncategorized'}</TableCell>
                          <TableCell>
                            {item.isTaxDeductible ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Yes
                              </span>
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(item.amount))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between py-2 border-t">
                <p className="text-sm text-muted-foreground">
                  {report.expenseDetails?.length || 0} transactions
                </p>
                <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
                  {showDetails ? (
                    <>
                      <ChevronUp className="mr-2 h-4 w-4" /> Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" /> Show Details
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialReportView;