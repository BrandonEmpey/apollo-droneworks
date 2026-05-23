import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowVisualization } from "@/components/workflow/WorkflowVisualization";
import { ComplexityIndicator, calculateComplexityAssessment } from "@/components/workflow/ComplexityIndicator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Filter
} from "lucide-react";

export default function WorkflowManagement() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"overview" | "details">("overview");

  // Sample workflow data with complexity assessments
  const sampleWorkflows = [
    {
      id: "wf-001",
      name: "Real Estate Photography",
      description: "Standard property photography workflow",
      steps: [
        {
          id: "step-1",
          name: "Site Survey",
          description: "Initial site assessment and planning",
          status: "completed" as const,
          complexity: "low" as const,
          estimatedHours: 1,
          actualHours: 0.8,
          assignedTo: ["John Doe"],
          dependencies: [],
          position: { x: 50, y: 50 },
          completionPercentage: 100
        },
        {
          id: "step-2",
          name: "Equipment Setup",
          description: "Drone preparation and camera calibration",
          status: "completed" as const,
          complexity: "medium" as const,
          estimatedHours: 2,
          actualHours: 1.5,
          assignedTo: ["John Doe", "Tech Support"],
          dependencies: ["step-1"],
          position: { x: 400, y: 50 },
          completionPercentage: 100
        },
        {
          id: "step-3",
          name: "Aerial Photography",
          description: "Capture aerial shots of property",
          status: "active" as const,
          complexity: "high" as const,
          estimatedHours: 4,
          actualHours: 2,
          assignedTo: ["John Doe", "Safety Officer"],
          dependencies: ["step-2"],
          position: { x: 750, y: 50 },
          completionPercentage: 60
        },
        {
          id: "step-4",
          name: "Post Processing",
          description: "Edit and enhance captured footage",
          status: "pending" as const,
          complexity: "medium" as const,
          estimatedHours: 3,
          assignedTo: ["Editor Team"],
          dependencies: ["step-3"],
          position: { x: 400, y: 250 },
          completionPercentage: 0
        },
        {
          id: "step-5",
          name: "Client Delivery",
          description: "Final review and delivery to client",
          status: "pending" as const,
          complexity: "low" as const,
          estimatedHours: 1,
          assignedTo: ["Project Manager"],
          dependencies: ["step-4"],
          position: { x: 750, y: 250 },
          completionPercentage: 0
        }
      ]
    },
    {
      id: "wf-002",
      name: "Infrastructure Inspection",
      description: "Critical infrastructure assessment workflow",
      steps: [
        {
          id: "step-1",
          name: "Safety Briefing",
          description: "Team safety protocols and equipment check",
          status: "completed" as const,
          complexity: "medium" as const,
          estimatedHours: 2,
          actualHours: 2,
          assignedTo: ["Safety Team", "Inspection Team"],
          dependencies: [],
          position: { x: 50, y: 50 },
          completionPercentage: 100
        },
        {
          id: "step-2",
          name: "Specialized Equipment Setup",
          description: "Deploy thermal and structural analysis equipment",
          status: "active" as const,
          complexity: "critical" as const,
          estimatedHours: 6,
          actualHours: 3,
          assignedTo: ["Tech Specialist", "Engineer", "Safety Officer"],
          dependencies: ["step-1"],
          position: { x: 400, y: 50 },
          completionPercentage: 50
        },
        {
          id: "step-3",
          name: "Structural Analysis",
          description: "Detailed structural integrity assessment",
          status: "pending" as const,
          complexity: "critical" as const,
          estimatedHours: 8,
          assignedTo: ["Lead Engineer", "Drone Pilot", "Data Analyst"],
          dependencies: ["step-2"],
          position: { x: 750, y: 50 },
          completionPercentage: 0
        }
      ]
    }
  ];

  const { data: workflowTemplates } = useQuery({
    queryKey: ["/api/operational/workflow-templates"]
  });

  const { data: performanceMetrics } = useQuery({
    queryKey: ["/api/operational/performance-metrics"]
  });

  // Calculate complexity assessments for workflows
  const workflowComplexityAssessments = sampleWorkflows.map(workflow => {
    const totalSteps = workflow.steps.length;
    const avgDuration = workflow.steps.reduce((sum, step) => sum + step.estimatedHours, 0) / totalSteps;
    const maxTeamSize = Math.max(...workflow.steps.map(step => step.assignedTo.length));
    const hasSpecializedEquipment = workflow.steps.some(step => step.complexity === "critical");
    const hasHighComplexity = workflow.steps.some(step => step.complexity === "high" || step.complexity === "critical");

    const complexityFactors = {
      duration: workflow.steps.reduce((sum, step) => sum + step.estimatedHours, 0),
      teamSize: maxTeamSize,
      specializedEquipment: hasSpecializedEquipment,
      weatherDependency: workflow.name.includes("Aerial") || workflow.name.includes("Outdoor"),
      locationComplexity: hasHighComplexity ? "high" as const : "medium" as const,
      riskLevel: hasSpecializedEquipment ? "critical" as const : "medium" as const,
      dependencies: workflow.steps.reduce((sum, step) => sum + step.dependencies.length, 0),
      timeConstraints: workflow.name.includes("Critical") ? "critical" as const : "scheduled" as const
    };

    return {
      workflowId: workflow.id,
      assessment: calculateComplexityAssessment(complexityFactors)
    };
  });

  const handleStepClick = (step: any) => {
    console.log("Step clicked:", step);
  };

  const getWorkflowProgress = (workflow: any) => {
    const totalSteps = workflow.steps.length;
    const completedSteps = workflow.steps.filter((step: any) => step.status === "completed").length;
    return Math.round((completedSteps / totalSteps) * 100);
  };

  const getWorkflowStatus = (workflow: any) => {
    const hasActive = workflow.steps.some((step: any) => step.status === "active");
    const hasBlocked = workflow.steps.some((step: any) => step.status === "blocked");
    const allCompleted = workflow.steps.every((step: any) => step.status === "completed");

    if (allCompleted) return { status: "completed", color: "text-green-600" };
    if (hasBlocked) return { status: "blocked", color: "text-red-600" };
    if (hasActive) return { status: "active", color: "text-blue-600" };
    return { status: "pending", color: "text-gray-600" };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Management</h1>
          <p className="text-gray-600">Interactive workflow visualization with smart complexity indicators</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Workflow
          </Button>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "overview" | "details")}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Detailed View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Workflow Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sampleWorkflows.length}</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
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
                <CardTitle className="text-sm font-medium">Avg. Complexity</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Medium</div>
                <p className="text-xs text-muted-foreground">
                  Stable this period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Active Workflows List */}
          <Card>
            <CardHeader>
              <CardTitle>Active Workflows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sampleWorkflows.map((workflow) => {
                const progress = getWorkflowProgress(workflow);
                const workflowStatus = getWorkflowStatus(workflow);
                const complexityAssessment = workflowComplexityAssessments.find(
                  w => w.workflowId === workflow.id
                )?.assessment;

                return (
                  <div
                    key={workflow.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedWorkflow(workflow.id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{workflow.name}</h3>
                        <Badge className={workflowStatus.color}>
                          {workflowStatus.status}
                        </Badge>
                        {complexityAssessment && (
                          <ComplexityIndicator 
                            assessment={complexityAssessment}
                            size="sm"
                            showTooltip={true}
                          />
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {workflow.steps.length} steps
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">
                            {new Set(workflow.steps.flatMap(step => step.assignedTo)).size} members
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">
                            {workflow.steps.reduce((sum, step) => sum + step.estimatedHours, 0)}h estimated
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="w-24 h-2" />
                        <span className="text-sm font-medium">{progress}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          {selectedWorkflow ? (
            <div className="space-y-6">
              {/* Selected Workflow Details */}
              {(() => {
                const workflow = sampleWorkflows.find(w => w.id === selectedWorkflow);
                const complexityAssessment = workflowComplexityAssessments.find(
                  w => w.workflowId === selectedWorkflow
                )?.assessment;

                if (!workflow) return null;

                return (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold">{workflow.name}</h2>
                        <p className="text-gray-600">{workflow.description}</p>
                      </div>
                      {complexityAssessment && (
                        <ComplexityIndicator 
                          assessment={complexityAssessment}
                          size="lg"
                          showDetails={true}
                        />
                      )}
                    </div>

                    <WorkflowVisualization
                      workflowId={workflow.id}
                      steps={workflow.steps}
                      onStepClick={handleStepClick}
                    />
                  </div>
                );
              })()}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-medium mb-2">Select a Workflow</h3>
                <p className="text-gray-600">
                  Choose a workflow from the overview tab to view detailed visualization
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}