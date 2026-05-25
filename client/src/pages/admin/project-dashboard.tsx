import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2, Plus, Phone, Mail, FolderOpen, AlertTriangle, CheckCircle2, Clock, User,
} from "lucide-react";
import { differenceInDays, format } from "date-fns";

// ── types ────────────────────────────────────────────────────────────────────
interface ProjectSummary {
  id: number;
  name: string;
  status: string;
  droneType: string | null;
  deliverableCount: number;
  completedCount: number;
  nearestDueDate: string | null;
}

interface ClientDashboardEntry {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  nearestDueDate: string | null;
  projects: ProjectSummary[];
}

// ── urgency helpers ──────────────────────────────────────────────────────────
function urgencyClass(due: string | null): string {
  if (!due) return "bg-gold";
  const days = differenceInDays(new Date(due), new Date());
  if (days < 0) return "bg-red-500";
  if (days <= 3) return "bg-amber-400";
  return "bg-gold";
}

function urgencyLabel(due: string | null): string {
  if (!due) return "No due date";
  const days = differenceInDays(new Date(due), new Date());
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due ${format(new Date(due), "MMM d")}`;
}

function UrgencyIcon({ due }: { due: string | null }) {
  if (!due) return <Clock className="h-3.5 w-3.5 text-gold/60" />;
  const days = differenceInDays(new Date(due), new Date());
  if (days < 0) return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />;
  if (days <= 3) return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
  return <CheckCircle2 className="h-3.5 w-3.5 text-gold" />;
}

// ── New-project modal ────────────────────────────────────────────────────────
interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  preselectedClientId?: number;
  clients: ClientDashboardEntry[];
  services: Array<{ id: number; name: string }>;
}

function NewProjectModal({ open, onClose, preselectedClientId, clients, services }: NewProjectModalProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [isNewClient, setIsNewClient] = useState(!preselectedClientId);
  const [clientId, setClientId] = useState<string>(preselectedClientId ? String(preselectedClientId) : "");
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientCompany, setNewClientCompany] = useState("");
  const [projectName, setProjectName] = useState("");
  const [droneType, setDroneType] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [address, setAddress] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/projects", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/project-dashboard"] });
      toast({ title: "Project created" });
      onClose();
      resetForm();
    },
    onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
  });

  function resetForm() {
    setIsNewClient(false); setClientId(""); setNewClientName(""); setNewClientEmail("");
    setNewClientPhone(""); setNewClientCompany(""); setProjectName(""); setDroneType("");
    setDueDate(""); setSelectedServices([]); setAddress("");
  }

  function toggleService(id: number) {
    setSelectedServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }

  function handleSubmit() {
    if (!projectName) return toast({ title: "Project name is required", variant: "destructive" });
    if (isNewClient && !newClientName) return toast({ title: "Client name is required", variant: "destructive" });
    if (!isNewClient && !clientId) return toast({ title: "Select a client", variant: "destructive" });

    mutation.mutate({
      ...(isNewClient
        ? { newClient: { name: newClientName, email: newClientEmail, phone: newClientPhone, company: newClientCompany } }
        : { clientId: parseInt(clientId) }),
      name: projectName,
      droneType: droneType || undefined,
      dueDate: dueDate || undefined,
      selectedServices,
      address: address || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#0d1b2e] border border-gold-dark/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gold-gradient font-montserrat text-xl">New Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Client section */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsNewClient(false)}
                className={`text-sm px-3 py-1.5 rounded border transition-all ${!isNewClient ? "border-gold text-gold bg-gold/10" : "border-white/20 text-white/50 hover:border-white/40"}`}
              >
                Existing client
              </button>
              <button
                onClick={() => setIsNewClient(true)}
                className={`text-sm px-3 py-1.5 rounded border transition-all ${isNewClient ? "border-gold text-gold bg-gold/10" : "border-white/20 text-white/50 hover:border-white/40"}`}
              >
                New client
              </button>
            </div>

            {isNewClient ? (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-white/70 text-xs mb-1 block">Name *</Label>
                  <Input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Full name" className="bg-[#132642] border-gold-dark/30 text-white" /></div>
                <div><Label className="text-white/70 text-xs mb-1 block">Company</Label>
                  <Input value={newClientCompany} onChange={e => setNewClientCompany(e.target.value)} placeholder="Company (optional)" className="bg-[#132642] border-gold-dark/30 text-white" /></div>
                <div><Label className="text-white/70 text-xs mb-1 block">Email</Label>
                  <Input type="email" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="email@example.com" className="bg-[#132642] border-gold-dark/30 text-white" /></div>
                <div><Label className="text-white/70 text-xs mb-1 block">Phone</Label>
                  <Input value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="(435) 000-0000" className="bg-[#132642] border-gold-dark/30 text-white" /></div>
              </div>
            ) : (
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="bg-[#132642] border-gold-dark/30 text-white">
                  <SelectValue placeholder="Select a client…" />
                </SelectTrigger>
                <SelectContent className="bg-[#132642] border-gold-dark/30 text-white">
                  {clients.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name ?? "Unnamed"}{c.company ? ` — ${c.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Project details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-white/70 text-xs mb-1 block">Project Name *</Label>
              <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Smith Property Aerial Shoot" className="bg-[#132642] border-gold-dark/30 text-white" />
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1 block">Drone</Label>
              <Select value={droneType} onValueChange={setDroneType}>
                <SelectTrigger className="bg-[#132642] border-gold-dark/30 text-white">
                  <SelectValue placeholder="Select drone…" />
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
            <div className="col-span-2">
              <Label className="text-white/70 text-xs mb-1 block">Location</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Project address or area" className="bg-[#132642] border-gold-dark/30 text-white" />
            </div>
          </div>

          {/* Services */}
          <div>
            <Label className="text-white/70 text-xs mb-2 block">Services (auto-populates deliverables)</Label>
            <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
              {services.map(s => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm text-white/80 hover:text-white">
                  <Checkbox
                    checked={selectedServices.includes(s.id)}
                    onCheckedChange={() => toggleService(s.id)}
                    className="border-gold-dark/50 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-white/60 hover:text-white">Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending} className="bg-gold hover:bg-gold-light text-black">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function ProjectDashboard() {
  const [modalOpen, setModalOpen] = useState(false);

  const { data: clients = [], isLoading } = useQuery<ClientDashboardEntry[]>({
    queryKey: ["/api/admin/project-dashboard"],
  });

  const { data: services = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/services"],
    select: (data: any[]) => data.map(s => ({ id: s.id, name: s.name })),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-montserrat text-gold-gradient">Project Dashboard</h1>
          <p className="text-white/50 text-sm mt-1">Sorted by nearest deliverable due date</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-gold hover:bg-gold-light text-black">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Client tiles grid */}
      {clients.length === 0 ? (
        <div className="text-center py-24 text-white/40">
          <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No projects yet.</p>
          <p className="text-sm mt-1">Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {clients.map(client => {
            const activeProjects = client.projects.filter(p => p.status !== "completed");
            const completedCount = client.projects.filter(p => p.status === "completed").length;

            return (
              <Link key={client.id} href={`/admin/clients/${client.id}`}>
                <Card className="bg-[#0d1b2e] border border-gold-dark/25 hover:border-gold/50 transition-all cursor-pointer group h-full">
                  <CardHeader className="pb-3">
                    {/* Client info */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-gold/10 rounded-full p-2">
                          <User className="h-4 w-4 text-gold" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-gold transition-colors">
                            {client.name ?? "Unnamed Client"}
                          </h3>
                          {client.company && <p className="text-xs text-white/40">{client.company}</p>}
                        </div>
                      </div>
                      {client.nearestDueDate && (
                        <span className={`text-xs px-2 py-0.5 rounded-full text-black font-medium ${urgencyClass(client.nearestDueDate)}`}>
                          {urgencyLabel(client.nearestDueDate)}
                        </span>
                      )}
                    </div>

                    {/* Contact */}
                    <div className="flex flex-col gap-0.5 mt-2">
                      {client.phone && (
                        <span className="flex items-center gap-1.5 text-xs text-white/50">
                          <Phone className="h-3 w-3" />{client.phone}
                        </span>
                      )}
                      {client.email && (
                        <span className="flex items-center gap-1.5 text-xs text-white/50">
                          <Mail className="h-3 w-3" />{client.email}
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-2">
                    {/* Active project bars */}
                    {activeProjects.length === 0 && (
                      <p className="text-xs text-white/30 italic">No active projects</p>
                    )}
                    {activeProjects.map(p => {
                      const pct = p.deliverableCount
                        ? Math.round((p.completedCount / p.deliverableCount) * 100)
                        : 0;
                      const barColor = urgencyClass(p.nearestDueDate);
                      return (
                        <div key={p.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-white/70 truncate max-w-[65%]">{p.name}</span>
                            <div className="flex items-center gap-1">
                              <UrgencyIcon due={p.nearestDueDate} />
                              <span className="text-xs text-white/40">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Completed count */}
                    {completedCount > 0 && (
                      <p className="text-xs text-white/30 pt-1">
                        +{completedCount} completed project{completedCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clients={clients}
        services={services}
      />
    </div>
  );
}
