import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { 
  PlayCircle, 
  PauseCircle, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  Settings,
  Users,
  TrendingUp,
  Clock,
  BarChart3,
  FileText,
  Plus,
  Edit,
  Trash2
} from "lucide-react";

interface WorkflowTemplate {
  id: number;
  name: string;
  description: string;
  steps: Array<{
    id: string;
    name: string;
    description: string;
    assignedRole: string;
    estimatedDuration: number;
    dependencies: string[];
    autoComplete: boolean;
  }>;
  serviceType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProjectTracking {
  id: number;
  projectId: number;
  phase: string;
  status: string;
  progressPercentage: number;
  estimatedCompletion: string;
  actualCompletion?: string;
  milestones?: Array<{
    id: string;
    name: string;
    dueDate: string;
    completed: boolean;
    completedAt?: string;
  }>;
  blockers?: Array<{
    id: string;
    description: string;
    severity: string;
    createdAt: string;
    resolvedAt?: string;
  }>;
  lastUpdate: string;
  createdAt: string;
}

interface PerformanceMetric {
  id: number;
  metricType: string;
  value: number;
  unit: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  projectId?: number;
  serviceId?: number;
  clientId?: number;
  metadata?: any;
  createdAt: string;
}

export default function OperationalEfficiency() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [workflowForm, setWorkflowForm] = useState({
    name: "",
    description: "",
    serviceType: "",
    steps: [{ id: "", name: "", description: "", assignedRole: "", estimatedDuration: 30, dependencies: [] as string[], autoComplete: false }]
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch operational data
  const { data: dashboardSummary, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["/api/operational/dashboard-summary"],
  });

  const { data: workflowTemplates, isLoading: isTemplatesLoading } = useQuery({
    queryKey: ["/api/operational/workflow-templates"],
  });

  const { data: performanceMetrics, isLoading: isMetricsLoading } = useQuery({
    queryKey: ["/api/operational/performance-metrics"],
  });

  const { data: operationalAlerts, isLoading: isAlertsLoading } = useQuery({
    queryKey: ["/api/operational/alerts"],
  });

  // Handler functions
  const handleEditTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setIsEditMode(true);
    setWorkflowForm({
      name: template.name,
      description: template.description,
      serviceType: template.serviceType,
      steps: template.steps || [{ id: "", name: "", description: "", assignedRole: "", estimatedDuration: 30, dependencies: [] as string[], autoComplete: false }]
    });
    setIsWorkflowDialogOpen(true);
  };

