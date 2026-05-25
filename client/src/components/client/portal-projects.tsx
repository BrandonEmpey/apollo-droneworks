import { useQuery } from "@tanstack/react-query";
import { Loader2, Package, CheckCircle2, Clock, AlertTriangle, Download, ExternalLink, FolderOpen, FileImage, FileVideo, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, format } from "date-fns";

interface Deliverable {
  id: number;
  name: string;
  type: string;
  status: string;
  dueDate: string | null;
  fileUrl: string | null;
}

interface PortalProject {
  id: number;
  name: string;
  status: string;
  address: string | null;
  droneType: string | null;
  deliverables: Deliverable[];
}

function typeIcon(type: string) {
  if (type === "photo") return <FileImage className="h-3.5 w-3.5 text-gold/60" />;
  if (type === "video") return <FileVideo className="h-3.5 w-3.5 text-gold/60" />;
  if (type === "pdf") return <FileText className="h-3.5 w-3.5 text-gold/60" />;
  return <Package className="h-3.5 w-3.5 text-gold/60" />;
}

function statusBadge(status: string) {
  if (status === "delivered") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Ready</Badge>;
  if (status === "ready") return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Ready</Badge>;
  if (status === "processing") return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Processing</Badge>;
  return <Badge className="bg-white/10 text-white/40 border-white/15 text-xs">Pending</Badge>;
}

function dueLine(dueDate: string | null, status: string) {
  if (status === "delivered") return null;
  if (!dueDate) return null;
  const d = differenceInDays(new Date(dueDate), new Date());
  if (d < 0) return <span className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{Math.abs(d)}d overdue</span>;
  if (d === 0) return <span className="text-xs text-amber-400">Due today</span>;
  return <span className="text-xs text-white/30">Due {format(new Date(dueDate), "MMM d")}</span>;
}

function DeliverableCard({ d }: { d: Deliverable }) {
  const isReady = d.status === "ready" || d.status === "delivered";

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all
      ${isReady ? "bg-[#132642] border-gold-dark/30" : "bg-[#0d1b2e] border-white/8"}`}>
      <span className="shrink-0">{typeIcon(d.type)}</span>

      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${isReady ? "text-white" : "text-white/50"}`}>{d.name}</p>
        <div className="mt-0.5">{dueLine(d.dueDate, d.status)}</div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {statusBadge(d.status)}
        {isReady && d.fileUrl && (
          <a
            href={d.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-gold hover:text-gold-light transition-colors"
          >
            {d.fileUrl.startsWith("http") ? (
              <><ExternalLink className="h-3.5 w-3.5" />View</>
            ) : (
              <><Download className="h-3.5 w-3.5" />Download</>
            )}
          </a>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: PortalProject }) {
  const ready = project.deliverables.filter(d => d.status === "ready" || d.status === "delivered").length;
  const total = project.deliverables.length;
  const pct = total ? Math.round((ready / total) * 100) : 0;

  return (
    <div className="bg-[#0d1b2e] border border-gold-dark/20 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white font-montserrat">{project.name}</h3>
          {project.address && <p className="text-xs text-white/40 mt-0.5">{project.address}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-gold-gradient">{pct}%</p>
          <p className="text-xs text-white/30">{ready}/{total} ready</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gold rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Deliverables */}
      {project.deliverables.length > 0 ? (
        <div className="space-y-2">
          {project.deliverables.map(d => (
            <DeliverableCard key={d.id} d={d} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/30 text-center py-4">No deliverables yet — check back soon.</p>
      )}
    </div>
  );
}

export default function PortalProjects() {
  const { data: projects = [], isLoading } = useQuery<PortalProject[]>({
    queryKey: ["/api/portal/projects"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-20 text-white/30">
        <FolderOpen className="h-14 w-14 mx-auto mb-4 opacity-20" />
        <p className="text-lg font-medium">No projects yet</p>
        <p className="text-sm mt-1">Your projects and deliverables will appear here once your pilot sets them up.</p>
      </div>
    );
  }

  const active = projects.filter(p => p.status !== "completed");
  const completed = projects.filter(p => p.status === "completed");

  return (
    <div className="space-y-8">
      {active.length > 0 && (
        <div className="space-y-4">
          {active.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white/30 uppercase tracking-wide mb-3">Completed</h3>
          <div className="space-y-4">
            {completed.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}
