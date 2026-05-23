import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "@/types/date-range";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import DateRangePicker from "./date-range-picker";
import { format, getYear, startOfYear, endOfYear, addDays, subDays } from "date-fns";
import {
  CircleDollarSign,
  FileText,
  Calculator,
  Loader2,
  Check,
  Info,
  Receipt,
  FileCheck,
  Download,
  AlertTriangle,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileSpreadsheet, Files, FileDown } from "lucide-react";

// Define Apollo colors
const APOLLO_GOLD = [181, 137, 61]; // RGB
const APOLLO_DARK_BLUE = [11, 17, 31]; // RGB

// Tax quarters
const getQuarters = (year: number) => [
  {
    id: 1,
    label: `Q1 ${year}`,
    dateRange: {
      from: new Date(year, 0, 1),
      to: new Date(year, 2, 31),
    },
    dueDate: new Date(year, 3, 15),
  },
  {
    id: 2,
    label: `Q2 ${year}`,
    dateRange: {
      from: new Date(year, 3, 1),
      to: new Date(year, 5, 30),
    },
    dueDate: new Date(year, 6, 15),
  },
  {
    id: 3,
    label: `Q3 ${year}`,
    dateRange: {
      from: new Date(year, 6, 1),
      to: new Date(year, 8, 30),
    },
    dueDate: new Date(year, 9, 15),
  },
  {
    id: 4,
    label: `Q4 ${year}`,
    dateRange: {
      from: new Date(year, 9, 1),
      to: new Date(year, 11, 31),
    },
    dueDate: new Date(year + 1, 3, 15),
  },
];

// Format helpers
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatDate = (date: Date) => {
  return format(date, "MMM dd, yyyy");
};

// PostgreSQL `numeric` columns return amounts as strings (e.g. "349.00").
// Coerce to a number safely so arithmetic doesn't accidentally do string concatenation.
const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
};

// Escape a value for safe inclusion in CSV (RFC 4180).
const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