  const handleCreateNewTemplate = () => {
    setSelectedTemplate(null);
    setIsEditMode(false);
    setWorkflowForm({
      name: "",
      description: "",
      serviceType: "",
      steps: [{ id: "", name: "", description: "", assignedRole: "", estimatedDuration: 30, dependencies: [], autoComplete: false }]
    });
    setIsWorkflowDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    const templateData = {
      name: workflowForm.name,
      description: workflowForm.description,
      serviceType: workflowForm.serviceType,
      steps: workflowForm.steps,
      isActive: true
    };

    if (isEditMode && selectedTemplate) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, templateData });
    } else {
      createTemplateMutation.mutate(templateData);
    }
  };

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      return apiRequest("POST", "/api/operational/workflow-templates", templateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operational/workflow-templates"] });
      setIsWorkflowDialogOpen(false);
      setIsEditMode(false);
      setWorkflowForm({
        name: "",
        description: "",
        serviceType: "",
        steps: [{ id: "", name: "", description: "", assignedRole: "", estimatedDuration: 30, dependencies: [], autoComplete: false }]
      });
      toast({
        title: "Success",
        description: "Workflow template created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create workflow template",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, templateData }: { id: number; templateData: any }) => {
      return apiRequest("PUT", `/api/operational/workflow-templates/${id}`, templateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operational/workflow-templates"] });
      setIsWorkflowDialogOpen(false);
      setIsEditMode(false);
      setSelectedTemplate(null);
      setWorkflowForm({
        name: "",
        description: "",
        serviceType: "",
        steps: [{ id: "", name: "", description: "", assignedRole: "", estimatedDuration: 30, dependencies: [], autoComplete: false }]
      });
      toast({
        title: "Success",
        description: "Workflow template updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workflow template",
        variant: "destructive",
      });
    },
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest(`/api/operational/alerts/${alertId}/acknowledge`, "PUT");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operational/alerts"] });
      toast({
        title: "Success",
        description: "Alert acknowledged",
      });
    },
  });

  const handleCreateTemplate = (formData: FormData) => {
    const templateData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      serviceType: formData.get("serviceType") as string,
      steps: [
        {
          id: "step1",
          name: "Initial Setup",
          description: "Project initialization and setup",
          assignedRole: "Project Manager",
          estimatedDuration: 60,
          dependencies: [],
          autoComplete: false,
        },
        {
          id: "step2",
          name: "Execution",
          description: "Main project execution phase",
          assignedRole: "Operator",
          estimatedDuration: 240,
          dependencies: ["step1"],
          autoComplete: false,
        },
        {
          id: "step3",
          name: "Review & Delivery",
          description: "Quality review and client delivery",
          assignedRole: "Quality Assurance",
          estimatedDuration: 90,
          dependencies: ["step2"],
          autoComplete: false,
        },
      ],
    };

    createTemplateMutation.mutate(templateData);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "on_track":
        return "bg-green-500";
      case "in_progress":
      case "active":
        return "bg-blue-500";
      case "delayed":
      case "at_risk":
        return "bg-yellow-500";
      case "critical":
      case "overdue":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "low":
        return "bg-blue-100 text-blue-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isDashboardLoading) {
    return <div className="flex items-center justify-center h-64">Loading operational dashboard...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operational Efficiency</h1>
          <p className="text-muted-foreground">
            Streamline workflows, track performance, and optimize operations
          </p>
        </div>
        <Button onClick={handleCreateNewTemplate}>
          <Plus className="w-4 h-4 mr-2" />
          New Workflow Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="tracking">Project Tracking</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(dashboardSummary as any)?.metrics?.filter((m: any) => m.metricType === 'project_completion').length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.2 days</div>
                <p className="text-xs text-muted-foreground">
                  -0.3 days from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Equipment Utilization</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87%</div>
                <p className="text-xs text-muted-foreground">
                  +5% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Client Satisfaction</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.8/5</div>
                <p className="text-xs text-muted-foreground">
                  +0.2 from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Active Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Active Alerts
              </CardTitle>
              <CardDescription>
                Critical operational issues requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(operationalAlerts as any[])?.slice(0, 5).map((alert: any) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <div>
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                      disabled={alert.isAcknowledged}
                    >
                      {alert.isAcknowledged ? "Acknowledged" : "Acknowledge"}
                    </Button>
                  </div>
                ))}
                {(!(operationalAlerts as any[]) || (operationalAlerts as any[]).length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    No active alerts
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Maintenance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Maintenance
              </CardTitle>
              <CardDescription>
                Scheduled equipment maintenance this week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(dashboardSummary as any)?.upcomingMaintenance?.map((maintenance: any) => (
                  <div key={maintenance.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{maintenance.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {maintenance.equipmentId} - {new Date(maintenance.scheduledDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(maintenance.status)}>
                      {maintenance.status}
                    </Badge>
                  </div>
                ))}
                {(!(dashboardSummary as any)?.upcomingMaintenance || (dashboardSummary as any).upcomingMaintenance.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    No upcoming maintenance scheduled
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Templates</CardTitle>
              <CardDescription>
                Manage standardized workflows for different service types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(workflowTemplates as WorkflowTemplate[])?.map((template: WorkflowTemplate) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Service Type:</span>
                          <span className="font-medium">{template.serviceType}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Steps:</span>
                          <span className="font-medium">{template.steps.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Status:</span>
                          <Badge variant={template.isActive ? "default" : "secondary"}>
                            {template.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Template</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this workflow template? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(!(workflowTemplates as WorkflowTemplate[]) || (workflowTemplates as WorkflowTemplate[]).length === 0) && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No workflow templates created yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Project Tracking</CardTitle>
              <CardDescription>
                Monitor project progress, milestones, and potential blockers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  Project tracking interface coming soon. This will display active projects with real-time progress updates, milestone tracking, and blocker identification.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Scheduling</CardTitle>
              <CardDescription>
                Optimize equipment allocation and schedule maintenance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  Equipment scheduling interface coming soon. This will display equipment availability calendars, scheduling conflicts, and maintenance tracking.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>
                Track key performance indicators and operational metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(performanceMetrics as PerformanceMetric[])?.slice(0, 6).map((metric: PerformanceMetric) => (
                  <Card key={metric.id}>
                    <CardHeader>
                      <CardTitle className="text-lg capitalize">
                        {metric.metricType.replace(/_/g, " ")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {metric.value}
                        {metric.unit && (
                          <span className="text-lg font-normal ml-1">{metric.unit}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        {metric.period} - {new Date(metric.periodStart).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {(!(performanceMetrics as PerformanceMetric[]) || (performanceMetrics as PerformanceMetric[]).length === 0) && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No performance metrics available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Workflow Template Dialog */}
      <Dialog open={isWorkflowDialogOpen} onOpenChange={setIsWorkflowDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Workflow Template' : 'Create Workflow Template'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update the workflow template and its steps' : 'Create a standardized workflow with detailed steps for your service process'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSaveTemplate();
          }}>
            <div className="grid gap-6 py-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={workflowForm.name}
                    onChange={(e) => setWorkflowForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Real Estate Photography Workflow"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceType">Service Type</Label>
                  <Select 
                    value={workflowForm.serviceType} 
                    onValueChange={(value) => setWorkflowForm(prev => ({ ...prev, serviceType: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="real_estate">Real Estate Photography</SelectItem>
                      <SelectItem value="construction">Construction Monitoring</SelectItem>
                      <SelectItem value="inspection">Equipment Inspection</SelectItem>
                      <SelectItem value="mapping">Aerial Mapping</SelectItem>
                      <SelectItem value="event">Event Coverage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={workflowForm.description}
                  onChange={(e) => setWorkflowForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this workflow and when to use it"
                  rows={2}
                />
              </div>

              {/* Workflow Steps */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Workflow Steps</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newStep = {
                        id: `step_${Date.now()}`,
                        name: "",
                        description: "",
                        assignedRole: "",
                        estimatedDuration: 30,
                        dependencies: [],
                        autoComplete: false
                      };
                      setWorkflowForm(prev => ({
                        ...prev,
                        steps: [...prev.steps, newStep]
                      }));
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Step
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {workflowForm.steps.map((step, index) => (
                    <Card key={step.id || index} className="p-4">
                      <div className="grid gap-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Step {index + 1}</Badge>
                          {workflowForm.steps.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setWorkflowForm(prev => ({
                                  ...prev,
                                  steps: prev.steps.filter((_, i) => i !== index)
                                }));
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Step Name</Label>
                            <Input
                              value={step.name}
                              onChange={(e) => {
                                const newSteps = [...workflowForm.steps];
                                newSteps[index] = { ...step, name: e.target.value };
                                setWorkflowForm(prev => ({ ...prev, steps: newSteps }));
                              }}
                              placeholder="e.g., Site Assessment"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Assigned Role</Label>
                            <Select
                              value={step.assignedRole}
                              onValueChange={(value) => {
                                const newSteps = [...workflowForm.steps];
                                newSteps[index] = { ...step, assignedRole: value };
                                setWorkflowForm(prev => ({ ...prev, steps: newSteps }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Project Manager">Project Manager</SelectItem>
                                <SelectItem value="Pilot">Pilot</SelectItem>
                                <SelectItem value="Editor">Editor</SelectItem>
                                <SelectItem value="Technician">Technician</SelectItem>
                                <SelectItem value="Safety Officer">Safety Officer</SelectItem>
                                <SelectItem value="Analyst">Analyst</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Step Description</Label>
                          <Textarea
                            value={step.description}
                            onChange={(e) => {
                              const newSteps = [...workflowForm.steps];
                              newSteps[index] = { ...step, description: e.target.value };
                              setWorkflowForm(prev => ({ ...prev, steps: newSteps }));
                            }}
                            placeholder="Detailed description of what needs to be done in this step"
                            rows={2}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Estimated Duration (minutes)</Label>
                            <Input
                              type="number"
                              value={step.estimatedDuration}
                              onChange={(e) => {
                                const newSteps = [...workflowForm.steps];
                                newSteps[index] = { ...step, estimatedDuration: parseInt(e.target.value) || 0 };
                                setWorkflowForm(prev => ({ ...prev, steps: newSteps }));
                              }}
                              min="1"
                              placeholder="30"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={step.autoComplete}
                                onChange={(e) => {
                                  const newSteps = [...workflowForm.steps];
                                  newSteps[index] = { ...step, autoComplete: e.target.checked };
                                  setWorkflowForm(prev => ({ ...prev, steps: newSteps }));
                                }}
                              />
                              Auto-complete when dependencies are met
                            </Label>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsWorkflowDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}>
                {(createTemplateMutation.isPending || updateTemplateMutation.isPending) ? 
                  (isEditMode ? "Updating..." : "Creating...") : 
                  (isEditMode ? "Update Template" : "Create Template")
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}