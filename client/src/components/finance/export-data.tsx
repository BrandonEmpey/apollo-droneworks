import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "@/types/date-range";
import { subMonths } from "date-fns";
import DateRangePicker from "./date-range-picker";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Loader2, 
  FileCode 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Apollo colors
const APOLLO_GOLD = [181, 137, 61]; // RGB
const APOLLO_DARK_BLUE = [11, 17, 31]; // RGB

type FileFormat = "pdf" | "excel" | "csv";
type ExportType = "income" | "expenses" | "both";

export default function ExportData() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [fileFormat, setFileFormat] = useState<FileFormat>("pdf");
  const [exportType, setExportType] = useState<ExportType>("both");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 3),
    to: new Date(),
  });

  // Fetch expenses
  const { 
    data: expenses = [], 
    isLoading: expensesLoading 
  } = useQuery({
    queryKey: [
      "/api/expenses",
      {
        startDate: dateRange.from?.toISOString().split("T")[0],
        endDate: dateRange.to?.toISOString().split("T")[0],
      },
    ],
  });

  // Fetch income
  const { 
    data: income = [], 
    isLoading: incomeLoading 
  } = useQuery({
    queryKey: [
      "/api/income",
      {
        startDate: dateRange.from?.toISOString().split("T")[0],
        endDate: dateRange.to?.toISOString().split("T")[0],
      },
    ],
  });

  // Fetch categories
  const { 
    data: categories = [], 
    isLoading: categoriesLoading 
  } = useQuery({
    queryKey: ["/api/expense-categories"],
  });

  // Get category name by ID
  const getCategoryName = (categoryId: number) => {
    const category = categories.find((cat: any) => cat.id === categoryId);
    return category ? category.name : "Unknown";
  };

  // Filter data by date range
  const filteredExpenses = expenses && Array.isArray(expenses) ? expenses : [];
  const filteredIncome = income && Array.isArray(income) ? income : [];

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Export as PDF
  const exportAsPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(APOLLO_DARK_BLUE[0], APOLLO_DARK_BLUE[1], APOLLO_DARK_BLUE[2]);
    doc.text("Apollo DroneWorks Financial Report", 105, 20, { align: "center" });
    
    // Add date range
    doc.setFontSize(12);
    const fromDate = dateRange.from ? formatDate(dateRange.from.toISOString()) : "";
    const toDate = dateRange.to ? formatDate(dateRange.to.toISOString()) : "";
    doc.text(`Date Range: ${fromDate} to ${toDate}`, 105, 30, { align: "center" });
    
    // Add generation date
    doc.setFontSize(10);
    doc.text(`Generated on: ${formatDate(new Date().toISOString())}`, 105, 40, { align: "center" });
    
    let yPosition = 50;
    
    // Add income section if needed
    if (exportType === "income" || exportType === "both") {
      yPosition = addIncomeSection(doc, yPosition);
    }
    
    // Add expenses section if needed
    if (exportType === "expenses" || exportType === "both") {
      // If we've already added income and there's not enough space, add a new page
      if (exportType === "both" && yPosition > 180) {
        doc.addPage();
        yPosition = 20;
      }
      
      yPosition = addExpensesSection(doc, yPosition);
    }
    
    // Add footer with page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Apollo DroneWorks Financial Report - Page ${i} of ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }
    
    // Save PDF
    const fileName = `apollo-financial-report-${fromDate}-to-${toDate}.pdf`;
    doc.save(fileName);
  };

  // Helper function to add income section to PDF
  const addIncomeSection = (doc: jsPDF, startY: number) => {
    doc.setFontSize(16);
    doc.setTextColor(APOLLO_GOLD[0], APOLLO_GOLD[1], APOLLO_GOLD[2]);
    doc.text("Income", 14, startY);
    
    startY += 10;
    
    if (filteredIncome.length > 0) {
      const incomeData = filteredIncome.map((item: any) => [
        formatDate(item.date),
        item.description,
        item.client || "-",
        item.status,
        formatCurrency(item.amount),
      ]);
      
      const totalIncome = filteredIncome.reduce(
        (sum: number, item: any) => sum + Number(item.amount),
        0
      );
      
      autoTable(doc, {
        startY,
        head: [["Date", "Description", "Client", "Status", "Amount"]],
        body: incomeData,
        foot: [["Total", "", "", "", formatCurrency(totalIncome)]],
        theme: "striped",
        headStyles: {
          fillColor: [APOLLO_DARK_BLUE[0], APOLLO_DARK_BLUE[1], APOLLO_DARK_BLUE[2]],
          textColor: [255, 255, 255],
        },
        footStyles: {
          fillColor: [APOLLO_DARK_BLUE[0], APOLLO_DARK_BLUE[1], APOLLO_DARK_BLUE[2]],
          textColor: [255, 255, 255],
        },
      });
      
      startY = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("No income data available for the selected period", 14, startY);
      startY += 15;
    }
    
    return startY;
  };

  // Helper function to add expenses section to PDF
  const addExpensesSection = (doc: jsPDF, startY: number) => {
    doc.setFontSize(16);
    doc.setTextColor(APOLLO_GOLD[0], APOLLO_GOLD[1], APOLLO_GOLD[2]);
    doc.text("Expenses", 14, startY);
    
    startY += 10;
    
    if (filteredExpenses.length > 0) {
      const expensesData = filteredExpenses.map((expense: any) => [
        formatDate(expense.date),
        expense.description,
        getCategoryName(expense.categoryId),
        expense.isTaxDeductible ? "Yes" : "No",
        formatCurrency(expense.amount),
      ]);
      
      const totalExpenses = filteredExpenses.reduce(
        (sum: number, expense: any) => sum + Number(expense.amount),
        0
      );
      
      autoTable(doc, {
        startY,
        head: [["Date", "Description", "Category", "Tax Deductible", "Amount"]],
        body: expensesData,
        foot: [["Total", "", "", "", formatCurrency(totalExpenses)]],
        theme: "striped",
        headStyles: {
          fillColor: [APOLLO_DARK_BLUE[0], APOLLO_DARK_BLUE[1], APOLLO_DARK_BLUE[2]],
          textColor: [255, 255, 255],
        },
        footStyles: {
          fillColor: [APOLLO_DARK_BLUE[0], APOLLO_DARK_BLUE[1], APOLLO_DARK_BLUE[2]],
          textColor: [255, 255, 255],
        },
      });
      
      startY = (doc as any).lastAutoTable.finalY + 15;
      
      // Add expenses by category chart
      doc.setFontSize(14);
      doc.setTextColor(APOLLO_GOLD[0], APOLLO_GOLD[1], APOLLO_GOLD[2]);
      doc.text("Expenses by Category", 14, startY);
      
      startY += 10;
      
      // Group expenses by category
      const expensesByCategory: Record<string, number> = {};
      filteredExpenses.forEach((expense: any) => {
        const categoryName = getCategoryName(expense.categoryId);
        if (!expensesByCategory[categoryName]) {
          expensesByCategory[categoryName] = 0;
        }
        expensesByCategory[categoryName] += Number(expense.amount);
      });
      
      const categoryData = Object.entries(expensesByCategory).map(
        ([category, amount]) => [category, formatCurrency(amount)]
      );
      
      autoTable(doc, {
        startY,
        head: [["Category", "Amount"]],
        body: categoryData,
        theme: "striped",
        headStyles: {
          fillColor: [APOLLO_DARK_BLUE[0], APOLLO_DARK_BLUE[1], APOLLO_DARK_BLUE[2]],
          textColor: [255, 255, 255],
        },
      });
      
      startY = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("No expense data available for the selected period", 14, startY);
      startY += 15;
    }
    
    return startY;
  };

  // Export as Excel
  const exportAsExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Add income worksheet if needed
    if (exportType === "income" || exportType === "both") {
      const incomeData = filteredIncome.map((item: any) => ({
        Date: formatDate(item.date),
        Description: item.description,
        Client: item.client || "-",
        Status: item.status,
        "Payment Method": item.paymentMethod,
        Amount: Number(item.amount),
        Notes: item.notes || "",
      }));
      
      const incomeSheet = XLSX.utils.json_to_sheet(incomeData);
      XLSX.utils.book_append_sheet(workbook, incomeSheet, "Income");
    }
    
    // Add expenses worksheet if needed
    if (exportType === "expenses" || exportType === "both") {
      const expensesData = filteredExpenses.map((expense: any) => ({
        Date: formatDate(expense.date),
        Description: expense.description,
        Category: getCategoryName(expense.categoryId),
        "Tax Deductible": expense.isTaxDeductible ? "Yes" : "No",
        "Payment Method": expense.paymentMethod,
        Amount: Number(expense.amount),
        Notes: expense.notes || "",
      }));
      
      const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
      XLSX.utils.book_append_sheet(workbook, expensesSheet, "Expenses");
    }
    
    // Add summary worksheet if both types are included
    if (exportType === "both") {
      const totalIncome = filteredIncome.reduce(
        (sum: number, item: any) => sum + Number(item.amount),
        0
      );
      
      const totalExpenses = filteredExpenses.reduce(
        (sum: number, expense: any) => sum + Number(expense.amount),
        0
      );
      
      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
      
      // Group expenses by category
      const expensesByCategory: Record<string, number> = {};
      filteredExpenses.forEach((expense: any) => {
        const categoryName = getCategoryName(expense.categoryId);
        if (!expensesByCategory[categoryName]) {
          expensesByCategory[categoryName] = 0;
        }
        expensesByCategory[categoryName] += Number(expense.amount);
      });
      
      const categorySummary = Object.entries(expensesByCategory).map(
        ([category, amount]) => ({
          Category: category,
          Amount: amount,
          "Percentage of Total": totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        })
      );
      
      const summaryData = [
        { Metric: "Total Income", Value: totalIncome },
        { Metric: "Total Expenses", Value: totalExpenses },
        { Metric: "Net Profit", Value: netProfit },
        { Metric: "Profit Margin", Value: `${profitMargin.toFixed(2)}%` },
      ];
      
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.sheet_add_aoa(summarySheet, [["Expenses by Category"]], { origin: "A6" });
      XLSX.utils.sheet_add_json(summarySheet, categorySummary, {
        origin: "A7",
        skipHeader: false,
      });
      
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    }
    
    // Format workbook and download
    const fromDate = dateRange.from
      ? dateRange.from.toISOString().split("T")[0]
      : "";
    const toDate = dateRange.to ? dateRange.to.toISOString().split("T")[0] : "";
    const fileName = `apollo-financial-report-${fromDate}-to-${toDate}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
  };

  // Export as CSV
  const exportAsCSV = () => {
    // For CSV, we'll need to handle each type separately
    const fromDate = dateRange.from
      ? dateRange.from.toISOString().split("T")[0]
      : "";
    const toDate = dateRange.to ? dateRange.to.toISOString().split("T")[0] : "";
    
    if (exportType === "income" || exportType === "both") {
      const incomeData = filteredIncome.map((item: any) => ({
        Date: formatDate(item.date),
        Description: item.description,
        Client: item.client || "-",
        Status: item.status,
        "Payment Method": item.paymentMethod,
        Amount: Number(item.amount),
        Notes: item.notes || "",
      }));
      
      const incomeSheet = XLSX.utils.json_to_sheet(incomeData);
      const incomeCsv = XLSX.utils.sheet_to_csv(incomeSheet);
      
      downloadCSV(incomeCsv, `apollo-income-report-${fromDate}-to-${toDate}.csv`);
    }
    
    if (exportType === "expenses" || exportType === "both") {
      const expensesData = filteredExpenses.map((expense: any) => ({
        Date: formatDate(expense.date),
        Description: expense.description,
        Category: getCategoryName(expense.categoryId),
        "Tax Deductible": expense.isTaxDeductible ? "Yes" : "No",
        "Payment Method": expense.paymentMethod,
        Amount: Number(expense.amount),
        Notes: expense.notes || "",
      }));
      
      const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
      const expensesCsv = XLSX.utils.sheet_to_csv(expensesSheet);
      
      downloadCSV(
        expensesCsv,
        `apollo-expenses-report-${fromDate}-to-${toDate}.csv`
      );
    }
  };

  // Helper function to download CSV
  const downloadCSV = (csvContent: string, fileName: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle export button click
  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Execute the appropriate export function based on format
      switch (fileFormat) {
        case "pdf":
          exportAsPDF();
          break;
        case "excel":
          exportAsExcel();
          break;
        case "csv":
          exportAsCSV();
          break;
      }
      
      toast({
        title: "Export complete",
        description: `Financial data has been exported as ${fileFormat.toUpperCase()}.`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "An error occurred during export.",
        variant: "destructive",
      });
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Loading state
  const isLoading = expensesLoading || incomeLoading || categoriesLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Export Financial Data</CardTitle>
        <CardDescription>
          Export your financial records in various formats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="format" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="format">Format Options</TabsTrigger>
            <TabsTrigger value="data">Data Selection</TabsTrigger>
          </TabsList>
          
          <TabsContent value="format" className="space-y-4">
            <div className="grid gap-4 py-4">
              <div>
                <h3 className="text-sm font-medium mb-2">File Format</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      fileFormat === "pdf"
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground"
                    }`}
                    onClick={() => setFileFormat("pdf")}
                  >
                    <div className="flex flex-col items-center text-center">
                      <FileText
                        className={`h-8 w-8 mb-2 ${
                          fileFormat === "pdf" ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <span className="font-medium">PDF Document</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Professional, print-ready format
                      </span>
                    </div>
                  </div>
                  
                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      fileFormat === "excel"
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground"
                    }`}
                    onClick={() => setFileFormat("excel")}
                  >
                    <div className="flex flex-col items-center text-center">
                      <FileSpreadsheet
                        className={`h-8 w-8 mb-2 ${
                          fileFormat === "excel" ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <span className="font-medium">Excel Spreadsheet</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Editable with formulas and multiple sheets
                      </span>
                    </div>
                  </div>
                  
                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      fileFormat === "csv"
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground"
                    }`}
                    onClick={() => setFileFormat("csv")}
                  >
                    <div className="flex flex-col items-center text-center">
                      <FileCode
                        className={`h-8 w-8 mb-2 ${
                          fileFormat === "csv" ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <span className="font-medium">CSV File</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Compatible with all spreadsheet software
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="data" className="space-y-4">
            <div className="grid gap-4 py-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Data to Export</h3>
                <Select
                  value={exportType}
                  onValueChange={(value) => setExportType(value as ExportType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data to export" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Financial Data</SelectLabel>
                      <SelectItem value="both">Income and Expenses</SelectItem>
                      <SelectItem value="income">Income Only</SelectItem>
                      <SelectItem value="expenses">Expenses Only</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Date Range</label>
                <DateRangePicker
                  dateRange={dateRange}
                  onChange={setDateRange}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              {isLoading ? (
                <p className="text-sm text-muted-foreground flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading data...
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {exportType === "both" || exportType === "expenses" 
                    ? `${filteredExpenses.length} expenses` 
                    : ""}
                  {exportType === "both" ? " and " : ""}
                  {exportType === "both" || exportType === "income" 
                    ? `${filteredIncome.length} income transactions` 
                    : ""}
                  {" will be exported"}
                </p>
              )}
            </div>
            <Button
              onClick={handleExport}
              disabled={isLoading || isExporting}
              className="ml-auto"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  Export <Download className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}