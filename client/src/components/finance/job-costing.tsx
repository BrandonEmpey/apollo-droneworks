import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, Wrench, Shield, DollarSign } from "lucide-react";

// IRS SE rates (single-member LLC, Schedule C)
const SE_RATE = 0.153;
const SE_INCOME_FACTOR = 0.9235;
const SE_DEDUCTION = 0.5; // deductible half
const UTAH_RATE = 0.0455;

interface AssetSummary {
  totalMonthlyDepreciation: number;
  totalMonthlyInsurance: number;
  totalMonthlyOverhead: number;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function JobCosting() {
  const [jobsPerMonth, setJobsPerMonth] = useState(8);
  const [selectedDroneType, setSelectedDroneType] = useState("any");
  const [revenueInput, setRevenueInput] = useState("800");

  const { data: assetSummary, isLoading } = useQuery<AssetSummary>({
    queryKey: ["/api/admin/assets/summary/job-costing"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const revenue = parseFloat(revenueInput) || 0;
  const monthlyDepr = assetSummary?.totalMonthlyDepreciation ?? 0;
  const monthlyIns = assetSummary?.totalMonthlyInsurance ?? 0;
  const monthlyOverhead = monthlyDepr + monthlyIns;

  // Per-job allocation
  const jobs = Math.max(1, jobsPerMonth);
  const deprPerJob = monthlyDepr / jobs;
  const insPerJob = monthlyIns / jobs;
  const overheadPerJob = deprPerJob + insPerJob;

  // Tax math (Schedule C, estimated annual → per-job fraction)
  const estimatedAnnualRevenue = revenue * jobs * 12;
  const estimatedAnnualOverhead = overheadPerJob * jobs * 12;
  const estimatedNetProfit = estimatedAnnualRevenue - estimatedAnnualOverhead;

  // Per-job tax allocation
  const netProfitPerJob = revenue - overheadPerJob;
  const seBase = Math.max(0, netProfitPerJob) * SE_INCOME_FACTOR;
  const seTaxPerJob = seBase * SE_RATE;
  const seDeductionPerJob = seTaxPerJob * SE_DEDUCTION;
  const utahTaxPerJob = Math.max(0, netProfitPerJob - seDeductionPerJob) * UTAH_RATE;
  const totalTaxPerJob = seTaxPerJob + utahTaxPerJob;

  const trueNetPerJob = netProfitPerJob - totalTaxPerJob;

  const pctOf = (n: number) => revenue > 0 ? pct(n / revenue) : "—";

  const breakdown = [
    { label: "Gross Revenue", value: revenue, color: "text-green-600", bold: true },
    { label: "Asset Depreciation (÷ jobs/mo)", value: -deprPerJob, color: "text-red-500" },
    { label: "Insurance Allocation (÷ jobs/mo)", value: -insPerJob, color: "text-red-500" },
    { label: "Net Before Tax", value: netProfitPerJob, color: netProfitPerJob >= 0 ? "text-green-600" : "text-red-600", bold: true },
    { label: "Self-Employment Tax (est.)", value: -seTaxPerJob, color: "text-orange-500" },
    { label: "Utah Income Tax (est.)", value: -utahTaxPerJob, color: "text-orange-500" },
    { label: "True Net Profit", value: trueNetPerJob, color: trueNetPerJob >= 0 ? "text-green-600" : "text-red-600", bold: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Job Costing</h2>
        <p className="text-sm text-muted-foreground">
          See exactly what each job actually earns after depreciation, insurance, and estimated taxes.
        </p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm">Revenue Per Job ($)</Label>
          <Input
            type="number"
            min="0"
            step="50"
            value={revenueInput}
            onChange={e => setRevenueInput(e.target.value)}
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Jobs Per Month</Label>
          <Input
            type="number"
            min="1"
            max="50"
            value={jobsPerMonth}
            onChange={e => setJobsPerMonth(parseInt(e.target.value) || 1)}
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Primary Equipment</Label>
          <Select value={selectedDroneType} onValueChange={setSelectedDroneType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">All Assets (full overhead)</SelectItem>
              <SelectItem value="drone">Drones Only</SelectItem>
              <SelectItem value="vehicle">Vehicle Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Breakdown card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Per-Job Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {breakdown.map((row, i) => (
                <div key={i} className={`flex justify-between items-center py-1 ${i === breakdown.length - 1 ? "border-t pt-2 mt-1" : ""}`}>
                  <span className={`text-sm ${row.bold ? "font-semibold" : "text-muted-foreground"}`}>
                    {row.label}
                  </span>
                  <div className="text-right">
                    <span className={`font-mono text-sm font-medium ${row.color}`}>
                      {fmt(Math.abs(row.value))}
                      {row.value < 0 ? " cost" : ""}
                    </span>
                    {revenue > 0 && row.label !== "Gross Revenue" && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {pctOf(Math.abs(row.value))}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly summary */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Wrench className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Asset Overhead / Month</p>
                  <p className="text-xl font-bold">{fmt(monthlyOverhead)}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div className="flex justify-between">
                  <span>Depreciation</span>
                  <span>{fmt(monthlyDepr)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Insurance</span>
                  <span>{fmt(monthlyIns)}</span>
                </div>
                <div className="flex justify-between font-medium text-foreground border-t pt-1 mt-1">
                  <span>Per job @ {jobs} jobs/mo</span>
                  <span>{fmt(overheadPerJob)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Shield className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estimated Tax / Job</p>
                  <p className="text-xl font-bold">{fmt(totalTaxPerJob)}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div className="flex justify-between">
                  <span>SE Tax (15.3% × 92.35%)</span>
                  <span>{fmt(seTaxPerJob)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Utah Income (4.55%)</span>
                  <span>{fmt(utahTaxPerJob)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${trueNetPerJob >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                  <TrendingUp className={`h-4 w-4 ${trueNetPerJob >= 0 ? "text-green-500" : "text-red-500"}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">True Net / Job</p>
                  <p className={`text-xl font-bold ${trueNetPerJob >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmt(trueNetPerJob)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pctOf(Math.max(0, trueNetPerJob))} margin · {fmt(trueNetPerJob * jobs)} /mo · {fmt(trueNetPerJob * jobs * 12)} /yr
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Depreciation and insurance pulled live from Asset Registry. Tax estimates use SE tax (15.3% × 92.35%)
        and Utah flat income tax (4.55%) with SE deduction. Overhead is divided equally across jobs per month.
        Consult your CPA for actual tax obligations.
      </p>
    </div>
  );
}
