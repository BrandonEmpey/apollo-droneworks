import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import ExpenseForm from "./expense-form";
import DateRangePicker from "./date-range-picker";
import { cn } from "@/lib/utils";
import { DateRange } from "@/types/date-range";
import {
  Copy,
  Download,
  FileSpreadsheet,
  FilePlus,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Search,
  ArrowUpDown,
  FileText,
  SlidersHorizontal,
  Trash2,
  X,
  AlertCircle,
  Tag,
  MonitorSmartphone,
  Calculator,
  Clock,
  Loader2,
  Check,
} from "lucide-react";
import { format as formatDate, subMonths } from "date-fns";

// Type definition for column sorting
type SortDirection = "asc" | "desc" | null;

interface SortState {
  column: string;
  direction: SortDirection;
}

interface ExpensesListProps {
  dateRange?: {
    from: Date | undefined;
    to: Date | undefined;
  };
  onEdit?: (id: number) => void;
}

export default function ExpensesList({ dateRange: externalDateRange, onEdit }: ExpensesListProps = {}) {
  // State for UI controls
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<any | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  const [statusFilters, setStatusFilters] = useState<string[]>(["completed", "pending"]);
  const [categoryFilters, setcategoryFilters] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortState, setSortState] = useState<SortState>({
    column: "date",
    direction: "desc",
  });
  
  // If external dateRange is provided, use it
  useEffect(() => {
    if (externalDateRange?.from && externalDateRange?.to) {
      setDateRange(externalDateRange);
    }
  }, [externalDateRange]);

  // Fetch expenses with date range filtering
  const {
    data: expenses,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "/api/expenses",
      dateRange.from?.toISOString().split("T")[0],
      dateRange.to?.toISOString().split("T")[0],
      statusFilters,
      categoryFilters,
      sortState,
    ],
  });

  // Fetch expense categories for filtering
  const { data: categories } = useQuery({
    queryKey: ["/api/expense-categories"],
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsDeleteConfirmOpen(false);
      setExpenseToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete expense",
        variant: "destructive",
      });
    },
  });

  // Batch delete mutation
  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest("POST", "/api/expenses/batch-delete", { ids });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${selectedRows.length} expenses deleted successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setSelectedRows([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete expenses",
        variant: "destructive",
      });
    },
  });

  // Export expense data
  const exportData = async (formatType: string) => {
    setIsExporting(true);
    try {
      const response = await apiRequest(
        "GET",
        `/api/expenses/export?format=${formatType}&from=${dateRange.from?.toISOString().split("T")[0]}&to=${dateRange.to?.toISOString().split("T")[0]}&statuses=${statusFilters.join(",")}&categories=${categoryFilters.join(",")}`
      );
      
      // For CSV and Excel, trigger file download
      if (formatType === "csv" || formatType === "excel") {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const formattedDate = formatDate(new Date(), "yyyy-MM-dd");
        a.download = `expenses_${formatType === "csv" ? "csv" : "xlsx"}_${formattedDate}`;
        a.click();
        window.URL.revokeObjectURL(url);
      } 
      // For PDF, open in new tab
      else if (formatType === "pdf") {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
        window.URL.revokeObjectURL(url);
      }
      
      toast({
        title: "Export Successful",
        description: `Expenses exported as ${formatType.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || `Failed to export as ${formatType.toUpperCase()}`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Toggle all row selection
  const toggleSelectAll = () => {
    if (Array.isArray(expenses) && expenses.length > 0) {
      if (selectedRows.length === expenses.length) {
        setSelectedRows([]);
      } else {
        setSelectedRows(expenses.map((expense) => expense.id));
      }
    }
  };

  // Toggle single row selection
  const toggleRowSelection = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // Open expense form for editing
  const handleEditExpense = (expense: any) => {
    if (onEdit) {
      // If external edit handler provided, use it
      onEdit(expense.id);
    } else {
      // Otherwise use internal handler
      setCurrentExpense(expense);
      setShowExpenseForm(true);
    }
  };

  // Open expense form for adding
  const handleAddExpense = () => {
    setCurrentExpense(null);
    setShowExpenseForm(true);
  };

  // Open delete confirmation
  const handleDeleteConfirm = (expense: any) => {
    setExpenseToDelete(expense);
    setIsDeleteConfirmOpen(true);
  };

  // Execute delete operation
  const confirmDelete = () => {
    if (expenseToDelete) {
      deleteExpenseMutation.mutate(expenseToDelete.id);
    }
  };

  // Handle batch delete
  const handleBatchDelete = () => {
    if (selectedRows.length > 0) {
      if (window.confirm(`Are you sure you want to delete ${selectedRows.length} expenses?`)) {
        batchDeleteMutation.mutate(selectedRows);
      }
    }
  };

  // Handle sorting change
  const handleSortChange = (column: string) => {
    setSortState((prev) => {
      if (prev.column === column) {
        // Cycle through: asc -> desc -> null -> asc
        const nextDirection: SortDirection = 
          prev.direction === "asc" ? "desc" : 
          prev.direction === "desc" ? null : "asc";
        
        return { 
          column: nextDirection ? column : "date", 
          direction: nextDirection || "desc" 
        };
      }
      return { column, direction: "asc" };
    });
  };

  // Toggle category filter
  const toggleCategoryFilter = (categoryId: number) => {
    setcategoryFilters((current) => {
      if (current.includes(categoryId)) {
        return current.filter((id) => id !== categoryId);
      } else {
        return [...current, categoryId];
      }
    });
  };

  // Toggle status filter
  const toggleStatusFilter = (status: string) => {
    setStatusFilters((current) => {
      if (current.includes(status)) {
        return current.filter((s) => s !== status);
      } else {
        return [...current, status];
      }
    });
  };

  // Filter expenses based on search query
  const filteredExpenses = Array.isArray(expenses)
    ? expenses.filter((expense) => {
        // Only apply search if there's a query
        if (!searchQuery) return true;
        
        // Search across multiple fields
        const searchLower = searchQuery.toLowerCase();
        return (
          (expense.description && expense.description.toLowerCase().includes(searchLower)) ||
          (expense.vendor && expense.vendor.toLowerCase().includes(searchLower)) ||
          (expense.amount && expense.amount.toString().includes(searchLower)) ||
          (expense.category?.name && expense.category.name.toLowerCase().includes(searchLower)) ||
          (expense.notes && expense.notes.toLowerCase().includes(searchLower))
        );
      })
    : [];

  // Calculate totals for selected expenses
  const selectedTotal = Array.isArray(expenses)
    ? expenses
        .filter((expense) => selectedRows.includes(expense.id))
        .reduce((sum, expense) => sum + parseFloat(expense.amount), 0)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header: Title, Search and Add button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold">Expenses</h2>
        
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search expenses..."
              className="pl-8 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                className="absolute right-0 top-0 h-full px-2"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <Button onClick={handleAddExpense} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Add Expense
          </Button>
        </div>
      </div>

      {/* Date filter and actions bar */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          <DateRangePicker
            dateRange={dateRange}
            onChange={setDateRange}
            className="flex-1 min-w-[300px]"
          />
          
          <div className="flex items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "mr-2",
                (categoryFilters.length > 0 || statusFilters.length < 2) && "border-primary text-primary"
              )}
            >
              <Filter className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Sort</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={sortState.column === "date" && !!sortState.direction}
                  onCheckedChange={() => handleSortChange("date")}
                >
                  Date {sortState.column === "date" && (sortState.direction === "asc" ? "↑" : "↓")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={sortState.column === "amount" && !!sortState.direction}
                  onCheckedChange={() => handleSortChange("amount")}
                >
                  Amount {sortState.column === "amount" && (sortState.direction === "asc" ? "↑" : "↓")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={sortState.column === "vendor" && !!sortState.direction}
                  onCheckedChange={() => handleSortChange("vendor")}
                >
                  Vendor {sortState.column === "vendor" && (sortState.direction === "asc" ? "↑" : "↓")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={sortState.column === "category" && !!sortState.direction}
                  onCheckedChange={() => handleSortChange("category")}
                >
                  Category {sortState.column === "category" && (sortState.direction === "asc" ? "↑" : "↓")}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedRows.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={batchDeleteMutation.isPending}
            >
              {batchDeleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Selected ({selectedRows.length})
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportData("csv")}>
                <FileText className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData("excel")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData("pdf")}>
                <FilePlus className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters panel - conditionally displayed */}
      {showFilters && (
        <div className="p-4 border rounded-md bg-card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium">Filters</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Status</h4>
              <div className="flex flex-wrap gap-2">
                {["completed", "pending", "cancelled", "reimbursed", "recurring"].map((status) => (
                  <Badge
                    key={status}
                    variant={statusFilters.includes(status) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleStatusFilter(status)}
                  >
                    {status}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Categories</h4>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(categories) && categories.length > 0
                  ? categories.map((category) => (
                      <Badge
                        key={category.id}
                        variant={categoryFilters.includes(category.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        style={{
                          backgroundColor: categoryFilters.includes(category.id)
                            ? category.color || undefined
                            : undefined,
                        }}
                        onClick={() => toggleCategoryFilter(category.id)}
                      >
                        {category.name}
                      </Badge>
                    ))
                  : <span className="text-sm text-muted-foreground">No categories found</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading and Error states */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <div className="rounded-md bg-destructive/15 p-6 text-center">
          <div className="flex justify-center items-center space-x-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load expenses. Please try again.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Empty state */}
          {filteredExpenses.length === 0 ? (
            <div className="text-center p-12 border rounded-md">
              <div className="mx-auto w-fit rounded-full bg-muted p-3 mb-3">
                <Receipt className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No expenses found</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : "Add your first expense to get started"}
              </p>
              <Button onClick={handleAddExpense}>
                <Plus className="mr-2 h-4 w-4" /> Add Expense
              </Button>
            </div>
          ) : (
            <>
              {/* Expenses table */}
              <div className="relative overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={
                            Array.isArray(expenses) &&
                            expenses.length > 0 &&
                            selectedRows.length === expenses.length
                          }
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead className="w-[100px]">
                        <div className="flex items-center">
                          <span>Date</span>
                          <Button
                            variant="ghost"
                            onClick={() => handleSortChange("date")}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center">
                          <span>Description</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center">
                          <span>Vendor</span>
                          <Button
                            variant="ghost"
                            onClick={() => handleSortChange("vendor")}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center">
                          <span>Category</span>
                          <Button
                            variant="ghost"
                            onClick={() => handleSortChange("category")}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        <div className="flex items-center justify-end">
                          <span>Amount</span>
                          <Button
                            variant="ghost"
                            onClick={() => handleSortChange("amount")}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableHead>
                      <TableHead className="w-[40px]">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.includes(expense.id)}
                            onCheckedChange={() => toggleRowSelection(expense.id)}
                            aria-label={`Select expense ${expense.id}`}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(new Date(expense.date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          <div className="flex items-center">
                            <span className="truncate">{expense.description}</span>
                            
                            {/* Icons for expense properties */}
                            <div className="flex ml-2 gap-1">
                              {expense.receiptUrl && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a 
                                        href={expense.receiptUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-foreground"
                                      >
                                        <Receipt className="h-3.5 w-3.5" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent>Has receipt</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              
                              {expense.isDeductible && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <span className="text-green-600">
                                        <Calculator className="h-3.5 w-3.5" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>Tax deductible</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              
                              {expense.recurringPeriod && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Clock className="h-3.5 w-3.5" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Recurring ({expense.recurringPeriod})
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>
                          
                          {/* Status badge, shown only for non-completed statuses */}
                          {expense.status && expense.status !== "completed" && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "mt-1 capitalize",
                                expense.status === "pending" && "bg-yellow-50 text-yellow-700 border-yellow-200",
                                expense.status === "cancelled" && "bg-red-50 text-red-700 border-red-200",
                                expense.status === "reimbursed" && "bg-green-50 text-green-700 border-green-200",
                                expense.status === "recurring" && "bg-blue-50 text-blue-700 border-blue-200"
                              )}
                            >
                              {expense.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{expense.vendor || "—"}</TableCell>
                        <TableCell>
                          {expense.category ? (
                            <div className="flex items-center gap-1.5">
                              <div 
                                className="w-2.5 h-2.5 rounded-full" 
                                style={{ backgroundColor: expense.category.color || "#6E56CF" }}
                              />
                              <span>{expense.category.name}</span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${parseFloat(expense.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEditExpense(expense)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {expense.receiptUrl && (
                                <DropdownMenuItem asChild>
                                  <a
                                    href={expense.receiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Receipt className="mr-2 h-4 w-4" />
                                    View Receipt
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(expense.amount)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Amount
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteConfirm(expense)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary footer for selected expenses */}
              {selectedRows.length > 0 && (
                <div className="flex justify-between items-center mt-2 text-sm">
                  <span>
                    {selectedRows.length} {selectedRows.length === 1 ? "expense" : "expenses"}{" "}
                    selected
                  </span>
                  <span className="font-medium">
                    Total: ${selectedTotal.toFixed(2)}
                  </span>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Expense delete confirmation dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={deleteExpenseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteExpenseMutation.isPending}
            >
              {deleteExpenseMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense form rendered conditionally */}
      {showExpenseForm && (
        <ExpenseForm 
          onClose={() => setShowExpenseForm(false)} 
          expenseId={currentExpense?.id} 
        />
      )}
    </div>
  );
}