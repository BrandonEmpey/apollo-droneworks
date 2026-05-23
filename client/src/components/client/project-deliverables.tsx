import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  CheckCircle2, Clock, Calendar, Package, ChevronDown, ChevronRight,
  AlertCircle, Loader2, FileCheck, ClipboardList, Upload, Download,
  ExternalLink, Image as ImageIcon, Video as VideoIcon, FileText, Link2,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ProjectService, ProjectDeliverable, Service, ClientProject,
} from "@shared/schema";
import {
  DELIVERY_METHOD_IDS,
  DELIVERY_METHODS,
  type DeliveryMethodId,
  type DeliveryMethodDefinition,
  clearedFieldsForMethodChange,
  inferDeliveryMethodFromData,
  isDeliveryMethodId,
  suggestDeliveryMethod,
} from "@shared/delivery-methods";
import FileViewer from "./file-viewers/FileViewer";

// Tiny UI-side lookup that turns the registry's iconName into a React
// component. Adding a method only requires touching this map if the new
// method uses an icon not yet listed here.
const METHOD_ICONS: Record<DeliveryMethodDefinition["iconName"], React.ComponentType<{ className?: string }>> = {
  Image: ImageIcon,
  Video: VideoIcon,
  FileText,
  Link2,
};

function methodIcon(methodId: DeliveryMethodId | null, className = "h-3.5 w-3.5") {
  const def = methodId ? DELIVERY_METHODS[methodId] : null;
  if (!def) return null;
  const Icon = METHOD_ICONS[def.iconName];
  return <Icon className={className} />;
}

// For backward compat with rows still missing a deliveryMethod (e.g. tests
// or in-flight inserts), only infer from a known fileUrl extension so a
// previously uploaded file still renders in the matching slot. Do NOT
// infer "link" from a per-deliverable `externalUrl`: those rows predate
// the project-level shareable link, so we keep them on the legacy
// fallback button (rendered when method is null + externalUrl is set)
// instead of silently bucketing them under a possibly-empty shared-link
// card.
function effectiveDeliveryMethod(d: ProjectDeliverable): DeliveryMethodId | null {
  if (isDeliveryMethodId(d.deliveryMethod)) return d.deliveryMethod;
  const inferred = inferDeliveryMethodFromData({ fileUrl: d.fileUrl, externalUrl: null });
  return inferred;
}

function buildExternalLinkPath(url: string, label: string, deliverableId?: number | string): string {
  const params = new URLSearchParams();
  params.set("to", url);
  params.set("label", label);
  if (deliverableId !== undefined) params.set("deliverable", String(deliverableId));
  return `/external-link?${params.toString()}`;
}

const FILE_ACCEPT: Record<DeliveryMethodId, string | undefined> = {
  image: "image/*",
  video: "video/*",
  document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.dxf,.dwg,.las,.laz,.e57,.obj,.glb,.gltf,.tif,.tiff,.geotiff",
  link: undefined,
};

interface ProjectDeliverablesProps {
  projectId: number;
  isAdmin?: boolean;
}

interface ProjectServiceWithDetails extends ProjectService {
  service?: Service;
  deliverables?: ProjectDeliverable[];
}