// Trigger a browser download for a Blob.
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function TaxCalculation() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState(getYear(new Date()).toString());
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    from: startOfYear(new Date()),
    to: new Date(),
  });
  const [activeTab, setActiveTab] = useState("quarters");
  const [isExporting, setIsExporting] = useState(false);

  // Generate year options from 2020 to current year
  const currentYear = getYear(new Date());
  const yearOptions = Array.from(
    { length: currentYear - 2019 },
    (_, i) => (currentYear - i).toString()
  );

  // Fetch expenses
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["/api/expenses"],
  });

  // Fetch income
  const { data: income = [], isLoading: incomeLoading } = useQuery({
    queryKey: ["/api/income"],
  });

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/expense-categories"],
  });

  // Get category name by ID
  const getCategoryName = (categoryId: number) => {
    const category = categories.find((cat: any) => cat.id === categoryId);
    return category ? category.name : "Unknown";
  };

  // Filter data by date range
  const filterByDateRange = (data: any[], dateRange: { from: Date; to: Date }) => {
    return data.filter((item) => {
      const itemDate = new Date(item.date);
      return (
        dateRange.from &&
        dateRange.to &&
        itemDate >= dateRange.from &&
        itemDate <= dateRange.to
      );
    });
  };

  // Calculate quarterly data
  const calculateQuarterlyData = () => {
    const quarters = getQuarters(parseInt(selectedYear));
    
    return quarters.map((quarter) => {
      const quarterExpenses = filterByDateRange(expenses, quarter.dateRange);
      const quarterIncome = filterByDateRange(income, quarter.dateRange);
      
      const deductibleExpenses = quarterExpenses.filter(
        (expense: any) => expense.isDeductible
      );
      
      const totalExpenses = quarterExpenses.reduce(
        (sum: number, expense: any) => sum + toNumber(expense.amount),
        0
      );
      
      const totalDeductible = deductibleExpenses.reduce(
        (sum: number, expense: any) => sum + toNumber(expense.amount),
        0
      );
      
      const totalIncome = quarterIncome.reduce(
        (sum: number, item: any) => sum + toNumber(item.amount),
        0
      );
      
      const taxableIncome = totalIncome - totalDeductible;
      
      // Simple estimated tax calculation (for demonstration)
      // In a real app, this would involve proper tax brackets and rates
      const estimatedTax = Math.max(0, taxableIncome * 0.15);
      
      return {
        ...quarter,
        totalExpenses,
        totalDeductible,
        totalIncome,
        taxableIncome,
        estimatedTax,
        quarterExpenses,
        deductibleExpenses,
        quarterIncome,
        daysUntilDue: Math.max(
          0,
          Math.ceil(
            (quarter.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
        ),
      };
    });
  };

  // Calculate annual summary
  const calculateAnnualSummary = () => {
    const yearStart = new Date(parseInt(selectedYear), 0, 1);
    const yearEnd = new Date(parseInt(selectedYear), 11, 31);
    
    const yearExpenses = filterByDateRange(expenses, {
      from: yearStart,
      to: yearEnd,
    });
    
    const yearIncome = filterByDateRange(income, {
      from: yearStart,
      to: yearEnd,
    });
    
    const deductibleExpenses = yearExpenses.filter(
      (expense: any) => expense.isDeductible
    );
    
    const expensesByCategory = yearExpenses.reduce(
      (acc: { [key: string]: number }, expense: any) => {
        const categoryName = getCategoryName(expense.categoryId);
        if (!acc[categoryName]) acc[categoryName] = 0;
        acc[categoryName] += toNumber(expense.amount);
        return acc;
      },
      {}
    );
    
    const deductibleByCategory = deductibleExpenses.reduce(
      (acc: { [key: string]: number }, expense: any) => {
        const categoryName = getCategoryName(expense.categoryId);
        if (!acc[categoryName]) acc[categoryName] = 0;
        acc[categoryName] += toNumber(expense.amount);
        return acc;
      },
      {}
    );
    
    const totalExpenses = yearExpenses.reduce(
      (sum: number, expense: any) => sum + toNumber(expense.amount),
      0
    );
    
    const totalDeductible = deductibleExpenses.reduce(
      (sum: number, expense: any) => sum + toNumber(expense.amount),
      0
    );
    
    const totalIncome = yearIncome.reduce(
      (sum: number, item: any) => sum + toNumber(item.amount),
      0
    );
    
    const taxableIncome = totalIncome - totalDeductible;
    
    // Simple estimated tax calculation (for demonstration)
    const estimatedTax = Math.max(0, taxableIncome * 0.15);
    
    return {
      totalExpenses,
      totalDeductible,
      totalIncome,
      taxableIncome,
      estimatedTax,
      expensesByCategory,
      deductibleByCategory,
      yearExpenses,
      deductibleExpenses,
      yearIncome,
    };
  };

  // Calculate custom period data
  const calculateCustomPeriodData = () => {
    if (!customDateRange.from || !customDateRange.to) return null;
    
    const periodExpenses = filterByDateRange(expenses, customDateRange);
    const periodIncome = filterByDateRange(income, customDateRange);
    
    const deductibleExpenses = periodExpenses.filter(
      (expense: any) => expense.isDeductible
    );
    
    const expensesByCategory = periodExpenses.reduce(
      (acc: { [key: string]: number }, expense: any) => {
        const categoryName = getCategoryName(expense.categoryId);
        if (!acc[categoryName]) acc[categoryName] = 0;
        acc[categoryName] += toNumber(expense.amount);
        return acc;
      },
      {}
    );
    
    const deductibleByCategory = deductibleExpenses.reduce(
      (acc: { [key: string]: number }, expense: any) => {
        const categoryName = getCategoryName(expense.categoryId);
        if (!acc[categoryName]) acc[categoryName] = 0;
        acc[categoryName] += toNumber(expense.amount);
        return acc;
      },
      {}
    );
    
    const totalExpenses = periodExpenses.reduce(
      (sum: number, expense: any) => sum + toNumber(expense.amount),
      0
    );
    
    const totalDeductible = deductibleExpenses.reduce(
      (sum: number, expense: any) => sum + toNumber(expense.amount),
      0
    );
    
    const totalIncome = periodIncome.reduce(
      (sum: number, item: any) => sum + toNumber(item.amount),
      0
    );
    
    const taxableIncome = totalIncome - totalDeductible;
    
    // Simple estimated tax calculation (for demonstration)
    const estimatedTax = Math.max(0, taxableIncome * 0.15);
    
    return {
      totalExpenses,
      totalDeductible,
      totalIncome,
      taxableIncome,
      estimatedTax,
      expensesByCategory,
      deductibleByCategory,
      periodExpenses,
      deductibleExpenses,
      periodIncome,
    };
  };

  // Generate tax summary PDF
  const exportTaxReport = (period: string, data: any) => {
    try {
      setIsExporting(true);
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.setTextColor(APOLLO_DARK_BLUE[0], APOLLO_DARK_BLUE[1], APOLLO_DARK_BLUE[2]);
      doc.text("Apollo DroneWorks Tax Summary", 105, 20, { align: "center" });
      
      // Add period
      doc.setFontSize(12);
      doc.text(period, 105, 30, { align: "center" });
      
      // Add generation date
      doc.setFontSize(10);
      doc.text(`Generated on: ${formatDate(new Date())}`, 105, 40, { align: "center" });
      
      let yPosition = 50;
      
      // Add summary section
      doc.setFontSize(14);
      doc.setTextColor(APOLLO_GOLD[0], APOLLO_GOLD[1], APOLLO_GOLD[2]);
      doc.text("Tax Summary", 14, yPosition);
      
      yPosition += 10;
      
      // Summary table
      autoTable(doc, {
        startY: yPosition,
        body: [
          ["Total Income", formatCurrency(data.totalIncome)],
          ["Total Expenses", formatCurrency(data.totalExpenses)],
          ["Tax Deductible Expenses", formatCurrency(data.totalDeductible)],
          ["Taxable Income", formatCurrency(data.taxableIncome)],
          ["Estimated Tax (15%)", formatCurrency(data.estimatedTax)],
        ],
        theme: "plain",
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
        columnStyles: {
          0: {
            fontStyle: "bold",
            cellWidth: 120,
          },
          1: {
            halign: "right",
            cellWidth: 70,
          },
        },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
      
      // Add deductible expenses by category
      doc.setFontSize(14);
      doc.setTextColor(APOLLO_GOLD[0], APOLLO_GOLD[1], APOLLO_GOLD[2]);
      doc.text("Deductible Expenses by Category", 14, yPosition);
      
      yPosition += 10;
      
      const deductibleCategories = Object.entries(data.deductibleByCategory || {}).map(
        ([category, amount]) => [category, formatCurrency(amount as number)]
      );
      
      if (deductibleCategories.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [["Category", "Amount"]],
          body: deductibleCategories,
          theme: "striped",
          headStyles: {
            fillColor: [APOLLO_DARK_BLUE[0], APOLLO_DARK_BLUE[1], APOLLO_DARK_BLUE[2]],
            textColor: [255, 255, 255],
          },
          styles: {
            fontSize: 9,
          },
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 15;
      } else {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("No deductible expenses found in this period.", 14, yPosition);
        yPosition += 15;
      }
      
      // Add deductible expenses list
      if (data.deductibleExpenses && data.deductibleExpenses.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(APOLLO_GOLD[0], APOLLO_GOLD[1], APOLLO_GOLD[2]);
        doc.text("Deductible Expense Details", 14, yPosition);
        
        yPosition += 10;
        
        const deductibleExpensesData = data.deductibleExpenses.map((expense: any) => [
          formatDate(new Date(expense.date)),
          getCategoryName(expense.categoryId),
          expense.description || "-",
          expense.vendor || "-",
          formatCurrency(expense.amount),
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [["Date", "Category", "Description", "Vendor", "Amount"]],
          body: deductibleExpensesData,
          theme: "striped",
          headStyles: {
            fillColor: [APOLLO_DARK_BLUE[0], APOLLO_DARK_BLUE[1], APOLLO_DARK_BLUE[2]],
            textColor: [255, 255, 255],
          },
          styles: {
            fontSize: 8,
          },
          footStyles: {
            fillColor: [APOLLO_DARK_BLUE[0], APOLLO_DARK_BLUE[1], APOLLO_DARK_BLUE[2]],
            textColor: [255, 255, 255],
          },
          foot: [
            [
              "Total",
              "",
              "",
              "",
              formatCurrency(data.totalDeductible),
            ],
          ],
        });
      }
      
      // Add income list
      if (data.periodIncome && data.periodIncome.length > 0) {
        // Add a new page if necessary
        if (doc.internal.getCurrentPageInfo().pageNumber === 1 && (doc as any).lastAutoTable.finalY > 200) {
          doc.addPage();
          yPosition = 20;
        } else {
          yPosition = (doc as any).lastAutoTable.finalY + 15;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(APOLLO_GOLD[0], APOLLO_GOLD[1], APOLLO_GOLD[2]);
        doc.text("Income Details", 14, yPosition);
        
        yPosition += 10;
        
        const incomeData = data.periodIncome.map((item: any) => [
          formatDate(new Date(item.date)),
          item.source || "-",
          item.description || "-",
          formatCurrency(item.amount),
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [["Date", "Source", "Description", "Amount"]],
          body: incomeData,
          theme: "striped",
          headStyles: {
            fillColor: [APOLLO_DARK_BLUE[0], APOLLO_DARK_BLUE[1], APOLLO_DARK_BLUE[2]],
            textColor: [255, 255, 255],
          },
          styles: {
            fontSize: 8,
          },
          footStyles: {
            fillColor: [APOLLO_DARK_BLUE[0], APOLLO_DARK_BLUE[1], APOLLO_DARK_BLUE[2]],
            textColor: [255, 255, 255],
          },
          foot: [["Total", "", "", formatCurrency(data.totalIncome)]],
        });
      }
      
      // Add disclaimer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        "DISCLAIMER: This is an automated estimate and should not be used for official tax filing purposes. Please consult with a qualified tax professional.",
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
      
      // Save PDF
      const fileName = `apollo-tax-summary-${period.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "Tax Report Generated",
        description: `Your tax report has been successfully exported as a PDF.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "There was an error generating your tax report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Build a normalized list of expenses (any expense, not just deductible) for a period.
  const getPeriodExpenseRows = (data: any): any[] => {
    return (
      data.quarterExpenses ||
      data.yearExpenses ||
      data.periodExpenses ||
      data.deductibleExpenses ||
      []
    );
  };

  // Export an expense report as CSV for the given period.
  const exportExpenseCsv = (period: string, data: any) => {
    try {
      setIsExporting(true);
      const rows = getPeriodExpenseRows(data);

      const header = [
        "Date",
        "Category",
        "Vendor",
        "Description",
        "Amount",
        "Payment Method",
        "Tax Deductible",
        "Receipt URL",
        "Notes",
      ];

      const body = rows.map((expense: any) => [
        format(new Date(expense.date), "yyyy-MM-dd"),
        getCategoryName(expense.categoryId),
        expense.vendor || "",
        expense.description || "",
        toNumber(expense.amount).toFixed(2),
        expense.paymentMethod || "",
        expense.isDeductible ? "Yes" : "No",
        expense.receiptUrl ? `${window.location.origin}${expense.receiptUrl}` : "",
        expense.notes || "",
      ]);

      const totalAmount = rows.reduce(
        (sum: number, e: any) => sum + toNumber(e.amount),
        0
      );
      const totalDeductible = rows
        .filter((e: any) => e.isDeductible)
        .reduce((sum: number, e: any) => sum + toNumber(e.amount), 0);

      const summaryLines = [
        [`Apollo DroneWorks Expense Report`],
        [`Period`, period],
        [`Generated`, format(new Date(), "yyyy-MM-dd HH:mm")],
        [`Total Expenses`, totalAmount.toFixed(2)],
        [`Total Deductible`, totalDeductible.toFixed(2)],
        [],
      ];

      const csv = [
        ...summaryLines.map((row) => row.map(csvCell).join(",")),
        header.map(csvCell).join(","),
        ...body.map((row) => row.map(csvCell).join(",")),
        [
          "",
          "",
          "",
          "TOTAL",
          totalAmount.toFixed(2),
          "",
          "",
          "",
          "",
        ]
          .map(csvCell)
          .join(","),
      ].join("\r\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const fileName = `apollo-expenses-${period.toLowerCase().replace(/\s+/g, "-")}.csv`;
      downloadBlob(blob, fileName);

      toast({
        title: "CSV Exported",
        description: `${rows.length} expense ${rows.length === 1 ? "row" : "rows"} exported.`,
      });
    } catch (error) {
      console.error("CSV export error:", error);
      toast({
        title: "Export Failed",
        description: "There was an error generating your CSV report.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Bundle every receipt for the period into a single ZIP archive.
  const exportReceiptsBundle = async (period: string, data: any) => {
    try {
      setIsExporting(true);
      const rows = getPeriodExpenseRows(data);
      const withReceipts = rows.filter(
        (e: any) => typeof e.receiptUrl === "string" && e.receiptUrl.length > 0
      );

      if (withReceipts.length === 0) {
        toast({
          title: "No Receipts to Download",
          description: `No expenses in ${period} have an attached receipt.`,
        });
        return;
      }

      const zip = new JSZip();
      const manifest: string[] = [
        "filename,date,vendor,description,amount,category,deductible",
      ];

      let success = 0;
      let failed = 0;

      for (const expense of withReceipts) {
        const url: string = expense.receiptUrl;
        try {
          const res = await fetch(url, { credentials: "include" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          // Derive a safe, descriptive filename: <date>-<vendor>-<id>.<ext>
          const ext = (url.split(".").pop() || "bin").split("?")[0];
          const datePart = format(new Date(expense.date), "yyyy-MM-dd");
          const vendorPart = (expense.vendor || "expense")
            .toString()
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 40)
            .toLowerCase() || "expense";
          const filename = `${datePart}_${vendorPart}_id-${expense.id}.${ext}`;
          zip.file(`receipts/${filename}`, blob);
          manifest.push(
            [
              filename,
              datePart,
              expense.vendor || "",
              expense.description || "",
              toNumber(expense.amount).toFixed(2),
              getCategoryName(expense.categoryId),
              expense.isDeductible ? "Yes" : "No",
            ]
              .map(csvCell)
              .join(",")
          );
          success++;
        } catch (err) {
          console.warn(`Failed to fetch receipt for expense ${expense.id}:`, err);
          failed++;
        }
      }

      zip.file("manifest.csv", manifest.join("\r\n"));

      const blob = await zip.generateAsync({ type: "blob" });
      const fileName = `apollo-receipts-${period.toLowerCase().replace(/\s+/g, "-")}.zip`;
      downloadBlob(blob, fileName);

      toast({
        title: "Receipts Bundled",
        description:
          failed > 0
            ? `Packaged ${success} receipt${success === 1 ? "" : "s"} into a ZIP. ${failed} failed to download.`
            : `Packaged ${success} receipt${success === 1 ? "" : "s"} into a ZIP.`,
        variant: failed > 0 ? "destructive" : "default",
      });
    } catch (error) {
      console.error("Receipts export error:", error);
      toast({
        title: "Export Failed",
        description: "There was an error bundling your receipts.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Reusable export menu rendered next to each period's title.
  const ExportMenu = ({ period, data }: { period: string; data: any }) => {
    const rows = getPeriodExpenseRows(data);
    const receiptCount = rows.filter(
      (e: any) => typeof e.receiptUrl === "string" && e.receiptUrl.length > 0
    ).length;
    const hasAnyData = rows.length > 0 || (data?.totalIncome || 0) > 0;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            disabled={isExporting || !hasAnyData}
            title="Download options"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>{period}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => exportTaxReport(period, data)}>
            <FileText className="h-4 w-4 mr-2" />
            Tax Summary (PDF)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => exportExpenseCsv(period, data)}
            disabled={rows.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Expense Report (CSV)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => exportReceiptsBundle(period, data)}
            disabled={receiptCount === 0}
          >
            <Files className="h-4 w-4 mr-2" />
            All Receipts (ZIP)
            <span className="ml-auto text-xs text-muted-foreground">
              {receiptCount}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Determine if loading
  const isLoading = expensesLoading || incomeLoading || categoriesLoading;

  // Calculate data based on the active tab
  const quarterlyData = calculateQuarterlyData();
  const annualSummary = calculateAnnualSummary();
  const customPeriodData = calculateCustomPeriodData();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Tax Calculation Helper</CardTitle>
          <CardDescription>
            Track tax-deductible expenses and estimate tax liabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <TabsList>
                <TabsTrigger value="quarters">Quarterly</TabsTrigger>
                <TabsTrigger value="annual">Annual</TabsTrigger>
                <TabsTrigger value="custom">Custom Period</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                <Select
                  value={selectedYear}
                  onValueChange={setSelectedYear}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Info className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">About Tax Calculations</h4>
                      <p className="text-sm text-muted-foreground">
                        This tool provides simple tax estimates based on your income and deductible expenses. For U.S. taxes, the quarterly due dates are typically:
                      </p>
                      <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                        <li>Q1: April 15</li>
                        <li>Q2: June 15</li>
                        <li>Q3: September 15</li>
                        <li>Q4: January 15 (following year)</li>
                      </ul>
                      <p className="text-sm text-muted-foreground pt-2">
                        Always consult with a qualified tax professional for proper tax advice.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin opacity-70" />
              </div>
            ) : (
              <>
                <TabsContent value="quarters" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quarterlyData.map((quarter) => (
                      <Card key={quarter.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">
                              {quarter.label}
                            </CardTitle>
                            <ExportMenu period={quarter.label} data={quarter} />
                          </div>
                          <CardDescription>
                            {formatDate(quarter.dateRange.from)} to{" "}
                            {formatDate(quarter.dateRange.to)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <Table>
                              <TableBody>
                                <TableRow>
                                  <TableCell className="font-medium">Income</TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(quarter.totalIncome)}
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">
                                    Total Expenses
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(quarter.totalExpenses)}
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">
                                    Deductible Expenses
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(quarter.totalDeductible)}
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">
                                    Taxable Income
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(quarter.taxableIncome)}
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">
                                    Estimated Tax (15%)
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(quarter.estimatedTax)}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                            
                            <div className="pt-2 border-t flex items-center justify-between">
                              <div className="flex items-center">
                                <FileCheck className="h-5 w-5 mr-2 text-muted-foreground" />
                                <span className="text-sm">
                                  Due: {formatDate(quarter.dueDate)}
                                </span>
                              </div>
                              
                              {quarter.daysUntilDue > 0 ? (
                                <div className="text-sm text-amber-500 flex items-center">
                                  <AlertTriangle className="h-4 w-4 mr-1" />
                                  {quarter.daysUntilDue} days left
                                </div>
                              ) : (
                                <div className="text-sm text-green-500 flex items-center">
                                  <Check className="h-4 w-4 mr-1" />
                                  Filed
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="annual" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">
                          Annual Tax Summary ({selectedYear})
                        </CardTitle>
                        <ExportMenu
                          period={`Annual ${selectedYear}`}
                          data={annualSummary}
                        />
                      </div>
                      <CardDescription>
                        January 1 to December 31, {selectedYear}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-blue-900">
                                Total Income
                              </p>
                              <h3 className="text-xl font-bold mt-1 text-blue-700">
                                {formatCurrency(annualSummary.totalIncome)}
                              </h3>
                            </div>
                            <div className="p-2 bg-blue-100 rounded-full">
                              <CircleDollarSign className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-emerald-50 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-emerald-900">
                                Tax Deductible
                              </p>
                              <h3 className="text-xl font-bold mt-1 text-emerald-700">
                                {formatCurrency(annualSummary.totalDeductible)}
                              </h3>
                            </div>
                            <div className="p-2 bg-emerald-100 rounded-full">
                              <Receipt className="h-5 w-5 text-emerald-600" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-amber-50 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-amber-900">
                                Estimated Tax
                              </p>
                              <h3 className="text-xl font-bold mt-1 text-amber-700">
                                {formatCurrency(annualSummary.estimatedTax)}
                              </h3>
                            </div>
                            <div className="p-2 bg-amber-100 rounded-full">
                              <Calculator className="h-5 w-5 text-amber-600" />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium">Tax Calculation Breakdown</h3>
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">Total Income</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(annualSummary.totalIncome)}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">
                                Total Expenses
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(annualSummary.totalExpenses)}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">
                                Tax Deductible Expenses
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(annualSummary.totalDeductible)}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">
                                Taxable Income
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(annualSummary.taxableIncome)}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">
                                Estimated Tax (15%)
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(annualSummary.estimatedTax)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                      
                      <div className="mt-6">
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="deductibles">
                            <AccordionTrigger>
                              Tax Deductible Expenses by Category
                            </AccordionTrigger>
                            <AccordionContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Object.entries(annualSummary.deductibleByCategory || {}).map(
                                    ([category, amount]) => (
                                      <TableRow key={category}>
                                        <TableCell>{category}</TableCell>
                                        <TableCell className="text-right">
                                          {formatCurrency(amount as number)}
                                        </TableCell>
                                      </TableRow>
                                    )
                                  )}
                                </TableBody>
                              </Table>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="custom" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">
                          Custom Period Tax Summary
                        </CardTitle>
                        {customPeriodData ? (
                          <ExportMenu
                            period={`Custom Period ${formatDate(
                              customDateRange.from!
                            )} to ${formatDate(customDateRange.to!)}`}
                            data={customPeriodData}
                          />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            disabled
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <CardDescription>
                        Select a custom date range to calculate taxes
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="max-w-md">
                          <label className="text-sm font-medium mb-1 block">
                            Date Range
                          </label>
                          <DateRangePicker
                            dateRange={customDateRange}
                            onChange={setCustomDateRange}
                          />
                        </div>
                        
                        {customPeriodData ? (
                          <div className="space-y-6 mt-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-blue-50 rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-sm font-medium text-blue-900">
                                      Total Income
                                    </p>
                                    <h3 className="text-xl font-bold mt-1 text-blue-700">
                                      {formatCurrency(customPeriodData.totalIncome)}
                                    </h3>
                                  </div>
                                  <div className="p-2 bg-blue-100 rounded-full">
                                    <CircleDollarSign className="h-5 w-5 text-blue-600" />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-emerald-50 rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-sm font-medium text-emerald-900">
                                      Tax Deductible
                                    </p>
                                    <h3 className="text-xl font-bold mt-1 text-emerald-700">
                                      {formatCurrency(customPeriodData.totalDeductible)}
                                    </h3>
                                  </div>
                                  <div className="p-2 bg-emerald-100 rounded-full">
                                    <Receipt className="h-5 w-5 text-emerald-600" />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-amber-50 rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-sm font-medium text-amber-900">
                                      Estimated Tax
                                    </p>
                                    <h3 className="text-xl font-bold mt-1 text-amber-700">
                                      {formatCurrency(customPeriodData.estimatedTax)}
                                    </h3>
                                  </div>
                                  <div className="p-2 bg-amber-100 rounded-full">
                                    <Calculator className="h-5 w-5 text-amber-600" />
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <h3 className="text-sm font-medium">Tax Calculation Breakdown</h3>
                              <Table>
                                <TableBody>
                                  <TableRow>
                                    <TableCell className="font-medium">Total Income</TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(customPeriodData.totalIncome)}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell className="font-medium">
                                      Total Expenses
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(customPeriodData.totalExpenses)}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell className="font-medium">
                                      Tax Deductible Expenses
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(customPeriodData.totalDeductible)}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell className="font-medium">
                                      Taxable Income
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(customPeriodData.taxableIncome)}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell className="font-medium">
                                      Estimated Tax (15%)
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(customPeriodData.estimatedTax)}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                            
                            <div className="mt-6">
                              <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="deductibles">
                                  <AccordionTrigger>
                                    Tax Deductible Expenses by Category
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Category</TableHead>
                                          <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {Object.entries(
                                          customPeriodData.deductibleByCategory || {}
                                        ).map(([category, amount]) => (
                                          <TableRow key={category}>
                                            <TableCell>{category}</TableCell>
                                            <TableCell className="text-right">
                                              {formatCurrency(amount as number)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <FileText className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-lg font-medium">No Tax Data</h3>
                            <p className="mt-2 text-sm text-muted-foreground max-w-md">
                              Please select a date range to calculate tax information for
                              that period.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tax Tips for Drone Businesses</CardTitle>
          <CardDescription>
            Important tax information for drone service providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Common Deductible Expenses</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Drone equipment and accessories</li>
                    <li>Camera gear and photography equipment</li>
                    <li>Software subscriptions used for business</li>
                    <li>Insurance (liability and equipment)</li>
                    <li>Travel expenses for client projects</li>
                    <li>Professional training and certifications</li>
                    <li>Website hosting and maintenance</li>
                    <li>Marketing and advertising costs</li>
                    <li>Office space or home office deduction</li>
                    <li>Vehicle expenses for business travel</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Quarterly Estimated Taxes</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">
                    As a self-employed drone operator, you may need to pay quarterly
                    estimated taxes if you expect to owe $1,000 or more in taxes for the
                    year. The due dates are typically:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Q1 (Jan-Mar): April 15th</li>
                    <li>Q2 (Apr-Jun): June 15th</li>
                    <li>Q3 (Jul-Sep): September 15th</li>
                    <li>Q4 (Oct-Dec): January 15th (of the following year)</li>
                  </ul>
                  <p className="mt-2">
                    Estimated tax payments can be made online through the IRS EFTPS
                    system or by mailing Form 1040-ES.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>
                  Equipment Depreciation and Section 179
                </AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">
                    Drone equipment typically qualifies for depreciation over a 5-year
                    period. However, Section 179 of the tax code may allow you to deduct
                    the full purchase price of qualified equipment in the year you buy
                    it, rather than depreciating it over several years.
                  </p>
                  <p className="mb-2">
                    For 2023, the Section 179 deduction limit is $1,050,000, and the
                    spending cap on equipment purchases is $2,620,000.
                  </p>
                  <p>
                    Bonus depreciation is also available at 80% for qualified assets
                    placed in service in 2023 (reducing by 20% each year after).
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>Record Keeping Best Practices</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Keep detailed records of all business income and expenses
                    </li>
                    <li>Maintain digital or physical copies of all receipts</li>
                    <li>
                      Separate business and personal expenses with dedicated accounts
                    </li>
                    <li>
                      Track vehicle mileage for business travel (standard mileage rate
                      or actual expenses)
                    </li>
                    <li>
                      Document client meetings, project locations, and business purpose
                    </li>
                    <li>Keep records for at least 7 years after filing taxes</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
                <AccordionTrigger>Self-Employment Tax Considerations</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">
                    As a self-employed drone operator, you'll need to pay
                    self-employment tax (15.3%) which consists of:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>12.4% Social Security tax on up to $160,200 (2023)</li>
                    <li>2.9% Medicare tax on all net earnings</li>
                  </ul>
                  <p className="mt-2">
                    You can deduct the employer-equivalent portion (half) of your
                    self-employment tax when calculating your adjusted gross income.
                    Consider establishing an S-Corporation or other business structure
                    if your income is substantial, as this may provide tax benefits.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Disclaimer:</strong> This information is provided for general
                guidance only and does not constitute tax, legal, or accounting advice.
                Consult with a qualified tax professional for advice specific to your
                situation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}