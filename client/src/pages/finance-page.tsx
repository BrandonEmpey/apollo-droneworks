import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Download, 
  Printer, 
  BarChart, 
  FileText, 
  Receipt, 
  Calculator,
  PieChart,
  BriefcaseBusiness,
  Users,
  BarChart3,
  Activity
} from "lucide-react";
import ExpensesList from "@/components/finance/expenses-list";
import IncomeList from "@/components/finance/income-list";
import ExpenseCategoriesList from "@/components/finance/expense-categories-list";
import FinancialReportsList from "@/components/finance/financial-reports-list";
import ExpenseForm from "@/components/finance/expense-form";
import IncomeForm from "@/components/finance/income-form";
import { FinanceDashboard } from "@/components/finance/finance-dashboard";
import DocumentManagement from "@/components/finance/document-management";
import ExportData from "@/components/finance/export-data";
import BudgetPlanning from "@/components/finance/budget-planning";
import TaxCalculation from "@/components/finance/tax-calculation";
import PayrollDashboard from "@/components/finance/payroll/payroll-dashboard";
import { PayrollAnalyticsDashboard } from "@/components/finance/analytics/payroll-analytics-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DateRangePicker from "@/components/finance/date-range-picker";
import { subMonths } from "date-fns";
import { DateRange } from "@/types/date-range";
import { Layout } from "@/components/ui/layout";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/utils";

