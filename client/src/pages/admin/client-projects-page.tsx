import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2, ArrowLeft, Plus, FolderOpen, AlertTriangle, CheckCircle2, Clock,
  Phone, Mail, MapPin,
} from "lucide-react";
import { differenceInDays, format } from "date-fns";

// ── helpers ──────────────────────────────────────────────────────────────────
function urgencyClass(due: string | null) {
  if (!due) return "bg-gold/60";
  const d = differenceInDays(new Date(due), new Date());
  if (d < 0) return "bg-red-500";
  if (d <= 3) return "bg-amber-400";
  return "bg-gold";
}

function urgencyLabel(due: string | null) {
  if (!due) return "No due date";
  const d = differenceInDays(new Date(due), new Date());
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return format(new Date(due), "MMM d");
}

const DRONE_LABELS: Record<string, string> = {
  "matrice-4e": "Matrice 4E",
  "air-3s": "Air 3S",
  "antigravity-a1": "Antigravity A1",
  "other": "Other",
};

// ── New-project mini modal (client pre-filled) ───────────────────────────────
function NewProjectModal({
  open, onClose, clientId, services,
}: {
  open: boolean; onClose: () => void; clientId: number;
  services: Array<{ id: number; name: string }>;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [projectName, setProjectName] = useState("");
  const [droneType, setDroneType] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [address, setAddress] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/projects", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/admin/clients/${clientId}/projects`] });
      qc.invalidateQueries({ queryKey: ["/api/admin/project-dashboard"] });
      toast({ title: "Project created" });
      onClose();
      setProjectName(""); setDroneType(""); setDueDate(""); setSelectedServices([]); setAddress("");
    },
    onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
  });

  function toggleService(id: number) {
    setSelectedServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#0d1b2e] border border-gold-dark/30 text-white max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gold-gradient font-montserrat text-xl">New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-white/70 text-xs mb-1 block">Project Name *</Label>
            <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Smith Roof Inspection" className="bg-[#132642] border-gold-dark/30 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/70 text-xs mb-1 block">Drone</Label>
              <Select value={droneType} onValueChange={setDroneType}>
                <SelectTrigger className="bg-[#132642] border-gold-dark/30 text-white">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent className="bg-[#132642] border-gold-dark/30 text-white">
                  <SelectItem value="matrice-4e">Matrice 4E</SelectItem>
                  <SelectItem value="air-3s">Air 3S</SelectItem>
                  <SelectItem value="antigravity-a1">Antigravity A1</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1 block">Deliverables Due</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-[#132642] border-gold-dark/30 text-white" />
            </div>
          </div>
          <div>
            <Label className="text-white/70 text-xs mb-1 block">Location</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address or area" className="bg-[#132642] border-gold-dark/30 text-white" />
          </div>
          <div>
            <Label className="text-white/70 text-xs mb-2 block">Services</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {services.map(s => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm text-white/80 hover:text-white">
                  <Checkbox checked={selectedServices.includes(s.id)} onCheckedChange={() => toggleService(s.id)}
                    className="border-gold-dark/50 data-[state=checked]:bg-gold data-[state=checked]:border-gold" />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-white/60 hover:text-white">Cancel</Button>
          <Button
            onClick={() => mutation.mutate({ clientId, name: projectName, droneType: droneType || undefined, dueDate: dueDate || undefined, selectedServices, address: address || undefined })}
            disabled={mutation.isPending || !projectName}
            className="bg-gold hover:bg-gold-light text-black"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ClientProjectsPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery<{
    customer: any;
    projects: any[];
  }>({
    queryKey: [`/api/admin/clients/${clientId}/projects`],
    enabled: !!clientId,
  });

  const { data: services = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/services"],
    select: (d: any[]) => d.map(s => ({ id: s.id, name: s.name })),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-gold" />
      </div>
    );
  }

  const customer = data?.customer;
  const projects = data?.projects ?? [];
  const active = projects.filter(p => p.status !== "completed");
  const completed = projects.filter(p => p.status === "completed");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Back */}
      <Link href="/admin/projects">
        <Button variant="ghost" className="text-white/50 hover:text-white mb-6 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      {/* Client header */}
      {customer && (
        <div className="bg-[#0d1b2e] border border-gold-dark/25 rounded-xl p-5 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold font-montserrat text-gold-gradient">{customer.name ?? "Unnamed Client"}</h1>
              {customer.company && <p className="text-white/50 text-sm">{customer.company}</p>}
              <div className="flex gap-5 mt-3">
                {customer.phone && (
                  <span className="flex items-center gap-1.5 text-sm text-white/60">
                    <Phone className="h-3.5 w-3.5" />{customer.phone}
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1.5 text-sm text-white/60">
                    <Mail className="h-3.5 w-3.5" />{customer.email}
                  </span>
                )}
              </div>
            </div>
            <Button onClick={() => setModalOpen(true)} className="bg-gold hover:bg-gold-light text-black">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>
      )}

      {/* Active projects */}
      <h2 className="text-lg font-semibold text-white mb-4">
        Active Projects <span className="text-white/30 font-normal text-base">({active.length})</span>
      </h2>

      {active.length === 0 ? (
        <div className="text-center py-12 text-white/30 border border-dashed border-white/10 rounded-xl mb-8">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No active projects. Create one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {active.map(p => {
            const pct = p.deliverableCount
              ? Math.round((p.completedCount / p.deliverableCount) * 100)
              : 0;
            return (
              <Link key={p.id} href={`/admin/projects/${p.id}`}>
                <Card className="bg-[#0d1b2e] border border-gold-dark/25 hover:border-gold/50 transition-all cursor-pointer group h-full">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white group-hover:text-gold transition-colors leading-snug">{p.name}</h3>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full text-black font-medium ${urgencyClass(p.nearestDueDate)}`}>
                        {urgencyLabel(p.nearestDueDate)}
                      </span>
                    </div>

                    {p.droneType && (
                      <p className="text-xs text-white/40">{DRONE_LABELS[p.droneType] ?? p.droneType}</p>
                    )}

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-white/40">
                        <span>{p.completedCount}/{p.deliverableCount} deliverables</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${urgencyClass(p.nearestDueDate)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Completed projects */}
      {completed.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-white/40 mb-4">
            Completed <span className="font-normal">({completed.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {completed.map(p => (
              <Link key={p.id} href={`/admin/projects/${p.id}`}>
                <Card className="bg-[#080d17] border border-white/10 hover:border-white/25 transition-all cursor-pointer group opacity-60 hover:opacity-90 h-full">
                  <CardContent className="p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-white/70 group-hover:text-white transition-colors">{p.name}</h3>
                      <CheckCircle2 className="h-4 w-4 text-green-500/60 shrink-0" />
                    </div>
                    <p className="text-xs text-white/30">{p.deliverableCount} deliverables · completed</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clientId={parseInt(clientId)}
        services={services}
      />
    </div>
  );
}
