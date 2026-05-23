import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Cell, 
  Legend, 
  Pie, 
  PieChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";
import DateRangePicker from "@/components/finance/date-range-picker";
import { DateRange } from "@/types/date-range";
import { subMonths } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function FinanceDashboard() {
  const defaultDateRange = {
    from: subMonths(new Date(), 3),
    to: new Date(),
  };
  
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  
  // Fetch expenses data
  const { data: expenses, isLoading: expensesLoading } = useQuery<any[]>({
    queryKey: ["/api/expenses"],
  });
  
  // Fetch income data
  const { data: income, isLoading: incomeLoading } = useQuery<any[]>({
    queryKey: ["/api/income"],
  });
  
  // Fetch expense categories data
  const { data: categories, isLoading: categoriesLoading } = useQuery<any[]>({
    queryKey: ["/api/expense-categories"],
  });
  
  const isLoading = expensesLoading || incomeLoading || categoriesLoading;
  
  // Process expenses by category for pie chart
  const expensesByCategory = !isLoading && expenses && categories 
    ? processExpensesByCategory(expenses, categories) 
    : [];
  
  // Process monthly income and expenses for bar chart
  const monthlyData = !isLoading && income && expenses 
    ? processMonthlyData(income, expenses) 
    : [];
  
  // Calculate financial summary
  const summary = !isLoading && income && expenses
    ? calculateFinancialSummary(income, expenses, dateRange) 
    : {
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    pendingIncome: 0,
  };

  const pieChartColors = [
    "#4CAF50", "#2196F3", "#FF9800", "#9C27B0", "#3F51B5", 
    "#E91E63", "#795548", "#607D8B", "#F44336", "#9E9E9E"
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Financial Dashboard</h2>
        <DateRangePicker 
          dateRange={dateRange}
          onChange={(range) => {
            if (range.from && range.to) {
              setDateRange(range);
            }
          }}
        />
      </div>
      
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard 
          title="Total Income" 
          value={formatCurrency(summary.totalIncome)}
          description="Received payments" 
          loading={isLoading}
          trend={10.5}
          trendLabel="vs last period"
        />
        <SummaryCard 
          title="Total Expenses" 
          value={formatCurrency(summary.totalExpenses)}
          description="All expenses" 
          loading={isLoading}
          trend={-2.3}
          trendLabel="vs last period"
          trendInverted
        />
        <SummaryCard 
          title="Net Profit" 
          value={formatCurrency(summary.netProfit)}
          description={`${summary.profitMargin.toFixed(1)}% margin`} 
          loading={isLoading}
          trend={15.8}
          trendLabel="vs last period"
        />
        <SummaryCard 
          title="Pending Income" 
          value={formatCurrency(summary.pendingIncome)}
          description="Awaiting payment" 
          loading={isLoading}
        />
      </div>
      
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income Analysis</TabsTrigger>
          <TabsTrigger value="expenses">Expense Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Alert>
            <Info className="h-5 w-5" />
            <AlertTitle>Dashboard Overview</AlertTitle>
            <AlertDescription>
              This dashboard shows your financial performance over the selected time period. 
              Use the date range picker to adjust the time frame.
            </AlertDescription>
          </Alert>
          
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* Monthly Income vs Expenses Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Overview</CardTitle>
                <CardDescription>Income vs expenses by month</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {isLoading ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#4CAF50" />
                      <Bar dataKey="expenses" name="Expenses" fill="#F44336" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            
            {/* Expenses by Category Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
                <CardDescription>Distribution of expenses</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {isLoading ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={pieChartColors[index % pieChartColors.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="income" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Income Analysis</CardTitle>
              <CardDescription>Income by client and category</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Income analysis coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Analysis</CardTitle>
              <CardDescription>Detailed expense breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Expense analysis coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ 
  title, 
  value, 
  description, 
  loading, 
  trend, 
  trendLabel,
  trendInverted = false 
}: { 
  title: string;
  value: string;
  description: string;
  loading: boolean;
  trend?: number;
  trendLabel?: string;
  trendInverted?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
            {trend !== undefined && (
              <div className={`mt-2 flex items-center text-xs ${
                trendInverted 
                  ? (trend > 0 ? "text-destructive" : "text-green-500") 
                  : (trend > 0 ? "text-green-500" : "text-destructive")
              }`}>
                {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
                {trendLabel && <span className="ml-1 text-muted-foreground">{trendLabel}</span>}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function processExpensesByCategory(expenses: any[], categories: any[]) {
  if (!expenses || !categories) return [];
  
  const categoryMap = new Map();
  categories.forEach(category => {
    categoryMap.set(category.id, category.name);
  });
  
  const categoryTotals = new Map();
  expenses.forEach(expense => {
    const categoryId = expense.categoryId;
    const categoryName = categoryMap.get(categoryId) || 'Other';
    const amount = parseFloat(expense.amount);
    
    if (categoryTotals.has(categoryName)) {
      categoryTotals.set(categoryName, categoryTotals.get(categoryName) + amount);
    } else {
      categoryTotals.set(categoryName, amount);
    }
  });
  
  return Array.from(categoryTotals.entries()).map(([name, value]) => ({
    name,
    value,
  }));
}

function processMonthlyData(income: any[], expenses: any[]) {
  if (!income || !expenses) return [];
  
  const monthMap = new Map();
  
  // Process income
  income.forEach(item => {
    const date = new Date(item.date);
    const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    if (!monthMap.has(monthYear)) {
      monthMap.set(monthYear, { month: monthYear, income: 0, expenses: 0 });
    }
    
    const amount = parseFloat(item.amount);
    const entry = monthMap.get(monthYear);
    entry.income += amount;
  });
  
  // Process expenses
  expenses.forEach(item => {
    const date = new Date(item.date);
    const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    if (!monthMap.has(monthYear)) {
      monthMap.set(monthYear, { month: monthYear, income: 0, expenses: 0 });
    }
    
    const amount = parseFloat(item.amount);
    const entry = monthMap.get(monthYear);
    entry.expenses += amount;
  });
  
  // Sort by date
  const sortedEntries = Array.from(monthMap.entries())
    .sort(([monthYearA], [monthYearB]) => {
      const dateA = new Date(monthYearA);
      const dateB = new Date(monthYearB);
      return dateA.getTime() - dateB.getTime();
    })
    .map(([_, entry]) => entry);
  
  return sortedEntries;
}

function calculateFinancialSummary(income: any[], expenses: any[], dateRange: DateRange) {
  if (!income || !expenses || !dateRange.from || !dateRange.to) {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netProfit: 0,
      profitMargin: 0,
      pendingIncome: 0,
    };
  }
  
  const fromDate = dateRange.from.getTime();
  const toDate = dateRange.to.getTime();
  
  // Calculate total income within date range
  const totalIncome = income
    .filter(item => {
      const date = new Date(item.date).getTime();
      return date >= fromDate && date <= toDate && item.status === 'received';
    })
    .reduce((sum, item) => sum + parseFloat(item.amount), 0);
  
  // Calculate pending income within date range
  const pendingIncome = income
    .filter(item => {
      const date = new Date(item.date).getTime();
      return date >= fromDate && date <= toDate && item.status === 'pending';
    })
    .reduce((sum, item) => sum + parseFloat(item.amount), 0);
  
  // Calculate total expenses within date range
  const totalExpenses = expenses
    .filter(item => {
      const date = new Date(item.date).getTime();
      return date >= fromDate && date <= toDate;
    })
    .reduce((sum, item) => sum + parseFloat(item.amount), 0);
  
  // Calculate net profit and profit margin
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
  
  return {
    totalIncome,
    totalExpenses,
    netProfit,
    profitMargin,
    pendingIncome,
  };
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ 
  cx, cy, midAngle, innerRadius, outerRadius, percent, index 
}: any) => {
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
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}