const FinancePage = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | undefined>(undefined);
  const [editingIncomeId, setEditingIncomeId] = useState<number | undefined>(undefined);
  const { toast } = useToast();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Set up date range for filtering (default to current month)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  
  // Define types for expenses and income
  interface Expense {
    id: number;
    date: string;
    amount: number | string;
    description: string;
    category?: {
      id: number;
      name: string;
    };
    isTaxDeductible: boolean;
    paymentMethod: string;
    notes?: string;
  }

  interface Income {
    id: number;
    date: string;
    amount: number | string;
    description: string;
    client?: string;
    status: string;
    paymentMethod: string;
    notes?: string;
  }

  // Fetch expenses within date range
  const { data: expenses } = useQuery<Expense[]>({
    queryKey: [
      '/api/expenses',
      {
        startDate: dateRange.from?.toISOString().split('T')[0],
        endDate: dateRange.to?.toISOString().split('T')[0]
      }
    ],
    enabled: true,
  });
  
  // Fetch income within date range
  const { data: income } = useQuery<Income[]>({
    queryKey: [
      '/api/income',
      {
        startDate: dateRange.from?.toISOString().split('T')[0],
        endDate: dateRange.to?.toISOString().split('T')[0]
      }
    ],
    enabled: true,
  });
  
  // Calculate financial metrics
  const totalExpenses = expenses ? expenses.reduce((sum: number, expense: Expense) => sum + Number(expense.amount), 0) : 0;
  const totalIncome = income ? income.reduce((sum: number, income: Income) => sum + Number(income.amount), 0) : 0;
  const profit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;
  
  const handleEditExpense = (id: number) => {
    setEditingExpenseId(id);
    setShowExpenseForm(true);
    setActiveTab("expenses");
  };
  
  const handleEditIncome = (id: number) => {
    setEditingIncomeId(id);
    setShowIncomeForm(true);
    setActiveTab("income");
  };
  
  const handleExpenseFormClose = () => {
    setShowExpenseForm(false);
    setEditingExpenseId(undefined);
  };
  
  const handleIncomeFormClose = () => {
    setShowIncomeForm(false);
    setEditingIncomeId(undefined);
  };
  
  const handleExpenseFormSuccess = () => {
    toast({
      title: editingExpenseId ? "Expense updated" : "Expense added",
      description: editingExpenseId 
        ? "The expense has been updated successfully." 
        : "The expense has been added successfully.",
    });
    setShowExpenseForm(false);
    setEditingExpenseId(undefined);
  };
  
  const handleIncomeFormSuccess = () => {
    toast({
      title: editingIncomeId ? "Income updated" : "Income added",
      description: editingIncomeId 
        ? "The income entry has been updated successfully." 
        : "The income entry has been added successfully.",
    });
    setShowIncomeForm(false);
    setEditingIncomeId(undefined);
  };
  
  return (
    <>
      <Helmet>
        <title>Financial Management | Apollo DroneWorks</title>
      </Helmet>
      <Layout user={user} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
        <div className="container mx-auto py-8 px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">Financial Management</h1>
              <p className="text-muted-foreground">
                Track, manage, and analyze your business finances
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
              {activeTab === "overview" && (
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" className="flex items-center">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button variant="outline" className="flex items-center">
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalIncome)}
                </div>
                <CardDescription>
                  For selected period
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalExpenses)}
                </div>
                <CardDescription>
                  For selected period
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(profit)}
                </div>
                <CardDescription>
                  Income minus expenses
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Profit Margin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitMargin.toFixed(1)}%
                </div>
                <CardDescription>
                  Percentage of income
                </CardDescription>
              </CardContent>
            </Card>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex flex-col space-y-2">
              <TabsList className="overflow-auto w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="budget">Budget</TabsTrigger>
                <TabsTrigger value="tax">Tax</TabsTrigger>
                <TabsTrigger value="payroll">
                  <Users className="mr-2 h-4 w-4" />
                  Payroll
                </TabsTrigger>
                <TabsTrigger value="analytics">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="export">Export</TabsTrigger>
              </TabsList>
              
              <div className="flex justify-end gap-2">
                {activeTab === "income" && (
                  <Button 
                    onClick={() => setShowIncomeForm(true)}
                    className="flex items-center"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Income
                  </Button>
                )}
                
                {activeTab === "reports" && (
                  <Button variant="outline" className="flex items-center">
                    <Plus className="mr-2 h-4 w-4" />
                    New Report
                  </Button>
                )}
                
                {/* Export and Print buttons moved to top section */}
              </div>
            </div>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Recent Expenses</h3>
                    <Button 
                      variant="link" 
                      onClick={() => setActiveTab("expenses")}
                    >
                      View All
                    </Button>
                  </div>
                  <div>
                    {expenses && expenses.length > 0 ? (
                      <div className="space-y-2">
                        {expenses.slice(0, 5).map((expense) => (
                          <div 
                            key={expense.id} 
                            className="flex justify-between items-center p-2 rounded border"
                          >
                            <div>
                              <div className="font-medium">{expense.description}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(expense.date).toLocaleDateString()} • {expense.category?.name || 'Uncategorized'}
                              </div>
                            </div>
                            <div className="font-medium text-destructive">
                              {formatCurrency(Number(expense.amount))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 text-muted-foreground">
                        No recent expenses
                      </div>
                    )}
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Recent Income</h3>
                    <Button 
                      variant="link" 
                      onClick={() => setActiveTab("income")}
                    >
                      View All
                    </Button>
                  </div>
                  <div>
                    {income && income.length > 0 ? (
                      <div className="space-y-2">
                        {income.slice(0, 5).map((income) => (
                          <div 
                            key={income.id} 
                            className="flex justify-between items-center p-2 rounded border"
                          >
                            <div>
                              <div className="font-medium">{income.description}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(income.date).toLocaleDateString()} • {income.client || 'No client'}
                              </div>
                            </div>
                            <div className="font-medium text-green-600">
                              {formatCurrency(Number(income.amount))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 text-muted-foreground">
                        No recent income
                      </div>
                    )}
                  </div>
                </Card>
                
                <Card className="p-4 lg:col-span-2">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Financial Insights</h3>
                    <Button variant="outline" className="flex items-center">
                      <BarChart className="mr-2 h-4 w-4" />
                      View Analytics
                    </Button>
                  </div>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Analytics charts will be shown here
                  </div>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="income">
              {showIncomeForm ? (
                <IncomeForm 
                  incomeId={editingIncomeId}
                  onClose={handleIncomeFormClose}
                  onSuccess={handleIncomeFormSuccess}
                />
              ) : null}
              <IncomeList 
                dateRange={dateRange}
                onEdit={handleEditIncome}
              />
            </TabsContent>
            
            <TabsContent value="expenses">
              {showExpenseForm ? (
                <ExpenseForm 
                  expenseId={editingExpenseId}
                  onClose={handleExpenseFormClose}
                  onSuccess={handleExpenseFormSuccess}
                />
              ) : null}
              <ExpensesList 
                dateRange={dateRange}
                onEdit={handleEditExpense}
              />
            </TabsContent>
            
            <TabsContent value="categories">
              <ExpenseCategoriesList />
            </TabsContent>
            
            <TabsContent value="reports">
              <FinancialReportsList />
            </TabsContent>
            
            <TabsContent value="documents">
              <DocumentManagement />
            </TabsContent>
            
            <TabsContent value="budget">
              <BudgetPlanning />
            </TabsContent>
            
            <TabsContent value="tax">
              <TaxCalculation />
            </TabsContent>
            
            <TabsContent value="payroll">
              <PayrollDashboard />
            </TabsContent>
            
            <TabsContent value="analytics">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Business Analytics</h2>
                  <Button 
                    variant="default" 
                    className="flex items-center"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/analytics/sync', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          }
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                          toast({
                            title: "Analytics synchronized",
                            description: "Analytics data has been synchronized successfully.",
                            variant: "default"
                          });
                        } else {
                          toast({
                            title: "Synchronization failed",
                            description: result.error || "Failed to synchronize analytics data.",
                            variant: "destructive"
                          });
                        }
                      } catch (error) {
                        toast({
                          title: "Synchronization error",
                          description: "An error occurred while synchronizing analytics data.",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    Sync Analytics Data
                  </Button>
                </div>
                <PayrollAnalyticsDashboard />
              </div>
            </TabsContent>
            
            <TabsContent value="export">
              <ExportData />
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </>
  );
};

export default FinancePage;