export function ProjectDeliverables({ projectId, isAdmin = false }: ProjectDeliverablesProps) {
  const { toast } = useToast();
  const [expandedServices, setExpandedServices] = useState<Set<number>>(new Set());
  const [uploadingDeliverableId, setUploadingDeliverableId] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [editingProjectLink, setEditingProjectLink] = useState(false);
  const [linkUrlDraft, setLinkUrlDraft] = useState("");
  const [pendingMethodChange, setPendingMethodChange] = useState<{
    deliverable: ProjectDeliverable;
    nextMethod: DeliveryMethodId | null;
  } | null>(null);

  const { data: project } = useQuery<ClientProject | undefined>({
    queryKey: ["/api/client-projects", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/client-projects/${projectId}`, { credentials: "include" });
      if (!res.ok) return undefined;
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: projectServices = [], isLoading: servicesLoading } = useQuery<ProjectService[]>({
    queryKey: ["/api/projects", projectId, "services"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/services`);
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: allServices = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: projectDeliverables = [], isLoading: deliverablesLoading } = useQuery<ProjectDeliverable[]>({
    queryKey: ["/api/projects", projectId, "deliverables"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/deliverables`);
      return res.json();
    },
    enabled: !!projectId,
  });

  const updateDeliverableMutation = useMutation({
    mutationFn: async (payload: Partial<ProjectDeliverable> & { id: number }) => {
      const { id, ...rest } = payload;
      return apiRequest("PUT", `/api/project-deliverables/${id}`, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "deliverables"] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to update deliverable";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const updateProjectLinkMutation = useMutation({
    mutationFn: async (shareableLink: string | null) => {
      return apiRequest("PUT", `/api/client-projects/${projectId}`, { shareableLink });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects", projectId] });
      setEditingProjectLink(false);
      toast({ title: "Saved", description: "Project shareable link updated" });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to save link";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ deliverableId, file }: { deliverableId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("deliverableId", deliverableId.toString());
      formData.append("projectId", projectId.toString());

      const res = await fetch(`/api/project-deliverables/${deliverableId}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "deliverables"] });
      setUploadingDeliverableId(null);
      toast({ title: "Uploaded", description: "File uploaded successfully" });
    },
    onError: () => {
      setUploadingDeliverableId(null);
      toast({ title: "Error", description: "Failed to upload file", variant: "destructive" });
    },
  });

  const handleFileUpload = async (deliverableId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingDeliverableId(deliverableId);
    uploadFileMutation.mutate({ deliverableId, file });
  };

  const handleStatusChange = (deliverable: ProjectDeliverable, newStatus: string) => {
    const completionDate = newStatus === "completed" ? new Date() : undefined;
    updateDeliverableMutation.mutate({
      id: deliverable.id,
      status: newStatus,
      completionDate: completionDate as ProjectDeliverable["completionDate"],
    });
  };

  const toggleServiceExpanded = (serviceId: number) => {
    setExpandedServices(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const handleToggleDeliverable = (deliverable: ProjectDeliverable) => {
    if (!isAdmin) return;
    const newStatus = deliverable.status === "completed" ? "pending" : "completed";
    const completionDate = newStatus === "completed" ? new Date() : undefined;
    updateDeliverableMutation.mutate({
      id: deliverable.id,
      status: newStatus,
      completionDate: completionDate as ProjectDeliverable["completionDate"],
    });
  };

  const requestMethodChange = (deliverable: ProjectDeliverable, raw: string) => {
    const nextMethod: DeliveryMethodId | null = raw === "none" ? null : (raw as DeliveryMethodId);
    const current = effectiveDeliveryMethod(deliverable);
    if (current === nextMethod) return;

    // Ask the registry which storage fields the new method would clear,
    // and confirm before destroying any data that's actually present.
    const cleared = clearedFieldsForMethodChange(nextMethod);
    const willDestroyData =
      ("fileUrl" in cleared && !!deliverable.fileUrl) ||
      ("externalUrl" in cleared && !!deliverable.externalUrl) ||
      ("externalUrlLabel" in cleared && !!deliverable.externalUrlLabel);
    if (willDestroyData) {
      setPendingMethodChange({ deliverable, nextMethod });
      return;
    }
    applyMethodChange(deliverable, nextMethod);
  };

  const applyMethodChange = (deliverable: ProjectDeliverable, nextMethod: DeliveryMethodId | null) => {
    updateDeliverableMutation.mutate(
      { id: deliverable.id, deliveryMethod: nextMethod as ProjectDeliverable["deliveryMethod"] },
      {
        onSuccess: () => {
          toast({
            title: "Updated",
            description: nextMethod
              ? `Delivery method set to ${DELIVERY_METHODS[nextMethod].shortLabel}`
              : "Delivery method cleared",
          });
        },
      },
    );
  };

  const getServiceWithDetails = (ps: ProjectService): ProjectServiceWithDetails => {
    const service = allServices.find(s => s.id === ps.serviceId);
    const deliverables = projectDeliverables.filter(d => d.projectServiceId === ps.id);
    return { ...ps, service, deliverables };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in_progress": return "bg-blue-500";
      default: return "bg-gray-400";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" /> In Progress</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  const getDeadlineInfo = (deadline: Date | null | undefined) => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const daysUntil = differenceInDays(deadlineDate, new Date());
    if (isPast(deadlineDate) && !isToday(deadlineDate)) {
      return <span className="text-red-600 font-medium flex items-center gap-1">
        <AlertCircle className="h-3 w-3" /> Overdue by {Math.abs(daysUntil)} days
      </span>;
    } else if (isToday(deadlineDate)) {
      return <span className="text-orange-600 font-medium">Due today</span>;
    } else if (daysUntil <= 3) {
      return <span className="text-orange-500">Due in {daysUntil} days</span>;
    }
    return <span className="text-muted-foreground">Due in {daysUntil} days</span>;
  };

  // Aggregate every deliverable whose method is registered as "uses the
  // project shared link" — they all share the project-level shareableLink
  // and render as one card on the customer side.
  const linkDeliverables = useMemo(
    () =>
      projectDeliverables.filter(d => {
        const method = effectiveDeliveryMethod(d);
        return !!method && DELIVERY_METHODS[method].usesProjectShareableLink;
      }),
    [projectDeliverables],
  );

  if (servicesLoading || deliverablesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading deliverables...
      </div>
    );
  }

  if (projectServices.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No services have been added to this project yet.</p>
        </CardContent>
      </Card>
    );
  }

  const totalDeliverables = projectDeliverables.length;
  const completedDeliverables = projectDeliverables.filter(d => d.status === "completed").length;
  const overallProgress = totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0;

  const projectShareableLink = project?.shareableLink || null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Project Deliverables Overview
          </CardTitle>
          <CardDescription>
            Track the progress of all deliverables for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-2">
            <Progress value={overallProgress} className="flex-1" />
            <span className="text-sm font-medium whitespace-nowrap">
              {completedDeliverables} / {totalDeliverables} complete
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {overallProgress === 100
              ? "All deliverables have been completed!"
              : `${100 - overallProgress}% remaining across ${projectServices.length} service(s)`}
          </p>
        </CardContent>
      </Card>

      {/* Shared link card — visible whenever any deliverable uses the
          link method, plus admins can always set it. */}
      {(linkDeliverables.length > 0 || isAdmin) && (
        <Card data-testid="card-shared-link">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4" />
              Shared link for this project
            </CardTitle>
            <CardDescription>
              {linkDeliverables.length > 0
                ? `One link covers ${linkDeliverables.length} deliverable${linkDeliverables.length === 1 ? "" : "s"} delivered as a sharable link.`
                : "No deliverables are using the sharable-link method yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {projectShareableLink ? (
              <Button
                asChild
                size="lg"
                className="w-full justify-center bg-gold text-[#0b111f] hover:bg-gold/90 font-semibold"
              >
                <a
                  href={buildExternalLinkPath(projectShareableLink, "Open shared deliverables")}
                  data-testid="link-project-shareable"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open shared deliverables
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {isAdmin
                  ? "No shared link is set yet. Add one to deliver link-method items."
                  : "Your shared link is not ready yet."}
              </p>
            )}
            {linkDeliverables.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Covered by this link:</p>
                <ul className="text-sm space-y-0.5 list-disc pl-5">
                  {linkDeliverables.map(d => (
                    <li key={d.id} data-testid={`shared-link-item-${d.id}`}>{d.name}</li>
                  ))}
                </ul>
              </div>
            )}
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setLinkUrlDraft(projectShareableLink || "");
                  setEditingProjectLink(true);
                }}
                data-testid="button-edit-project-shareable"
              >
                <Link2 className="h-3.5 w-3.5 mr-1" />
                {projectShareableLink ? "Edit shared link" : "Set shared link"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={editingProjectLink} onOpenChange={(open) => !open && setEditingProjectLink(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Project shareable link</DialogTitle>
            <DialogDescription>
              Customers see this single link for every deliverable on this project that uses the &quot;Sharable Link&quot; method.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="project-link-url">Shareable URL (https only)</Label>
              <Input
                id="project-link-url"
                type="url"
                placeholder="https://viewer.example.com/share/..."
                value={linkUrlDraft}
                onChange={(e) => setLinkUrlDraft(e.target.value)}
                data-testid="input-project-shareable-url"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              onClick={() => updateProjectLinkMutation.mutate(null)}
              disabled={!projectShareableLink || updateProjectLinkMutation.isPending}
              data-testid="button-clear-project-shareable"
            >
              Remove link
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingProjectLink(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={updateProjectLinkMutation.isPending}
                onClick={() => {
                  const trimmed = linkUrlDraft.trim();
                  if (!trimmed) {
                    toast({ title: "URL required", description: "Enter an https URL or click Remove link.", variant: "destructive" });
                    return;
                  }
                  if (!/^https:\/\//i.test(trimmed)) {
                    toast({ title: "Invalid URL", description: "The link must start with https://", variant: "destructive" });
                    return;
                  }
                  updateProjectLinkMutation.mutate(trimmed);
                }}
                data-testid="button-save-project-shareable"
              >
                {updateProjectLinkMutation.isPending ? "Saving..." : "Save link"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-5xl bg-[#0b111f] border-gold-dark/30 text-offwhite">
          <DialogHeader>
            <DialogTitle className="text-gold">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          {previewFile && (
            <FileViewer fileUrl={previewFile.url} fileName={previewFile.name} />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingMethodChange}
        onOpenChange={(open) => !open && setPendingMethodChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change delivery method?</AlertDialogTitle>
            <AlertDialogDescription>
              Switching the delivery method on &quot;{pendingMethodChange?.deliverable.name}&quot; will clear the file or link already attached to this deliverable. The deliverable&apos;s name, description, status, and dates are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingMethodChange) {
                  applyMethodChange(pendingMethodChange.deliverable, pendingMethodChange.nextMethod);
                  setPendingMethodChange(null);
                }
              }}
              data-testid="button-confirm-method-change"
            >
              Switch and clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-4">
        {projectServices.map((ps) => {
          const serviceWithDetails = getServiceWithDetails(ps);
          const isExpanded = expandedServices.has(ps.id);
          const serviceDeliverables = serviceWithDetails.deliverables || [];
          const completedCount = serviceDeliverables.filter(d => d.status === "completed").length;
          const serviceProgress = serviceDeliverables.length > 0
            ? Math.round((completedCount / serviceDeliverables.length) * 100)
            : 0;

          return (
            <Card key={ps.id} className="overflow-hidden">
              <Collapsible open={isExpanded} onOpenChange={() => toggleServiceExpanded(ps.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <Package className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-lg">
                            {serviceWithDetails.service?.name || `Service #${ps.serviceId}`}
                          </CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            {ps.orderDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Ordered: {format(new Date(ps.orderDate), "MMM d, yyyy")}
                              </span>
                            )}
                            {ps.deadline && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getDeadlineInfo(ps.deadline)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(ps.status || "pending")}
                        <div className="text-right min-w-[100px]">
                          <div className="text-sm font-medium">
                            {completedCount}/{serviceDeliverables.length}
                          </div>
                          <Progress value={serviceProgress} className="h-2 w-20" />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {serviceDeliverables.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <p>No deliverables configured for this service yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 mt-2">
                        {serviceDeliverables.map((deliverable) => (
                          <DeliverableRow
                            key={deliverable.id}
                            deliverable={deliverable}
                            serviceName={serviceWithDetails.service?.name}
                            isAdmin={isAdmin}
                            projectShareableLink={projectShareableLink}
                            onToggleComplete={() => handleToggleDeliverable(deliverable)}
                            isToggling={updateDeliverableMutation.isPending}
                            onStatusChange={(value) => handleStatusChange(deliverable, value)}
                            onMethodChange={(value) => requestMethodChange(deliverable, value)}
                            onPreviewFile={(url, name) => setPreviewFile({ url, name })}
                            onFileSelected={(e) => handleFileUpload(deliverable.id, e)}
                            isUploading={uploadFileMutation.isPending && uploadingDeliverableId === deliverable.id}
                            getStatusColor={getStatusColor}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

interface DeliverableRowProps {
  deliverable: ProjectDeliverable;
  serviceName?: string;
  isAdmin: boolean;
  projectShareableLink: string | null;
  onToggleComplete: () => void;
  isToggling: boolean;
  onStatusChange: (value: string) => void;
  onMethodChange: (value: string) => void;
  onPreviewFile: (url: string, name: string) => void;
  onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  getStatusColor: (status: string) => string;
}

function DeliverableRow({
  deliverable,
  serviceName,
  isAdmin,
  projectShareableLink,
  onToggleComplete,
  isToggling,
  onStatusChange,
  onMethodChange,
  onPreviewFile,
  onFileSelected,
  isUploading,
  getStatusColor,
}: DeliverableRowProps) {
  const method = effectiveDeliveryMethod(deliverable);
  const def = method ? DELIVERY_METHODS[method] : null;
  const suggested = method ? null : suggestDeliveryMethod(deliverable.name, serviceName);
  // Render contracts come from the registry — no per-id branching here.
  const acceptsFile = def?.capabilities.acceptsFile === true;
  const usesProjectLink = def?.usesProjectShareableLink === true;
  const customerDownload = def?.capabilities.customerDownload === true;
  const fileAccept = def?.capabilities.fileAccept;
  // Customer view of a "pending" (no method picked) deliverable: show the
  // name + status + due date but NO empty slots.
  const isPendingForCustomer = !isAdmin && method === null;

  return (
    <div
      className={`flex flex-col gap-3 p-3 rounded-lg border ${
        deliverable.status === "completed" ? "bg-green-50 border-green-200" : "bg-background"
      }`}
      data-testid={`deliverable-row-${deliverable.id}`}
    >
      {/* Customer-visible delivery slot */}
      {!isAdmin && customerDownload && deliverable.fileUrl && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onPreviewFile(deliverable.fileUrl as string, deliverable.name || "file")}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            data-testid={`button-preview-deliverable-${deliverable.id}`}
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
          <a
            href={deliverable.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            download
          >
            <Download className="h-3 w-3" />
            Download
          </a>
        </div>
      )}

      {/* Legacy fallback: when a row has no deliveryMethod chosen but does
          carry a per-deliverable externalUrl from before the registry,
          still surface it on the customer side. The shared-link card
          covers the new "link" method. */}
      {!isAdmin && method === null && deliverable.externalUrl && (
        <Button
          asChild
          size="lg"
          className="w-full justify-center bg-gold text-[#0b111f] hover:bg-gold/90 font-semibold"
        >
          <a
            href={buildExternalLinkPath(
              deliverable.externalUrl,
              deliverable.externalUrlLabel || deliverable.name || "deliverable",
              deliverable.id,
            )}
            data-testid={`button-external-link-${deliverable.id}`}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {deliverable.externalUrlLabel || "View deliverable"}
          </a>
        </Button>
      )}

      {!isAdmin && usesProjectLink && (
        <p className="text-xs text-muted-foreground italic">
          Delivered via the project shared link above.
        </p>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isAdmin ? (
            <Checkbox
              checked={deliverable.status === "completed"}
              onCheckedChange={onToggleComplete}
              disabled={isToggling}
            />
          ) : (
            <div className={`h-4 w-4 rounded-full ${getStatusColor(deliverable.status || "pending")}`} />
          )}
          <div className="min-w-0">
            <div className={`font-medium ${deliverable.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
              {deliverable.name}
              {method && (
                <Badge variant="outline" className="ml-2 inline-flex items-center gap-1 text-[10px] py-0 h-5 align-middle">
                  {methodIcon(method)}
                  {DELIVERY_METHODS[method].shortLabel}
                </Badge>
              )}
              {isPendingForCustomer && (
                <Badge variant="outline" className="ml-2 text-[10px] py-0 h-5 align-middle">
                  Pending
                </Badge>
              )}
            </div>
            {deliverable.description && (
              <p className="text-sm text-muted-foreground">{deliverable.description}</p>
            )}

            {/* Admin: per-deliverable picker */}
            {isAdmin && (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Label className="text-xs text-muted-foreground">Delivered as:</Label>
                <Select
                  value={method ?? "none"}
                  onValueChange={onMethodChange}
                >
                  <SelectTrigger
                    className="w-[200px] h-8 text-xs"
                    data-testid={`select-delivery-method-${deliverable.id}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      Not selected{suggested ? ` — Suggested: ${DELIVERY_METHODS[suggested].shortLabel}` : ""}
                    </SelectItem>
                    {DELIVERY_METHOD_IDS.map(id => (
                      <SelectItem key={id} value={id}>
                        <span className="inline-flex items-center gap-2">
                          {methodIcon(id)}
                          {DELIVERY_METHODS[id].label}
                          {suggested === id ? " (suggested)" : ""}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Admin: only the input matching the chosen method */}
            {isAdmin && acceptsFile && deliverable.fileUrl && (
              <div className="flex items-center gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => onPreviewFile(deliverable.fileUrl as string, deliverable.name || "file")}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  data-testid={`button-preview-deliverable-${deliverable.id}`}
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </button>
                <a
                  href={deliverable.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  download
                >
                  <Download className="h-3 w-3" />
                  Download
                </a>
              </div>
            )}
            {isAdmin && usesProjectLink && (
              <p className="text-xs text-muted-foreground mt-1.5 italic">
                {projectShareableLink
                  ? "Uses the project shared link above."
                  : "Set the project shared link above to make this visible to customers."}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {deliverable.estimatedDate && (
            <span className="text-muted-foreground hidden sm:inline">
              Est: {format(new Date(deliverable.estimatedDate), "MMM d")}
            </span>
          )}
          {deliverable.completionDate && (
            <span className="text-green-600 hidden sm:inline">
              <CheckCircle2 className="h-3 w-3 inline mr-1" />
              {format(new Date(deliverable.completionDate), "MMM d")}
            </span>
          )}

          <Select
            value={deliverable.status || "pending"}
            onValueChange={onStatusChange}
            disabled={isToggling}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* Upload button only for admin and only when method is one that
              actually accepts a file. Customers never see an empty
              upload slot. */}
          {isAdmin && acceptsFile && deliverable.status !== "completed" && (
            <div className="relative">
              <input
                type="file"
                id={`upload-${deliverable.id}`}
                className="hidden"
                accept={fileAccept}
                onChange={onFileSelected}
                disabled={isUploading}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2"
                onClick={() => document.getElementById(`upload-${deliverable.id}`)?.click()}
                disabled={isUploading}
                data-testid={`button-upload-deliverable-${deliverable.id}`}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
