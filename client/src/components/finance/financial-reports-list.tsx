import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Download, BarChart2, TrendingUp, Loader2 } from "lucide-react";
import DateRangePicker from "@/components/finance/date-range-picker";
import { DateRange } from "@/types/date-range";
import { subMonths, format, startOfYear, endOfYear } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// IRS rates
const UTAH_INCOME_TAX = 0.0455;
const SE_TAX_RATE = 0.153;
const SE_INCOME_FACTOR = 0.9235;
const SE_DEDUCTION_FACTOR = 0.5; // half of SE tax is deductible

// ── PDF Generators ─────────────────────────────────────────────────────────────

function generatePLPdf(
  income: any[],
  expenses: any[],
  assets: any[],
  from: Date,
  to: Date,
) {
  const doc = new jsPDF();
  const periodLabel = `${format(from, "MM/dd/yyyy")} – ${format(to, "MM/dd/yyyy")}`;
  const isFullYear = from.getMonth() === 0 && from.getDate() === 1 &&
    to.getMonth() === 11 && to.getDate() === 31;
  const taxYear = from.getFullYear();

  // ── Title ──
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Apollo DroneWorks, LLC", 14, 20);
  doc.setFontSize(13);
  doc.text("Profit & Loss Statement", 14, 28);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Period: ${periodLabel}`, 14, 35);
  doc.text(`Generated: ${format(new Date(), "MM/dd/yyyy")}`, 14, 41);
  doc.setTextColor(0);

  // ── Income section ──
  const totalIncome = income.reduce((s, r) => s + parseFloat(r.amount || 0), 0);

  autoTable(doc, {
    startY: 50,
    head: [["GROSS INCOME", "Amount"]],
    body: [
      ...income.map(r => [
        `${r.description || "Service revenue"}${r.client ? ` — ${r.client}` : ""}`,
        fmt(parseFloat(r.amount || 0)),
      ]),
      [{ content: "Total Gross Income", styles: { fontStyle: "bold" } }, { content: fmt(totalIncome), styles: { fontStyle: "bold", textColor: [0, 120, 0] } }],
    ],
    theme: "striped",
    headStyles: { fillColor: [30, 60, 100], textColor: 255, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right", cellWidth: 45 } },
  });

  // ── Expenses section ──
  const totalExpenses = expenses.reduce((s, r) => s + parseFloat(r.amount || 0), 0);

  // Annual depreciation from active assets (prorated for partial year)
  const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  const yearFraction = days / 365;
  const totalAnnualDepr = assets
    .filter((a: any) => a.isActive)
    .reduce((s: number, a: any) => s + a.annualDepreciation * yearFraction, 0);

  const expenseRows = expenses.map(r => [
    r.description || r.vendor || "Expense",
    r.date ? format(new Date(r.date), "MM/dd/yy") : "",
    fmt(parseFloat(r.amount || 0)),
  ]);

  if (totalAnnualDepr > 0) {
    expenseRows.push([`Depreciation (${days}d)`, "", fmt(totalAnnualDepr)]);
  }
  expenseRows.push([
    { content: "Total Expenses", styles: { fontStyle: "bold" } as any },
    "",
    { content: fmt(totalExpenses + totalAnnualDepr), styles: { fontStyle: "bold", textColor: [180, 0, 0] } as any },
  ]);

  const tableEnd = (doc as any).lastAutoTable.finalY + 6;

  autoTable(doc, {
    startY: tableEnd,
    head: [["EXPENSES", "Date", "Amount"]],
    body: expenseRows,
    theme: "striped",
    headStyles: { fillColor: [30, 60, 100], textColor: 255, fontStyle: "bold" },
    columnStyles: { 2: { halign: "right", cellWidth: 45 } },
  });

  // ── Net profit + tax estimate ──
  const netProfit = totalIncome - totalExpenses - totalAnnualDepr;

  // SE tax (Schedule C single-member LLC)
  const seBase = netProfit * SE_INCOME_FACTOR;
  const seTax = Math.max(0, seBase * SE_TAX_RATE);
  const seDeduction = seTax * SE_DEDUCTION_FACTOR;
  const adjustedIncome = netProfit - seDeduction;
  const utahTax = Math.max(0, adjustedIncome * UTAH_INCOME_TAX);
  const totalTaxEstimate = seTax + utahTax;

  const summaryY = (doc as any).lastAutoTable.finalY + 10;

  autoTable(doc, {
    startY: summaryY,
    head: [["SUMMARY", ""]],
    body: [
      ["Gross Income", fmt(totalIncome)],
      ["Total Expenses", fmt(totalExpenses + totalAnnualDepr)],
      [{ content: "Net Profit", styles: { fontStyle: "bold" } }, { content: fmt(netProfit), styles: { fontStyle: "bold", textColor: netProfit >= 0 ? [0, 120, 0] : [180, 0, 0] } }],
      ["", ""],
      ["Self-Employment Tax (15.3% × 92.35%)", fmt(seTax)],
      ["SE Tax Deduction (half)", `(${fmt(seDeduction)})`],
      ["Utah Income Tax (4.55%)", fmt(utahTax)],
      [{ content: "Estimated Total Tax", styles: { fontStyle: "bold" } }, { content: fmt(totalTaxEstimate), styles: { fontStyle: "bold", textColor: [180, 0, 0] } }],
      [{ content: "Net After Tax", styles: { fontStyle: "bold" } }, { content: fmt(netProfit - totalTaxEstimate), styles: { fontStyle: "bold" } }],
    ],
    theme: "plain",
    headStyles: { fillColor: [30, 60, 100], textColor: 255, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right", cellWidth: 55 } },
  });

  doc.setFontSize(8);
  doc.setTextColor(130);
  const disclaimer = isFullYear
    ? "Schedule C (Form 1040) — Single-Member LLC. Depreciation computed per asset depreciation method. SE tax estimated at 15.3% × 92.35% of net profit. Utah flat income tax at 4.55%. Consult your CPA before filing."
    : "Estimates only. Annualized SE and Utah income tax shown for full-year period. Consult your CPA.";
  const splitLines = doc.splitTextToSize(disclaimer, 180);
  doc.text(splitLines, 14, (doc as any).lastAutoTable.finalY + 8);

  doc.save(`ApolloDeW_PL_${format(from, "yyyy-MM")}_to_${format(to, "yyyy-MM")}.pdf`);
}

function generateDepreciationPdf(assets: any[]) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Apollo DroneWorks, LLC", 14, 20);
  doc.setFontSize(13);
  doc.text("Asset Depreciation Schedule", 14, 28);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), "MM/dd/yyyy")}`, 14, 35);
  doc.setTextColor(0);

  const active = assets.filter((a: any) => a.isActive);

  let startY = 45;
  for (const asset of active) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${asset.name} (${asset.type})`, 14, startY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `Purchased ${asset.purchaseDate?.slice(0, 10)} · ${asset.depreciationMethod} · ` +
      `Cost: ${fmt(asset.purchasePrice)} · Salvage: ${fmt(asset.salvageValue)} · ` +
      `Book Value Today: ${fmt(asset.currentBookValue)}`,
      14, startY + 5
    );
    doc.setTextColor(0);

    autoTable(doc, {
      startY: startY + 8,
      head: [["Year", "Opening Value", "Annual Depr.", "Accumulated", "Closing Value"]],
      body: (asset.schedule || []).map((row: any) => [
        String(row.year),
        fmt(row.bookValue),
        fmt(row.annualDepreciation),
        fmt(row.accumulatedDepreciation),
        fmt(row.remainingValue),
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 60, 100], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });

    startY = (doc as any).lastAutoTable.finalY + 12;
    if (startY > 240) {
      doc.addPage();
      startY = 20;
    }
  }

  // Summary
  const totalCost = active.reduce((s: number, a: any) => s + a.purchasePrice, 0);
  const totalBookValue = active.reduce((s: number, a: any) => s + a.currentBookValue, 0);
  const totalDeprToDate = active.reduce((s: number, a: any) => s + a.totalDepreciationToDate, 0);
  const totalAnnual = active.reduce((s: number, a: any) => s + a.annualDepreciation, 0);
  const totalMonthly = active.reduce((s: number, a: any) => s + a.monthlyDepreciation, 0);

  autoTable(doc, {
    startY: startY,
    head: [["TOTALS", ""]],
    body: [
      ["Total Original Cost", fmt(totalCost)],
      ["Total Depreciation to Date", fmt(totalDeprToDate)],
      ["Total Current Book Value", fmt(totalBookValue)],
      ["Annual Depreciation (this year)", fmt(totalAnnual)],
      ["Monthly Depreciation", fmt(totalMonthly)],
    ],
    theme: "plain",
    headStyles: { fillColor: [30, 60, 100], textColor: 255, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right", cellWidth: 55 } },
  });

  doc.save(`ApolloDeW_Depreciation_${format(new Date(), "yyyy")}.pdf`);
}

// ── Report Cards ───────────────────────────────────────────────────────────────
const REPORT_TYPES = [
  {
    id: "pl",
    title: "Profit & Loss Statement",
    description: "Gross income, all expenses, depreciation, net profit, and tax estimate. Schedule C–ready.",
    icon: TrendingUp,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    id: "depreciation",
    title: "Asset Depreciation Schedule",
    description: "Full year-by-year depreciation table for each business asset. IRS Form 4562 support.",
    icon: BarChart2,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
];

// ── Main Component ─────────────────────────────────────────────────────────────
const FinancialReportsList = () => {
  const defaultRange: DateRange = {
    from: startOfYear(new Date()),
    to: endOfYear(new Date()),
  };
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange);
  const [generating, setGenerating] = useState<string | null>(null);

  const year = dateRange.from?.getFullYear() ?? new Date().getFullYear();

  const { data: income = [] } = useQuery<any[]>({
    queryKey: ["/api/income", { startDate: dateRange.from?.toISOString().split("T")[0], endDate: dateRange.to?.toISOString().split("T")[0] }],
  });
  const { data: expenses = [] } = useQuery<any[]>({
    queryKey: ["/api/expenses", { startDate: dateRange.from?.toISOString().split("T")[0], endDate: dateRange.to?.toISOString().split("T")[0] }],
  });
  const { data: assets = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/assets"],
  });

  const totalIncome = income.reduce((s: number, r: any) => s + parseFloat(r.amount || 0), 0);
  const totalExpenses = expenses.reduce((s: number, r: any) => s + parseFloat(r.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;

  async function generate(type: string) {
    setGenerating(type);
    try {
      if (type === "pl") {
        generatePLPdf(income, expenses, assets, dateRange.from!, dateRange.to!);
      } else if (type === "depreciation") {
        generateDepreciationPdf(assets);
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Date range + quick stats */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-0.5">Financial Reports</h2>
          <p className="text-sm text-muted-foreground">Select a period and download a formatted PDF report.</p>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Period:</Label>
          <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Live summary for selected period */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Income</p>
            <p className="text-xl font-bold text-green-600">{fmt(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Expenses</p>
            <p className="text-xl font-bold text-red-600">{fmt(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
            <p className={`text-xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(netProfit)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Report type cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_TYPES.map(rt => {
          const Icon = rt.icon;
          const isLoading = generating === rt.id;
          return (
            <Card key={rt.id} className="border">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${rt.bg}`}>
                    <Icon className={`h-5 w-5 ${rt.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{rt.title}</CardTitle>
                    <CardDescription className="text-sm mt-0.5">{rt.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {rt.id === "pl" && (
                  <div className="text-xs text-muted-foreground mb-3 grid grid-cols-2 gap-2">
                    <div>Period: {dateRange.from ? format(dateRange.from, "MMM d, yyyy") : "—"} – {dateRange.to ? format(dateRange.to, "MMM d, yyyy") : "—"}</div>
                    <div>{income.length} income entries · {expenses.length} expense entries</div>
                  </div>
                )}
                {rt.id === "depreciation" && (
                  <div className="text-xs text-muted-foreground mb-3">
                    {(assets as any[]).filter((a: any) => a.isActive).length} active assets tracked
                  </div>
                )}
                <Button
                  onClick={() => generate(rt.id)}
                  disabled={isLoading}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download PDF
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Reports pull live data from Income and Expenses tabs. P&L includes estimated SE tax (15.3%) and Utah income tax (4.55%).
        Depreciation amounts are calculated from the Asset Registry. Consult a CPA before filing.
      </p>
    </div>
  );
};

export default FinancialReportsList;
