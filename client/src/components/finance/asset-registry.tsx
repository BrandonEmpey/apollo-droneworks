import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Pencil, Trash2, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────
interface DepreciationRow {
  year: number;
  bookValue: number;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  remainingValue: number;
}

interface Asset {
  id: number;
  name: string;
  type: string;
  description: string | null;
  serialNumber: string | null;
  purchasePrice: number;
  purchaseDate: string;
  salvageValue: number;
  usefulLifeYears: number;
  expectedReplacementDate: string | null;
  depreciationMethod: string;
  vehicleMileageMethod: string | null;
  totalMilesAtPurchase: number | null;
  currentMiles: number | null;
  monthlyInsuranceCost: number;
  isActive: boolean;
  notes: string | null;
  currentBookValue: number;
  totalDepreciationToDate: number;
  annualDepreciation: number;
  monthlyDepreciation: number;
  yearsInService: number;
  schedule: DepreciationRow[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  drone: "Drone",
  vehicle: "Vehicle",
  equipment: "Equipment",
  software: "Software",
  other: "Other",
};

const METHOD_LABELS: Record<string, string> = {
  "straight-line": "Straight-Line",
  "macrs-5": "MACRS 5-Year",
  "section-179": "Section 179",
};

const TYPE_COLORS: Record<string, string> = {
  drone: "bg-blue-500/20 text-blue-300",
  vehicle: "bg-green-500/20 text-green-300",
  equipment: "bg-orange-500/20 text-orange-300",
  software: "bg-purple-500/20 text-purple-300",
  other: "bg-gray-500/20 text-gray-300",
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// ── Empty form state ───────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: "",
  type: "other",
  description: "",
  serialNumber: "",
  purchasePrice: "",
  purchaseDate: "",
  salvageValue: "",
  usefulLifeYears: "5",
  expectedReplacementDate: "",
  depreciationMethod: "straight-line",
  vehicleMileageMethod: "",
  totalMilesAtPurchase: "",
  currentMiles: "",
  monthlyInsuranceCost: "",
  isActive: true,
  notes: "",
};

function assetToForm(a: Asset) {
  return {
    name: a.name,
    type: a.type,
    description: a.description ?? "",
    serialNumber: a.serialNumber ?? "",
    purchasePrice: String(a.purchasePrice),
    purchaseDate: a.purchaseDate?.slice(0, 10) ?? "",
    salvageValue: String(a.salvageValue),
    usefulLifeYears: String(a.usefulLifeYears),
    expectedReplacementDate: a.expectedReplacementDate?.slice(0, 10) ?? "",
    depreciationMethod: a.depreciationMethod,
    vehicleMileageMethod: a.vehicleMileageMethod ?? "",
    totalMilesAtPurchase: a.totalMilesAtPurchase != null ? String(a.totalMilesAtPurchase) : "",
    currentMiles: a.currentMiles != null ? String(a.currentMiles) : "",
    monthlyInsuranceCost: String(a.monthlyInsuranceCost),
    isActive: a.isActive,
    notes: a.notes ?? "",
  };
}

// ── Asset Form Modal ───────────────────────────────────────────────────────────
function AssetModal({
  open, onClose, editAsset,
}: {
  open: boolean;
  onClose: () => void;
  editAsset: Asset | null;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(() => editAsset ? assetToForm(editAsset) : EMPTY_FORM);

  // Reset form when editAsset changes
  const effectiveForm = editAsset ? form : form;

  function setField(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const mutation = useMutation({
    mutationFn: (data: any) =>
      editAsset
        ? apiRequest("PUT", `/api/admin/assets/${editAsset.id}`, data)
        : apiRequest("POST", "/api/admin/assets", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/assets"] });
      toast({ title: editAsset ? "Asset updated" : "Asset created" });
      onClose();
    },
    onError: () => toast({ title: "Failed to save asset", variant: "destructive" }),
  });

  function handleSubmit() {
    if (!form.name || !form.purchasePrice || !form.purchaseDate) {
      toast({ title: "Name, purchase price, and purchase date are required", variant: "destructive" });
      return;
    }
    mutation.mutate(form);
  }

  const isVehicle = form.type === "vehicle";

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#0d1b2e] border border-gold-dark/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gold-gradient font-montserrat text-xl">
            {editAsset ? "Edit Asset" : "New Asset"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/70 text-xs mb-1 block">Asset Name *</Label>
              <Input value={form.name} onChange={e => setField("name", e.target.value)}
                placeholder="e.g. DJI Matrice 4E"
                className="bg-[#132642] border-gold-dark/30 text-white" />
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1 block">Type</Label>
              <Select value={form.type} onValueChange={v => setField("type", v)}>
                <SelectTrigger className="bg-[#132642] border-gold-dark/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#132642] border-gold-dark/30 text-white">
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Purchase info */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-white/70 text-xs mb-1 block">Purchase Price *</Label>
              <Input value={form.purchasePrice} onChange={e => setField("purchasePrice", e.target.value)}
                type="number" min="0" step="0.01" placeholder="0.00"
                className="bg-[#132642] border-gold-dark/30 text-white" />
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1 block">Purchase Date *</Label>
              <Input value={form.purchaseDate} onChange={e => setField("purchaseDate", e.target.value)}
                type="date" className="bg-[#132642] border-gold-dark/30 text-white" />
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1 block">Salvage Value</Label>
              <Input value={form.salvageValue} onChange={e => setField("salvageValue", e.target.value)}
                type="number" min="0" step="0.01" placeholder="0.00"
                className="bg-[#132642] border-gold-dark/30 text-white" />
            </div>
          </div>

          {/* Depreciation */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-white/70 text-xs mb-1 block">Method</Label>
              <Select value={form.depreciationMethod} onValueChange={v => setField("depreciationMethod", v)}>
                <SelectTrigger className="bg-[#132642] border-gold-dark/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#132642] border-gold-dark/30 text-white">
                  <SelectItem value="straight-line">Straight-Line</SelectItem>
                  <SelectItem value="macrs-5">MACRS 5-Year</SelectItem>
                  <SelectItem value="section-179">Section 179</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1 block">Useful Life (years)</Label>
              <Input value={form.usefulLifeYears} onChange={e => setField("usefulLifeYears", e.target.value)}
                type="number" min="1" max="30"
                className="bg-[#132642] border-gold-dark/30 text-white" />
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1 block">Expected Replacement</Label>
              <Input value={form.expectedReplacementDate}
                onChange={e => setField("expectedReplacementDate", e.target.value)}
                type="date" className="bg-[#132642] border-gold-dark/30 text-white" />
            </div>
          </div>

          {/* Vehicle fields */}
          {isVehicle && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-[#0a1628] rounded-lg border border-white/10">
              <div>
                <Label className="text-white/70 text-xs mb-1 block">Mileage Method</Label>
                <Select value={form.vehicleMileageMethod} onValueChange={v => setField("vehicleMileageMethod", v)}>
                  <SelectTrigger className="bg-[#132642] border-gold-dark/30 text-white">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#132642] border-gold-dark/30 text-white">
                    <SelectItem value="standard">Standard Rate ($0.70/mi)</SelectItem>
                    <SelectItem value="actual">Actual Expenses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70 text-xs mb-1 block">Miles at Purchase</Label>
                <Input value={form.totalMilesAtPurchase}
                  onChange={e => setField("totalMilesAtPurchase", e.target.value)}
                  type="number" min="0" placeholder="0"
                  className="bg-[#132642] border-gold-dark/30 text-white" />
              </div>
              <div>
                <Label className="text-white/70 text-xs mb-1 block">Current Miles</Label>
                <Input value={form.currentMiles} onChange={e => setField("currentMiles", e.target.value)}
                  type="number" min="0" placeholder="0"
                  className="bg-[#132642] border-gold-dark/30 text-white" />
              </div>
            </div>
          )}

          {/* Insurance + Serial */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/70 text-xs mb-1 block">Monthly Insurance ($)</Label>
              <Input value={form.monthlyInsuranceCost}
                onChange={e => setField("monthlyInsuranceCost", e.target.value)}
                type="number" min="0" step="0.01" placeholder="0.00"
                className="bg-[#132642] border-gold-dark/30 text-white" />
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1 block">Serial Number</Label>
              <Input value={form.serialNumber} onChange={e => setField("serialNumber", e.target.value)}
                placeholder="Optional"
                className="bg-[#132642] border-gold-dark/30 text-white" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-white/70 text-xs mb-1 block">Notes</Label>
            <Textarea value={form.notes} onChange={e => setField("notes", e.target.value)}
              rows={2} className="bg-[#132642] border-gold-dark/30 text-white resize-none" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-white/60 hover:text-white">Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}
            className="bg-gold hover:bg-gold-light text-black">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {editAsset ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Depreciation Schedule Expander ─────────────────────────────────────────────
function DepreciationSchedule({ asset }: { asset: Asset }) {
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 mt-1"
      >
        <TrendingDown className="h-3 w-3" />
        Schedule
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 border-b border-white/10">
                <th className="text-left pb-1">Year</th>
                <th className="text-right pb-1">Depr.</th>
                <th className="text-right pb-1">Book Value</th>
              </tr>
            </thead>
            <tbody>
              {asset.schedule.map(row => (
                <tr key={row.year}
                  className={`border-b border-white/5 ${row.year === currentYear ? "text-gold" : "text-white/60"}`}>
                  <td className="py-0.5">{row.year}{row.year === currentYear ? " ←" : ""}</td>
                  <td className="text-right py-0.5">{fmt(row.annualDepreciation)}</td>
                  <td className="text-right py-0.5">{fmt(row.remainingValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AssetRegistry() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ["/api/admin/assets"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/assets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/assets"] });
      toast({ title: "Asset deleted" });
    },
    onError: () => toast({ title: "Failed to delete asset", variant: "destructive" }),
  });

  function openCreate() {
    setEditAsset(null);
    setModalOpen(true);
  }

  function openEdit(a: Asset) {
    setEditAsset(a);
    setModalOpen(true);
  }

  const activeAssets = assets.filter(a => a.isActive);
  const inactiveAssets = assets.filter(a => !a.isActive);

  const totalCurrentValue = activeAssets.reduce((s, a) => s + a.currentBookValue, 0);
  const totalMonthlyDepr = activeAssets.reduce((s, a) => s + a.monthlyDepreciation, 0);
  const totalMonthlyInsurance = activeAssets.reduce((s, a) => s + a.monthlyInsuranceCost, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#0d1b2e] border-gold-dark/25">
          <CardContent className="p-4">
            <p className="text-white/50 text-xs mb-1">Total Book Value</p>
            <p className="text-2xl font-bold text-gold">{fmt(totalCurrentValue)}</p>
            <p className="text-white/30 text-xs mt-1">{activeAssets.length} active asset{activeAssets.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0d1b2e] border-gold-dark/25">
          <CardContent className="p-4">
            <p className="text-white/50 text-xs mb-1">Monthly Depreciation</p>
            <p className="text-2xl font-bold text-white">{fmt(totalMonthlyDepr)}</p>
            <p className="text-white/30 text-xs mt-1">{fmt(totalMonthlyDepr * 12)}/year</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0d1b2e] border-gold-dark/25">
          <CardContent className="p-4">
            <p className="text-white/50 text-xs mb-1">Monthly Insurance</p>
            <p className="text-2xl font-bold text-white">{fmt(totalMonthlyInsurance)}</p>
            <p className="text-white/30 text-xs mt-1">Overhead: {fmt((totalMonthlyDepr + totalMonthlyInsurance) * 12)}/yr</p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Business Assets</h3>
        <Button onClick={openCreate} className="bg-gold hover:bg-gold-light text-black">
          <Plus className="h-4 w-4 mr-2" />
          Add Asset
        </Button>
      </div>

      {/* Active assets table */}
      {activeAssets.length === 0 ? (
        <div className="text-center py-10 text-white/30 border border-dashed border-white/10 rounded-xl">
          No assets yet. Add your first asset above.
        </div>
      ) : (
        <div className="rounded-xl border border-gold-dark/20 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gold-dark/20 hover:bg-transparent">
                <TableHead className="text-white/50">Asset</TableHead>
                <TableHead className="text-white/50">Purchase</TableHead>
                <TableHead className="text-white/50 text-right">Book Value</TableHead>
                <TableHead className="text-white/50 text-right">Depr/Mo</TableHead>
                <TableHead className="text-white/50 text-right">Ins/Mo</TableHead>
                <TableHead className="text-white/50"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeAssets.map(a => (
                <TableRow key={a.id} className="border-white/5 hover:bg-white/5">
                  <TableCell>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-white">{a.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${TYPE_COLORS[a.type] ?? TYPE_COLORS.other}`}>
                        {TYPE_LABELS[a.type] ?? a.type}
                      </span>
                    </div>
                    <div className="text-xs text-white/40">
                      {METHOD_LABELS[a.depreciationMethod]} · {a.yearsInService}yr in service
                    </div>
                    {a.type === "vehicle" && a.currentMiles && (
                      <div className="text-xs text-white/30">{a.currentMiles.toLocaleString()} miles</div>
                    )}
                    <DepreciationSchedule asset={a} />
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-white/70">{fmt(a.purchasePrice)}</div>
                    <div className="text-xs text-white/40">{a.purchaseDate?.slice(0, 10)}</div>
                    {a.expectedReplacementDate && (
                      <div className="text-xs text-white/30">Replace {a.expectedReplacementDate.slice(0, 7)}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm font-medium text-white">{fmt(a.currentBookValue)}</div>
                    <div className="text-xs text-white/30">{fmt(a.totalDepreciationToDate)} depr.</div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-white/70">
                    {fmt(a.monthlyDepreciation)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-white/70">
                    {a.monthlyInsuranceCost > 0 ? fmt(a.monthlyInsuranceCost) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost"
                        onClick={() => openEdit(a)}
                        className="h-7 w-7 p-0 text-white/40 hover:text-white">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete "${a.name}"?`)) deleteMutation.mutate(a.id);
                        }}
                        className="h-7 w-7 p-0 text-white/40 hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Inactive assets */}
      {inactiveAssets.length > 0 && (
        <div>
          <h4 className="text-sm text-white/40 mb-3">Retired / Inactive ({inactiveAssets.length})</h4>
          <div className="rounded-xl border border-white/10 overflow-hidden opacity-50">
            <Table>
              <TableBody>
                {inactiveAssets.map(a => (
                  <TableRow key={a.id} className="border-white/5">
                    <TableCell className="text-white/50">{a.name}</TableCell>
                    <TableCell className="text-white/30 text-xs">{TYPE_LABELS[a.type]}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(a)}
                        className="h-7 text-xs text-white/30 hover:text-white">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <AssetModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditAsset(null); }}
        editAsset={editAsset}
      />
    </div>
  );
}
