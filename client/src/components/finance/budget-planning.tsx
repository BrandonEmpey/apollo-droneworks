import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Calendar,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Budget item schema for form validation
const budgetItemSchema = z.object({
  id: z.number().optional(),
  categoryId: z.string().nonempty("Category is required"),
  amount: z
    .string()
    .nonempty("Amount is required")
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      "Amount must be a positive number"
    ),
  period: z.string().nonempty("Period is required"),
  notes: z.string().optional().default(""),
});

// Budget interface
interface Budget {
  id: number;
  categoryId: number;
  amount: number;
  period: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Period options
const PERIOD_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

// Formatters
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export default function BudgetPlanning() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);

  // Form definition
  const form = useForm<z.infer<typeof budgetItemSchema>>({
    resolver: zodResolver(budgetItemSchema),
    defaultValues: {
      categoryId: "",
      amount: "",
      period: "monthly",
      notes: "",
    },
  });

  // Fetch budget items
  const {
    data: budgetItems = [],
    isLoading: budgetItemsLoading,
    refetch: refetchBudgetItems,
  } = useQuery({
    queryKey: ["/api/budget-items"],
  });

  // Fetch expense categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/expense-categories"],
  });

  // Fetch expenses
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["/api/expenses"],
  });

  // Mutations
  const createBudgetItemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof budgetItemSchema>) => {
      const response = await apiRequest("POST", "/api/budget-items", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Budget item created",
        description: "Your budget item has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/budget-items"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create budget item",
        variant: "destructive",
      });
    },
  });

  const updateBudgetItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof budgetItemSchema> }) => {
      const response = await apiRequest("PATCH", `/api/budget-items/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Budget item updated",
        description: "Your budget item has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/budget-items"] });
      setDialogOpen(false);
      form.reset();
      setEditingBudgetId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update budget item",
        variant: "destructive",
      });
    },
  });

  const deleteBudgetItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/budget-items/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Budget item deleted",
        description: "Your budget item has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/budget-items"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete budget item",
        variant: "destructive",
      });
    },
  });

  // Filter budget items by period
  const filteredBudgetItems = budgetItems.filter(
    (item: Budget) => item.period === selectedPeriod
  );

  // Prepare data for the chart
  const getChartData = () => {
    // Group budget items by category
    const budgetByCategory = filteredBudgetItems.reduce(
      (acc: { [key: string]: number }, item: Budget) => {
        const category = categories.find((cat: any) => cat.id === item.categoryId);
        const categoryName = category ? category.name : "Unknown";
        acc[categoryName] = parseFloat(String(item.amount)) || 0;
        return acc;
      },
      {}
    );

    // Calculate actual spending by category
    const spendingByCategory = expenses.reduce(
      (acc: { [key: string]: number }, expense: any) => {
        const category = categories.find((cat: any) => cat.id === expense.categoryId);
        if (category) {
          const categoryName = category.name;
          if (!acc[categoryName]) acc[categoryName] = 0;
          acc[categoryName] += parseFloat(String(expense.amount)) || 0;
        }
        return acc;
      },
      {}
    );

    // Combine data
    return Object.keys(budgetByCategory).map((categoryName) => ({
      name: categoryName,
      budget: budgetByCategory[categoryName],
      actual: spendingByCategory[categoryName] || 0,
    }));
  };

  // Calculate budget vs. actual spending
  const getBudgetSummary = () => {
    const totalBudget = filteredBudgetItems.reduce(
      (sum: number, item: Budget) => sum + (parseFloat(String(item.amount)) || 0),
      0
    );
    
    // For simplicity, we'll assume expenses are for the current period
    // In a real application, you'd filter by date range
    const totalSpending = expenses.reduce(
      (sum: number, expense: any) => sum + (parseFloat(String(expense.amount)) || 0),
      0
    );
    
    const variance = totalBudget - totalSpending;
    const percentage = totalBudget > 0 
      ? (totalSpending / totalBudget) * 100 
      : 0;
    
    return {
      totalBudget,
      totalSpending,
      variance,
      percentage,
    };
  };

  // Handle form submission
  const onSubmit = (values: z.infer<typeof budgetItemSchema>) => {
    const data = {
      ...values,
      amount: parseFloat(values.amount),
      categoryId: parseInt(values.categoryId)
    };
    
    if (editingBudgetId !== null) {
      updateBudgetItemMutation.mutate({ id: editingBudgetId, data });
    } else {
      createBudgetItemMutation.mutate(data);
    }
  };

  // Edit budget item
  const handleEditBudgetItem = (budgetItem: Budget) => {
    setEditingBudgetId(budgetItem.id);
    form.reset({
      categoryId: budgetItem.categoryId.toString(),
      amount: budgetItem.amount.toString(),
      period: budgetItem.period,
      notes: budgetItem.notes || "",
    });
    setDialogOpen(true);
  };

  // Delete budget item
  const handleDeleteBudgetItem = (id: number) => {
    if (confirm("Are you sure you want to delete this budget item?")) {
      deleteBudgetItemMutation.mutate(id);
    }
  };

  // Open dialog for new budget item
  const handleAddBudgetItem = () => {
    setEditingBudgetId(null);
    form.reset({
      categoryId: "",
      amount: "",
      period: selectedPeriod,
      notes: "",
    });
    setDialogOpen(true);
  };

  // Get category name by ID
  const getCategoryName = (categoryId: number) => {
    const category = categories.find((cat: any) => cat.id === categoryId);
    return category ? category.name : "Unknown";
  };

  // Budget summary
  const budgetSummary = getBudgetSummary();

  // Loading state
  const isLoading = budgetItemsLoading || categoriesLoading || expensesLoading;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Budget Planning</CardTitle>
          <CardDescription>
            Manage your budget allocations and track spending against your plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="monthly" onValueChange={setSelectedPeriod}>
            <div className="flex justify-between items-center mb-6">
              <TabsList>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
                <TabsTrigger value="annual">Annual</TabsTrigger>
              </TabsList>
              <Button onClick={handleAddBudgetItem}>
                <Plus className="mr-2 h-4 w-4" /> Add Budget Item
              </Button>
            </div>

            <TabsContent value="monthly" className="space-y-6">
              <BudgetContent
                budgetItems={filteredBudgetItems}
                categories={categories}
                chartData={getChartData()}
                budgetSummary={budgetSummary}
                isLoading={isLoading}
                onEdit={handleEditBudgetItem}
                onDelete={handleDeleteBudgetItem}
                getCategoryName={getCategoryName}
              />
            </TabsContent>
            <TabsContent value="quarterly" className="space-y-6">
              <BudgetContent
                budgetItems={filteredBudgetItems}
                categories={categories}
                chartData={getChartData()}
                budgetSummary={budgetSummary}
                isLoading={isLoading}
                onEdit={handleEditBudgetItem}
                onDelete={handleDeleteBudgetItem}
                getCategoryName={getCategoryName}
              />
            </TabsContent>
            <TabsContent value="annual" className="space-y-6">
              <BudgetContent
                budgetItems={filteredBudgetItems}
                categories={categories}
                chartData={getChartData()}
                budgetSummary={budgetSummary}
                isLoading={isLoading}
                onEdit={handleEditBudgetItem}
                onDelete={handleDeleteBudgetItem}
                getCategoryName={getCategoryName}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Budget Item Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingBudgetId ? "Edit Budget Item" : "Add Budget Item"}
            </DialogTitle>
            <DialogDescription>
              {editingBudgetId
                ? "Update your budget allocation for this category"
                : "Allocate budget to a specific expense category"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoriesLoading ? (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span>Loading categories...</span>
                          </div>
                        ) : (
                          Array.isArray(categories) &&
                          categories.map((category: any) => (
                            <SelectItem
                              key={category.id}
                              value={category.id.toString()}
                            >
                              {category.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5">$</span>
                        <Input
                          placeholder="0.00"
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="pl-8"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Period</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a period" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PERIOD_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Add any notes about this budget item" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBudgetId ? "Update" : "Add"} Budget Item
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Budget Content Component
function BudgetContent({
  budgetItems,
  categories,
  chartData,
  budgetSummary,
  isLoading,
  onEdit,
  onDelete,
  getCategoryName,
}: {
  budgetItems: Budget[];
  categories: any[];
  chartData: any[];
  budgetSummary: {
    totalBudget: number;
    totalSpending: number;
    variance: number;
    percentage: number;
  };
  isLoading: boolean;
  onEdit: (budgetItem: Budget) => void;
  onDelete: (id: number) => void;
  getCategoryName: (id: number) => string;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin opacity-70" />
      </div>
    );
  }

  const { totalBudget, totalSpending, variance, percentage } = budgetSummary;
  const isOverBudget = totalSpending > totalBudget;

  const statusColor = isOverBudget ? "text-red-500" : "text-green-500";
  const progressColor = isOverBudget ? "bg-red-500" : "bg-green-500";

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Budget
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  {formatCurrency(totalBudget)}
                </h3>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Spending
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  {formatCurrency(totalSpending)}
                </h3>
              </div>
              <div className="p-2 bg-orange-100 rounded-full">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Remaining Budget
                </p>
                <h3 className={`text-2xl font-bold mt-1 ${statusColor}`}>
                  {formatCurrency(variance)}
                </h3>
              </div>
              <div className={`p-2 rounded-full ${isOverBudget ? "bg-red-100" : "bg-green-100"}`}>
                {isOverBudget ? (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">Budget Usage</p>
              <p className="text-sm font-medium">
                {Math.round(percentage)}% {isOverBudget ? "(Over Budget)" : "Used"}
              </p>
            </div>
            <Progress value={Math.min(percentage, 100)} className={progressColor} />
          </div>
        </CardContent>
      </Card>

      {/* Budget vs. Actual Chart */}
      {chartData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget vs. Actual Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end"
                    height={70}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, ""]}
                    labelFormatter={(value) => `Category: ${value}`}
                  />
                  <Legend />
                  <Bar dataKey="budget" name="Budget" fill="#3b82f6" />
                  <Bar dataKey="actual" name="Actual Spending" fill="#f59e0b">
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.actual > entry.budget ? "#ef4444" : "#10b981"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <h3 className="mt-4 text-lg font-medium">No Budget Data</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You haven't set up any budget items for this period yet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Budget Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Budget Allocations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {budgetItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Budget Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetItems.map((item: Budget) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {getCategoryName(item.categoryId)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {item.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No budget items found for this period.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}