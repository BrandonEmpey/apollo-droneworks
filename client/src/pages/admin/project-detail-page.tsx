import { useCallback, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Loader2, ArrowLeft, Upload, X, FileImage, FileVideo, FileText, Package,
  Plus, CheckCircle2, Clock, AlertTriangle, Trash2, ExternalLink, Edit2,
} from "lucide-react";
import { differenceInDays, format } from "date-fns";

// ── types ────────────────────────────────────────────────────────────────────
interface Deliverable {
  id: number;
  projectId: number;
  name: string;
  type: string;
  status: string;
  dueDate: string | null;
  fileUrl: string | null;
  notes: string | null;
}

interface ProjectFile {
  id: number;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number | null;
  uploadedAt: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["pending", "processing", "ready", "delivered"] as const;

function statusColor(s: string) {
  if (s === "delivered") return "bg-green-500/20 text-green-400 border-green-500/30";
  if (s === "ready") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (s === "processing") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-white/10 text-white/50 border-white/20";
}

function dueBadge(due: string | null) {
  if (!due) return null;
  const d = differenceInDays(new Date(due), new Date());
  if (d < 0) return <span className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{Math.abs(d)}d overdue</span>;
  if (d <= 3) return <span className="text-xs text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Due {format(new Date(due), "MMM d")}</span>;
  return <span className="text-xs text-white/40">{format(new Date(due), "MMM d")}</span>;
}

function typeIcon(type: string) {
  if (type === "photo") return <FileImage className="h-3.5 w-3.5" />;
  if (type === "video") return <FileVideo className="h-3.5 w-3.5" />;
  if (type === "pdf") return <FileText className="h-3.5 w-3.5" />;
  return <Package className="h-3.5 w-3.5" />;
}

function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// ── DropZone ─────────────────────────────────────────────────────────────────
function DropZone({
  label, fileType, projectId, onUploaded,
}: {
  label: string; fileType: string; projectId: number; onUploaded: () => void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append("files", f));
    fd.append("fileType", fileType);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/files`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      onUploaded();
      toast({ title: `${files.length} file${files.length > 1 ? "s" : ""} uploaded` });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); uploadFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all text-center
        ${dragging ? "border-gold bg-gold/10" : "border-white/15 hover:border-gold/40 bg-white/3"}`}
    >
      <input ref={inputRef} type="file" multiple className="hidden" onChange={e => uploadFiles(e.target.files)} />
      {uploading ? (
        <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto" />
      ) : (
        <>
          <Upload className="h-7 w-7 text-gold/50 mx-auto mb-2" />
          <p className="text-sm font-medium text-white/70">{label}</p>
          <p className="text-xs text-white/30 mt-1">Drag & drop or click to browse</p>
        </>
      )}
    </div>
  );
}

