import { Link, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Users, Calendar, Clock, FolderOpen, MessageSquare, ChevronRight, Download, Plus, Save, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

type TabValue = "clients" | "bookings" | "projects" | "communication" | "client-portal";

const TAB_PATHS: Record<TabValue, string> = {
  clients: "/admin/clients",
  bookings: "/admin/bookings",
  projects: "/admin/projects",
  communication: "/admin/communication",
  "client-portal": "/admin/client-portal",
};

const SERVICE_CATEGORIES = ["Real Estate & Marketing", "Property Inspections", "Mapping & Site Data", "Construction Lifecycle & 3D Digital Twins"] as const;

function getActiveTabFromPath(pathname: string): TabValue {
  if (pathname.startsWith("/admin/bookings")) return "bookings";
  if (pathname.startsWith("/admin/projects")) return "projects";
  if (pathname.startsWith("/admin/communication")) return "communication";
  if (pathname.startsWith("/admin/client-portal")) return "client-portal";
  return "clients";
}

export default function ClientOperations() {
  const [location, navigate] = useLocation();
  const activeTab = getActiveTabFromPath(location);
  const { toast } = useToast();

  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    clientId: "",
    selectedServiceIds: [] as string[],
    description: "",
    address: "",
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  type PendingSave = { name: string; clientId: string; selectedServiceIds: string[]; address: string };
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);

  const handleTabChange = (value: string) => {
    if (value === activeTab) return;
    const path = TAB_PATHS[value as TabValue];
    if (path) navigate(path);
  };

  const { data: clientsData } = useQuery({ queryKey: ["/api/crm/customers"] });
  const clients = Array.isArray(clientsData) ? clientsData : [];

  const { data: bookingsData } = useQuery({ queryKey: ["/api/bookings"] });
  const bookings = Array.isArray(bookingsData) ? bookingsData : [];

  const { data: servicesData } = useQuery({ queryKey: ["/api/services"] });
  const services = Array.isArray(servicesData) ? servicesData : [];

  const { data: projectsData } = useQuery({ queryKey: ["/api/client-projects"] });
  const projects = Array.isArray(projectsData) ? projectsData : [];

  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, typeof services> = {};
    for (const cat of SERVICE_CATEGORIES) grouped[cat] = [];
    for (const svc of services) {
      const cat = svc.category ?? "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(svc);
    }
    return grouped;
  }, [services]);

  const servicesFolderData = useMemo(() => {
    return newProject.selectedServiceIds
      .map(svcId => services.find((s: any) => String(s.id) === svcId))
      .filter(Boolean)
      .map((svc: any) => ({
        id: svc.id,
        name: svc.name,
        folders: Array.isArray(svc.folderStructure) ? svc.folderStructure : [],
      }));
  }, [newProject.selectedServiceIds, services]);

  const servicesWithoutFolders = useMemo(
    () => servicesFolderData.filter(svc => svc.folders.length === 0),
    [servicesFolderData],
  );

  const servicesWithFolders = useMemo(
    () => servicesFolderData.filter(svc => svc.folders.length > 0),
    [servicesFolderData],
  );

  const toggleService = (id: string) => {
    setNewProject(p => ({
      ...p,
      selectedServiceIds: p.selectedServiceIds.includes(id)
        ? p.selectedServiceIds.filter(s => s !== id)
        : [...p.selectedServiceIds, id],
    }));
  };

  const handleDownloadZip = async () => {
    if (!newProject.name || !newProject.clientId || newProject.selectedServiceIds.length === 0) return;
    const client = clients.find((c: any) => String(c.id) === newProject.clientId);
    const clientName = `${client?.firstName || client?.name || ""} ${client?.lastName || ""}`.trim();

    setIsDownloading(true);
    try {
      const res = await apiRequest("POST", "/api/admin/client-portal/download-zip", {
        projectName: newProject.name,
        clientName,
        serviceIds: newProject.selectedServiceIds,
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${newProject.name.replace(/\s+/g, "_")}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "ZIP downloaded", description: `Folder structure for "${newProject.name}" is ready.` });

      setPendingSave({
        name: newProject.name,
        clientId: newProject.clientId,
        selectedServiceIds: newProject.selectedServiceIds,
        address: newProject.address,
      });
      setNewProject({ name: "", clientId: "", selectedServiceIds: [], description: "", address: "" });
      setShowNewProjectForm(false);
    } catch {
      toast({ title: "Download failed", description: "Could not generate ZIP.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveAsProject = async () => {
    if (!pendingSave) return;
    setIsSavingProject(true);
    try {
      await apiRequest("POST", "/api/client-projects", {
        name: pendingSave.name,
        clientId: parseInt(pendingSave.clientId),
        selectedServices: pendingSave.selectedServiceIds.map(Number),
        address: pendingSave.address || undefined,
        status: "active",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/client-projects"] });
      setPendingSave(null);
      toast({
        title: "Project record saved",
        description: `"${pendingSave.name}" has been added to the Projects tab.`,
        action: (
          <ToastAction altText="View Projects" onClick={() => navigate("/admin/projects")}>
            View Projects
          </ToastAction>
        ),
      });
    } catch {
      toast({ title: "Save failed", description: "Could not save the project record.", variant: "destructive" });
    } finally {
      setIsSavingProject(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Client Operations - Apollo DroneWorks Admin</title>
      </Helmet>

      <Header />

      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="mb-6">
          <Link href="/admin">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin Control Center
            </Button>
          </Link>

          <h1 className="text-3xl font-bold text-foreground mb-2">Client Operations</h1>
          <p className="text-muted-foreground">Manage client relationships, bookings, and project workflows</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="clients" className="flex items-center gap-2" data-testid="tab-clients">
              <Users className="h-4 w-4" />
              CRM
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2" data-testid="tab-bookings">
              <Calendar className="h-4 w-4" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2" data-testid="tab-projects">
              <FolderOpen className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center gap-2" data-testid="tab-communication">
              <MessageSquare className="h-4 w-4" />
              Communication
            </TabsTrigger>
            <TabsTrigger value="client-portal" className="flex items-center gap-2" data-testid="tab-client-portal">
              <Download className="h-4 w-4" />
              Client Portal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Client Management</h2>
              <p className="text-sm text-muted-foreground mt-1">Click any client below to open their full detail page.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.length > 0 ? clients.slice(0, 6).map((client: any) => (
                <Card
                  key={client.id}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                  onClick={() => navigate(`/admin/crm/customers/${client.id}`)}
                  data-testid={`card-client-${client.id}`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{client.firstName || client.name} {client.lastName || ''}</CardTitle>
                        <CardDescription>{client.email}</CardDescription>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{client.company || 'Individual Client'}</p>
                    <p className="text-sm text-muted-foreground">Status: <span className="capitalize">{client.status || 'Active'}</span></p>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-full text-center py-8 text-muted-foreground">No clients found. Add your first client to get started.</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl font-semibold">Booking Management</h2>
                <p className="text-sm text-muted-foreground mt-1">Use the full Booking Manager to edit, reschedule, or update payment status.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookings.length > 0 ? bookings.slice(0, 6).map((booking: any) => (
                <Card key={booking.id} className="transition-all" data-testid={`card-booking-${booking.id}`}>
                  <CardHeader>
                    <div>
                      <CardTitle className="text-lg">{booking.customerName || booking.projectName || 'Booking #' + booking.id}</CardTitle>
                      <CardDescription>
                        {(() => {
                          const apptDate = booking.scheduledDate ? new Date(booking.scheduledDate) : booking.date ? new Date(booking.date) : null;
                          return apptDate ? (
                            <span className="flex flex-col gap-0.5">
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3 shrink-0" />{format(apptDate, 'MMM d, yyyy')}</span>
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" />{format(apptDate, 'h:mm a')}</span>
                            </span>
                          ) : 'Date TBD';
                        })()}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Status: <span className="capitalize">{booking.status || 'Pending'}</span></p>
                    <p className="text-sm text-muted-foreground">Location: {booking.projectLocation || 'TBD'}</p>
                    {booking.totalAmount && (
                      <p className="text-sm font-medium text-primary mt-1">${Number(booking.totalAmount).toLocaleString()}</p>
                    )}
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-full text-center py-8 text-muted-foreground">No bookings found. New bookings will appear here.</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Project Management</h2>
              <p className="text-sm text-muted-foreground mt-1">A snapshot of recent client projects. Edit detailed project files and milestones from each client's detail page.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.length > 0 ? projects.slice(0, 6).map((project: any) => {
                const targetPath = project.userId ? `/admin/crm/customers/${project.userId}` : null;
                return (
                  <Card
                    key={project.id}
                    className={targetPath ? "cursor-pointer hover:border-primary/50 hover:shadow-md transition-all" : "transition-all"}
                    onClick={targetPath ? () => navigate(targetPath) : undefined}
                    data-testid={`card-project-${project.id}`}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          <CardDescription>{project.description}</CardDescription>
                        </div>
                        {targetPath && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Status: <span className="capitalize">{project.status || 'In Progress'}</span></p>
                      {project.address && <p className="text-sm text-muted-foreground">Location: {project.address}</p>}
                    </CardContent>
                  </Card>
                );
              }) : (
                <div className="col-span-full text-center py-8 text-muted-foreground">No projects found. Create your first project to get started.</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="communication" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Communication Hub</h2>
              <p className="text-sm text-muted-foreground mt-1">Quick access to client communication tools.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all" onClick={() => navigate('/admin/marketing')} data-testid="card-email-campaigns">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Email Campaigns</CardTitle>
                      <CardDescription>Manage email marketing campaigns</CardDescription>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Create and manage email campaigns for client communication in the Marketing Hub.</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all" onClick={() => navigate('/admin/satisfaction-surveys')} data-testid="card-satisfaction-surveys">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Satisfaction Surveys</CardTitle>
                      <CardDescription>Collect feedback from clients</CardDescription>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Send and review customer satisfaction surveys and follow-ups.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="client-portal" className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl font-semibold">Client Portal</h2>
                <p className="text-sm text-muted-foreground mt-1">Download a ready-to-use folder structure ZIP for any client project.</p>
              </div>
              {!showNewProjectForm && !pendingSave && (
                <Button onClick={() => setShowNewProjectForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              )}
            </div>

            {pendingSave && (
              <Card className="border-primary/40 bg-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">ZIP downloaded — save a project record?</CardTitle>
                      <CardDescription>Create a project entry for "{pendingSave.name}" so it appears in the Projects tab.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm text-muted-foreground mb-4 space-y-1">
                    <p><span className="font-medium text-foreground">Project:</span> {pendingSave.name}</p>
                    <p><span className="font-medium text-foreground">Client:</span> {(() => { const c = clients.find((c: any) => String(c.id) === pendingSave.clientId); return c ? `${c.firstName || c.name || ""} ${c.lastName || ""}`.trim() : pendingSave.clientId; })()}</p>
                    <p><span className="font-medium text-foreground">Services:</span> {pendingSave.selectedServiceIds.length} selected</p>
                    {pendingSave.address && <p><span className="font-medium text-foreground">Address:</span> {pendingSave.address}</p>}
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleSaveAsProject} disabled={isSavingProject}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSavingProject ? "Saving…" : "Save Project Record"}
                    </Button>
                    <Button variant="ghost" onClick={() => setPendingSave(null)} disabled={isSavingProject}>
                      Skip
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!showNewProjectForm && !pendingSave ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
                  <div className="rounded-full bg-primary/10 p-4">
                    <FolderOpen className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">No project in progress</p>
                    <p className="text-sm text-muted-foreground mt-1">Click "New Project" to select services and generate a folder structure ZIP.</p>
                  </div>
                  <Button onClick={() => setShowNewProjectForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </CardContent>
              </Card>
            ) : !showNewProjectForm ? null : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Create Project ZIP
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => { setShowNewProjectForm(false); setNewProject({ name: "", clientId: "", selectedServiceIds: [], description: "", address: "" }); }}>
                      Cancel
                    </Button>
                  </div>
                  <CardDescription>Choose services by category to build the folder structure.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="portal-project-name">Project Name</Label>
                    <Input
                      id="portal-project-name"
                      placeholder="e.g. Smith Residence Roof Inspection"
                      value={newProject.name}
                      onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portal-client">Client</Label>
                    <Select value={newProject.clientId} onValueChange={v => setNewProject(p => ({ ...p, clientId: v }))}>
                      <SelectTrigger id="portal-client">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.firstName || c.name} {c.lastName || ''} {c.company ? `— ${c.company}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portal-address">Property Address (optional)</Label>
                    <Input
                      id="portal-address"
                      placeholder="e.g. 123 Main St, Salt Lake City, UT"
                      value={newProject.address}
                      onChange={e => setNewProject(p => ({ ...p, address: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Services (select all that apply)</Label>
                    {SERVICE_CATEGORIES.map(cat => {
                      const catServices = servicesByCategory[cat] ?? [];
                      if (catServices.length === 0) return null;
                      return (
                        <div key={cat} className="rounded-md border p-3 space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{cat}</p>
                          {catServices.map((svc: any) => (
                            <div key={svc.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`svc-${svc.id}`}
                                checked={newProject.selectedServiceIds.includes(String(svc.id))}
                                onCheckedChange={() => toggleService(String(svc.id))}
                              />
                              <Label htmlFor={`svc-${svc.id}`} className="font-normal cursor-pointer">{svc.name}</Label>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  {servicesFolderData.length > 0 && (
                    <div className="rounded-md border p-3 bg-muted/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">Folder structure preview by service:</p>
                        <Link href="/admin/services" className="text-xs text-primary hover:underline">Edit folder structure</Link>
                      </div>
                      {servicesWithFolders.map(svc => (
                        <div key={svc.id} className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{svc.name}</Badge>
                          </div>
                          <ul className="pl-3 space-y-0.5">
                            {svc.folders.map((folder: string) => {
                              const parts = folder.split("/").filter(Boolean);
                              const depth = parts.length - 1;
                              const label = parts[parts.length - 1] ?? folder;
                              return (
                                <li
                                  key={folder}
                                  className="flex items-center gap-1.5 text-sm"
                                  style={{ paddingLeft: `${depth * 14}px` }}
                                >
                                  <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                                  <span>{label}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                      {servicesWithoutFolders.length > 0 && (
                        <div className="pt-1 border-t border-muted space-y-1">
                          <p className="text-xs text-muted-foreground">No folders defined for:</p>
                          <div className="flex flex-wrap gap-1">
                            {servicesWithoutFolders.map(svc => (
                              <Badge key={svc.id} variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground">{svc.name}</Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <Link href="/admin/services" className="text-primary hover:underline">Edit the service</Link> to add folder paths.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    className="w-full"
                    disabled={!newProject.name || !newProject.clientId || newProject.selectedServiceIds.length === 0 || isDownloading}
                    onClick={handleDownloadZip}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isDownloading ? "Generating ZIP…" : "Download Folder Structure ZIP"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>How It Works</CardTitle>
                  <CardDescription>Setting up organized project deliveries</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">1</div>
                    <div>
                      <p className="font-medium text-foreground">Select services by category</p>
                      <p>Each service type has a predefined folder structure matching its deliverables. Select multiple services to combine their folders in one archive.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">2</div>
                    <div>
                      <p className="font-medium text-foreground">Download the ZIP</p>
                      <p>A ZIP archive is generated with per-service folders and a README.md inside each — ready to hand off or populate.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">3</div>
                    <div>
                      <p className="font-medium text-foreground">Populate and deliver</p>
                      <p>Fill each folder with the appropriate files from your editing workflow, then deliver the complete package to the client.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
