import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import TimelapseViewer from "./timelapse-viewer/timelapse-viewer";
import { 
  Loader2, MapPin, CheckCircle2,
  Send, Camera, Video, Clock, Box, Layers, Star, Trash2, AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import ProjectMilestones from "./project-milestones";
import ProjectTasks from "./project-tasks";
import ProjectCommunication from "./project-communication";
import ProjectAnalytics from "./project-analytics";
import ProjectServicesList from "./ServicesList";
import { apiRequest } from "@/lib/queryClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ClientProject } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Project status badge colors mapping
const getStatusColor = (status: string) => {
  const statusMap: Record<string, string> = {
    "pending": "bg-yellow-500",
    "in progress": "bg-blue-500",
    "completed": "bg-green-500",
    "cancelled": "bg-red-500"
  };
  return statusMap[status.toLowerCase()] || "bg-gray-500";
};

const ClientProjects = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeProject, setActiveProject] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest("DELETE", `/api/client-projects/${projectId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete project");
      }
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/projects"] });
      toast({
        title: "Project deleted",
        description: "The project has been successfully deleted",
      });
      if (activeProject === projectId) {
        setActiveProject(null);
      }
      setDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete project",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Fetch client projects
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ["/api/client/projects"],
    queryFn: async () => {
      const res = await fetch('/api/client/projects');
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
    staleTime: 60000
  });

  // Handle errors
  useEffect(() => {
    if (projectsError) {
      toast({
        title: "Error loading projects",
        description: "There was a problem loading your projects. Please try again.",
        variant: "destructive",
      });
    }
  }, [projectsError, toast]);

  // Select first project as active if none is selected
  useEffect(() => {
    if (activeProject === null && projects && projects.length > 0) {
      setActiveProject(projects[0].id);
    }
  }, [activeProject, projects]);

  // Loading state
  if (projectsLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Handle empty state
  if (!projects || projects.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Your Projects</CardTitle>
          <CardDescription>You don't have any projects yet.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">No projects have been created for your account yet.</p>
          <p className="text-sm text-muted-foreground">Contact us to discuss your drone service needs.</p>
        </CardContent>
      </Card>
    );
  }

  // Get the currently active project
  const currentProject = projects.find((p: ClientProject) => p.id === activeProject);

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold font-montserrat text-offwhite">Your Projects</h2>
      </div>

      <div className="flex flex-col gap-6">
        {/* Project Selection Dropdown */}
        <div className="bg-[#132642] border border-gold-dark/30 rounded-md p-4">
          <h3 className="text-lg font-medium text-offwhite mb-3">Dashboard Navigation</h3>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-full md:w-1/3">
              <Select 
                value={activeProject?.toString() || ""} 
                onValueChange={(value) => setActiveProject(parseInt(value))}
              >
                <SelectTrigger className="bg-[#080d17] border-gold-dark/30 text-offwhite">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent className="bg-[#0b111f] border-gold-dark/30">
                  {projects.map((project: ClientProject) => (
                    <SelectItem 
                      key={project.id} 
                      value={project.id.toString()}
                      className="text-offwhite hover:bg-[#132642] focus:bg-[#132642] focus:text-offwhite"
                    >
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeProject && (
              <div className="w-full md:w-2/3">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" id="projectTabs">
                  <TabsList className="bg-[#080d17] border border-gold-dark/30 p-1 rounded-md w-full grid grid-cols-4">
                    <TabsTrigger 
                      value="overview"
                      className="h-10 rounded data-[state=active]:bg-[#132642] data-[state=active]:text-offwhite data-[state=active]:font-medium data-[state=active]:shadow-sm"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger 
                      value="tasks"
                      className="h-10 rounded data-[state=active]:bg-[#132642] data-[state=active]:text-offwhite data-[state=active]:font-medium data-[state=active]:shadow-sm"
                    >
                      Tasks
                    </TabsTrigger>
                    <TabsTrigger 
                      value="communication"
                      className="h-10 rounded data-[state=active]:bg-[#132642] data-[state=active]:text-offwhite data-[state=active]:font-medium data-[state=active]:shadow-sm"
                    >
                      Communication
                    </TabsTrigger>
                    <TabsTrigger 
                      value="analytics"
                      className="h-10 rounded data-[state=active]:bg-[#132642] data-[state=active]:text-offwhite data-[state=active]:font-medium data-[state=active]:shadow-sm"
                    >
                      Analytics
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>
        </div>

        {/* Project content based on selection */}
        {!activeProject ? (
          <Card className="bg-[#132642] border-gold-dark/30">
            <CardHeader>
              <CardTitle className="text-offwhite">Select a Project</CardTitle>
              <CardDescription className="text-offwhite/70">
                Please select a project from the dropdown above to view details
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                {projects.map((project: ClientProject) => (
                  <Card 
                    key={project.id} 
                    className="cursor-pointer hover:border-gold-dark bg-[#132642] border-gold-dark/30 transition-all"
                    onClick={() => setActiveProject(project.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg text-offwhite">{project.name}</CardTitle>
                        <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="text-sm text-offwhite/70">
                        <span className="font-medium text-gold-light">Started:</span>{" "}
                        {project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "Not started"}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full bg-[#1d1d1d] text-offwhite border-gold-dark/30 hover:border-gold hover:bg-[#1d1d1d]/80 transition-all"
                      >
                        View Project
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="hidden">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="communication">Communication</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <Card className="bg-[#132642] border-gold-dark/30">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl text-offwhite">{currentProject?.name}</CardTitle>
                      <CardDescription className="text-offwhite/70">{currentProject?.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(currentProject?.status || '')}>{currentProject?.status}</Badge>
                      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-[#1d1d1d] text-red-400 border-red-900/30 hover:border-red-500 hover:bg-[#1d1d1d]/80 transition-all"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#0b111f] border-gold-dark/30">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-offwhite flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                              Delete Project
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-offwhite/70">
                              Are you sure you want to delete this project? This action cannot be undone 
                              and all associated data including files and tasks will be permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-[#1d1d1d] text-offwhite border-gold-dark/30 hover:bg-[#1d1d1d]/80 hover:text-offwhite hover:border-gold">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 text-white hover:bg-red-700"
                              onClick={() => {
                                if (currentProject) {
                                  deleteProjectMutation.mutate(currentProject.id);
                                }
                              }}
                              disabled={deleteProjectMutation.isPending}
                            >
                              {deleteProjectMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                "Delete Project"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gold-light mb-1">Project Information</h4>
                      <ul className="space-y-2 text-sm">
                        {currentProject?.address && (
                          <li className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                            <span className="text-offwhite">{currentProject.address}</span>
                          </li>
                        )}
                        {/* Show primary service or selected services */}
                        <li className="flex items-start gap-2">
                          <Send className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                          <div>
                            <span className="text-offwhite font-medium">Scheduled Services:</span>
                            <div className="mt-1 space-y-1 pl-2">
                              {/* First look for selected services array */}
                              {currentProject?.selectedServices && currentProject.selectedServices.length > 0 ? (
                                // Handle case with selectedServices array
                                <ProjectServicesList 
                                  serviceIds={currentProject.selectedServices}
                                  primaryServiceId={currentProject.serviceId}
                                />
                              ) : currentProject?.serviceId ? (
                                // Fall back to just the primary service when no selectedServices
                                <ProjectServicesList 
                                  serviceIds={[currentProject.serviceId]}
                                  primaryServiceId={currentProject.serviceId}
                                />
                              ) : currentProject?.scheduledServices ? (
                                // Legacy support for old scheduledServices object
                                Array.isArray(currentProject.scheduledServices) ? 
                                  currentProject.scheduledServices.map((service, index) => (
                                    <div key={index} className="flex items-center gap-2 text-offwhite/80">
                                      {service.type === 'photo' && <Camera className="h-3.5 w-3.5 text-gold-light shrink-0" />}
                                      {service.type === 'video' && <Video className="h-3.5 w-3.5 text-gold-light shrink-0" />}
                                      {service.type === 'mapping' && <Layers className="h-3.5 w-3.5 text-gold-light shrink-0" />}
                                      {service.type === 'inspection' && <Box className="h-3.5 w-3.5 text-gold-light shrink-0" />}
                                      {service.type === 'other' && <Send className="h-3.5 w-3.5 text-gold-light shrink-0" />}
                                      <span>{service.name}</span>
                                      {service.date && (
                                        <span className="text-xs text-gold-light/70 ml-1">
                                          <Clock className="h-3 w-3 inline mr-0.5" />
                                          {format(new Date(service.date), "MMM d")}
                                        </span>
                                      )}
                                    </div>
                                  )) : 
                                  <div className="text-offwhite/80">Services information not available</div>
                              ) : (
                                <div className="text-offwhite/80">No services information available</div>
                              )}
                            </div>
                          </div>
                        </li>
                        {currentProject?.completedDate && (
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-offwhite">Completed: {format(new Date(currentProject.completedDate), "MMMM d, yyyy")}</span>
                          </li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gold-light mb-1">Project Status</h4>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-offwhite/70">Progress</span>
                            <span className="text-gold-light">{currentProject?.progress || 0}%</span>
                          </div>
                          <Progress value={currentProject?.progress || 0} className="h-2 bg-[#080d17]" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Timelapse Section */}
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gold-light mb-3 border-b border-gold-dark/30 pb-2">Project Timeline</h4>
                    {currentProject && currentProject.id ? (
                      <TimelapseViewer 
                        projectId={currentProject.id}
                        isChronological={true}
                        allowSearch={true}
                      />
                    ) : (
                      <div className="p-4 text-center text-offwhite/70">
                        No timeline information available for this project
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="tasks" className="space-y-4">
              <Card className="bg-[#132642] border-gold-dark/30">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl text-offwhite">Project Tasks</CardTitle>
                    <Badge 
                      variant="outline" 
                      className="border-gold-dark/50 text-offwhite"
                    >
                      {currentProject?.name}
                    </Badge>
                  </div>
                  <CardDescription className="text-offwhite/70">
                    Manage and track tasks for your project
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-10">
                  {activeProject && <ProjectTasks projectId={activeProject} />}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="communication" className="space-y-4">
              <Card className="bg-[#132642] border-gold-dark/30">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl text-offwhite">Project Communication</CardTitle>
                    <Badge 
                      variant="outline" 
                      className="border-gold-dark/50 text-offwhite"
                    >
                      {currentProject?.name}
                    </Badge>
                  </div>
                  <CardDescription className="text-offwhite/70">
                    Communicate with the project team and share updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeProject && user && <ProjectCommunication projectId={activeProject} clientId={user.id} />}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="analytics" className="space-y-4">
              <Card className="bg-[#132642] border-gold-dark/30">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl text-offwhite">Project Analytics</CardTitle>
                    <Badge 
                      variant="outline" 
                      className="border-gold-dark/50 text-offwhite"
                    >
                      {currentProject?.name}
                    </Badge>
                  </div>
                  <CardDescription className="text-offwhite/70">
                    View detailed analytics and metrics for your project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeProject && <ProjectAnalytics projectId={activeProject} />}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

// Legacy ServicesList component definition for backwards compatibility
type ServicesListProps = {
  serviceIds: number[];
  primaryServiceId?: number | null;
}

// This will be deprecated once all references use ProjectServicesList
const ServicesList = ({ serviceIds, primaryServiceId }: ServicesListProps) => {
  // Fetch all services for reference
  const { data: allServices } = useQuery({
    queryKey: ["/api/services"],
    staleTime: 60000, // 1 minute
  });

  if (!allServices) {
    return <div className="text-offwhite/80">Loading services...</div>;
  }

  return (
    <div className="space-y-1">
      {serviceIds.map((serviceId, index) => {
        const service = allServices.find((s: any) => s.id === serviceId);
        const isPrimary = serviceId === primaryServiceId;

        if (!service) {
          return <div key={index} className="text-offwhite/80">Service ID: {serviceId} (not found)</div>;
        }

        return (
          <div key={index} className="flex items-center gap-2 text-offwhite/80">
            {/* Icon based on service type or category */}
            {service.category === 'photo' && <Camera className="h-3.5 w-3.5 text-gold-light shrink-0" />}
            {service.category === 'video' && <Video className="h-3.5 w-3.5 text-gold-light shrink-0" />}
            {service.category === 'mapping' && <Layers className="h-3.5 w-3.5 text-gold-light shrink-0" />}
            {service.category === 'inspection' && <Box className="h-3.5 w-3.5 text-gold-light shrink-0" />}
            {(!service.category || service.category === 'other') && <Send className="h-3.5 w-3.5 text-gold-light shrink-0" />}
            
            <span>{service.name}</span>
            
            {/* Show star indicator for primary service */}
            {isPrimary && (
              <span className="text-xs text-gold ml-1 flex items-center">
                <Star className="h-3 w-3 inline fill-gold stroke-gold" />
                <span className="ml-0.5">Primary</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ClientProjects;