// ── Add deliverable dialog ────────────────────────────────────────────────────
function AddDeliverableDialog({
  open, onClose, projectId,
}: { open: boolean; onClose: () => void; projectId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState("file");
  const [dueDate, setDueDate] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/admin/projects/${projectId}/deliverables`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/admin/projects/${projectId}`] });
      toast({ title: "Deliverable added" });
      onClose();
      setName(""); setType("file"); setDueDate("");
    },
    onError: () => toast({ title: "Failed to add deliverable", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#0d1b2e] border border-gold-dark/30 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-gold-gradient">Add Deliverable</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-white/70 text-xs mb-1 block">Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Annotated Report (PDF)" className="bg-[#132642] border-gold-dark/30 text-white" />
          </div>
          <div>
            <Label className="text-white/70 text-xs mb-1 block">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-[#132642] border-gold-dark/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#132642] border-gold-dark/30 text-white">
                {["photo", "video", "pdf", "geotiff", "pointcloud", "model", "kmz", "csv", "other"].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-white/70 text-xs mb-1 block">Due Date</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-[#132642] border-gold-dark/30 text-white" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-white/60">Cancel</Button>
          <Button onClick={() => mutation.mutate({ name, type, dueDate: dueDate || undefined })} disabled={!name || mutation.isPending} className="bg-gold hover:bg-gold-light text-black">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Deliverable row ───────────────────────────────────────────────────────────
function DeliverableRow({ d, projectId }: { d: Deliverable; projectId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlVal, setUrlVal] = useState(d.fileUrl ?? "");
  const [editingDue, setEditingDue] = useState(false);
  const [dueVal, setDueVal] = useState(d.dueDate ? d.dueDate.slice(0, 10) : "");

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/admin/deliverables/${d.id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/admin/projects/${projectId}`] }),
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/admin/deliverables/${d.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/admin/projects/${projectId}`] }),
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0d1b2e] border border-white/8 hover:border-gold-dark/30 transition-all group">
      {/* Type icon */}
      <span className="text-gold/50 shrink-0">{typeIcon(d.type)}</span>

      {/* Name + due */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{d.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {editingDue ? (
            <input
              type="date"
              value={dueVal}
              onChange={e => setDueVal(e.target.value)}
              onBlur={() => { setEditingDue(false); updateMutation.mutate({ dueDate: dueVal || null }); }}
              className="text-xs bg-[#132642] border border-gold-dark/30 rounded px-1 text-white"
              autoFocus
            />
          ) : (
            <button onClick={() => setEditingDue(true)} className="text-left hover:opacity-80">
              {dueBadge(d.dueDate)}
            </button>
          )}
        </div>
      </div>

      {/* File URL */}
      <div className="shrink-0">
        {editingUrl ? (
          <div className="flex items-center gap-1">
            <input
              value={urlVal}
              onChange={e => setUrlVal(e.target.value)}
              onBlur={() => { setEditingUrl(false); updateMutation.mutate({ fileUrl: urlVal || null }); }}
              placeholder="https://… or /uploads/…"
              className="text-xs bg-[#132642] border border-gold-dark/30 rounded px-2 py-1 text-white w-48"
              autoFocus
            />
          </div>
        ) : d.fileUrl ? (
          <div className="flex items-center gap-1">
            <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-gold text-xs flex items-center gap-1 hover:underline">
              <ExternalLink className="h-3 w-3" />File
            </a>
            <button onClick={() => setEditingUrl(true)} className="text-white/30 hover:text-white/60">
              <Edit2 className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button onClick={() => setEditingUrl(true)} className="text-xs text-white/30 hover:text-gold/60 transition-colors">
            + attach file
          </button>
        )}
      </div>

      {/* Status selector */}
      <Select
        value={d.status}
        onValueChange={status => updateMutation.mutate({ status })}
      >
        <SelectTrigger className={`h-7 text-xs border rounded-full px-2.5 w-28 shrink-0 ${statusColor(d.status)}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#132642] border-gold-dark/30 text-white text-xs">
          {STATUS_OPTIONS.map(s => (
            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Delete */}
      <button
        onClick={() => deleteMutation.mutate()}
        className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400 transition-all shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id);
  const qc = useQueryClient();
  const [addDelOpen, setAddDelOpen] = useState(false);

  const { data, isLoading } = useQuery<{
    project: any;
    customer: any;
    deliverables: Deliverable[];
    files: ProjectFile[];
  }>({
    queryKey: [`/api/admin/projects/${projectId}`],
    enabled: !!projectId,
  });

  function refreshFiles() {
    qc.invalidateQueries({ queryKey: [`/api/admin/projects/${projectId}`] });
  }

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: number) => apiRequest("DELETE", `/api/admin/files/${fileId}`),
    onSuccess: refreshFiles,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-gold" /></div>;
  }

  const { project, customer, deliverables = [], files = [] } = data ?? {};

  const rawImages = files.filter(f => f.fileType === "raw_image");
  const rtkFiles = files.filter(f => f.fileType === "rtk_data");
  const flightLogs = files.filter(f => f.fileType === "flight_log");
  const otherFiles = files.filter(f => f.fileType === "other");

  const completedCount = deliverables.filter(d => d.status === "delivered").length;
  const pct = deliverables.length ? Math.round((completedCount / deliverables.length) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back */}
      <Link href={customer ? `/admin/clients/${project?.clientId}` : "/admin/projects"}>
        <Button variant="ghost" className="text-white/50 hover:text-white mb-5 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {customer?.name ?? "Back"}
        </Button>
      </Link>

      {/* Project header */}
      <div className="bg-[#0d1b2e] border border-gold-dark/25 rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold font-montserrat text-gold-gradient">{project?.name}</h1>
            {project?.address && <p className="text-sm text-white/40 mt-0.5">{project.address}</p>}
            <div className="flex items-center gap-4 mt-3">
              {project?.droneType && (
                <Badge variant="outline" className="border-gold-dark/40 text-gold/70 text-xs">
                  {project.droneType}
                </Badge>
              )}
              <span className="text-xs text-white/40">{completedCount}/{deliverables.length} deliverables</span>
            </div>
          </div>
          {/* Overall progress */}
          <div className="text-right min-w-[100px]">
            <p className="text-2xl font-bold text-gold-gradient">{pct}%</p>
            <div className="h-2 w-24 bg-white/10 rounded-full overflow-hidden mt-1 ml-auto">
              <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT: File uploads */}
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-white">Raw Files</h2>

          <DropZone label="Raw Images" fileType="raw_image" projectId={projectId} onUploaded={refreshFiles} />
          <DropZone label="RTK / GPS Data" fileType="rtk_data" projectId={projectId} onUploaded={refreshFiles} />
          <DropZone label="Flight Logs" fileType="flight_log" projectId={projectId} onUploaded={refreshFiles} />

          {/* File lists */}
          {[
            { label: "Images", list: rawImages },
            { label: "RTK / GPS", list: rtkFiles },
            { label: "Flight Logs", list: flightLogs },
            { label: "Other", list: otherFiles },
          ].map(({ label, list }) =>
            list.length > 0 ? (
              <div key={label}>
                <p className="text-xs text-white/40 mb-1.5 uppercase tracking-wide">{label} ({list.length})</p>
                <div className="space-y-1">
                  {list.map(f => (
                    <div key={f.id} className="flex items-center justify-between text-xs text-white/60 bg-white/5 rounded px-3 py-1.5 group">
                      <span className="truncate max-w-[75%]">{f.fileName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white/30">{formatBytes(f.fileSize)}</span>
                        <button
                          onClick={() => deleteFileMutation.mutate(f.id)}
                          className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>

        {/* RIGHT: Deliverables */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Deliverables</h2>
            <Button size="sm" onClick={() => setAddDelOpen(true)} variant="outline" className="border-gold-dark/40 text-gold hover:bg-gold/10 h-8 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />Add
            </Button>
          </div>

          {deliverables.length === 0 ? (
            <div className="text-center py-12 text-white/30 border border-dashed border-white/10 rounded-xl">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No deliverables yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deliverables.map(d => (
                <DeliverableRow key={d.id} d={d} projectId={projectId} />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddDeliverableDialog open={addDelOpen} onClose={() => setAddDelOpen(false)} projectId={projectId} />
    </div>
  );
}
