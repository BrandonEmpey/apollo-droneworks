import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Users,
  Calendar,
  ArrowRight,
  ArrowDown
} from "lucide-react";

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: "pending" | "active" | "completed" | "blocked";
  complexity: "low" | "medium" | "high" | "critical";
  estimatedHours: number;
  actualHours?: number;
  assignedTo: string[];
  dependencies: string[];
  position: { x: number; y: number };
  completionPercentage: number;
}

interface WorkflowVisualizationProps {
  workflowId: string;
  steps: WorkflowStep[];
  onStepClick?: (step: WorkflowStep) => void;
  onStepUpdate?: (stepId: string, updates: Partial<WorkflowStep>) => void;
}

const getComplexityColor = (complexity: string) => {
  switch (complexity) {
    case "low": return "bg-green-100 text-green-800 border-green-200";
    case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "high": return "bg-orange-100 text-orange-800 border-orange-200";
    case "critical": return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending": return "bg-gray-100 text-gray-600";
    case "active": return "bg-blue-100 text-blue-800";
    case "completed": return "bg-green-100 text-green-800";
    case "blocked": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-600";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending": return <Clock className="w-4 h-4" />;
    case "active": return <Play className="w-4 h-4" />;
    case "completed": return <CheckCircle className="w-4 h-4" />;
    case "blocked": return <AlertTriangle className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

export function WorkflowVisualization({ 
  workflowId, 
  steps, 
  onStepClick, 
  onStepUpdate 
}: WorkflowVisualizationProps) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"flow" | "timeline">("flow");
  const svgRef = useRef<SVGSVGElement>(null);

  const handleStepClick = (step: WorkflowStep) => {
    setSelectedStep(step.id);
    onStepClick?.(step);
  };

  const renderConnections = () => {
    return steps.map(step => 
      step.dependencies.map(depId => {
        const depStep = steps.find(s => s.id === depId);
        if (!depStep) return null;

        return (
          <line
            key={`${depId}-${step.id}`}
            x1={depStep.position.x + 150}
            y1={depStep.position.y + 60}
            x2={step.position.x}
            y2={step.position.y + 60}
            stroke="#94a3b8"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
            className="transition-all duration-300 hover:stroke-blue-500"
          />
        );
      })
    ).filter(Boolean);
  };

  const renderFlowView = () => (
    <div className="relative w-full h-[600px] overflow-auto border rounded-lg bg-gray-50">
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 800"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#94a3b8"
            />
          </marker>
        </defs>
        {renderConnections()}
      </svg>

      {steps.map(step => (
        <div
          key={step.id}
          className={`absolute cursor-pointer transition-all duration-300 hover:scale-105 ${
            selectedStep === step.id ? 'ring-2 ring-blue-500' : ''
          }`}
          style={{
            left: step.position.x,
            top: step.position.y,
            width: '300px'
          }}
          onClick={() => handleStepClick(step)}
        >
          <Card className={`shadow-lg ${getComplexityColor(step.complexity)} border-2`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{step.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(step.status)}>
                    {getStatusIcon(step.status)}
                    <span className="ml-1">{step.status}</span>
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-gray-600 mb-2">{step.description}</p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Progress</span>
                  <span>{step.completionPercentage}%</span>
                </div>
                <Progress value={step.completionPercentage} className="h-2" />
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{step.estimatedHours}h est.</span>
                    {step.actualHours && (
                      <span className="text-gray-500">({step.actualHours}h actual)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{step.assignedTo.length}</span>
                  </div>
                </div>

                {step.assignedTo.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {step.assignedTo.slice(0, 3).map(person => (
                      <Badge key={person} variant="outline" className="text-xs">
                        {person}
                      </Badge>
                    ))}
                    {step.assignedTo.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{step.assignedTo.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );

  const renderTimelineView = () => (
    <div className="space-y-4">
      {steps
        .sort((a, b) => a.position.y - b.position.y)
        .map((step, index) => (
          <div key={step.id} className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full border-2 ${
                step.status === 'completed' ? 'bg-green-500 border-green-500' :
                step.status === 'active' ? 'bg-blue-500 border-blue-500' :
                'bg-gray-300 border-gray-300'
              }`} />
              {index < steps.length - 1 && (
                <div className="w-0.5 h-8 bg-gray-300 mt-2" />
              )}
            </div>

            <Card 
              className={`flex-1 cursor-pointer transition-all duration-300 hover:shadow-md ${
                selectedStep === step.id ? 'ring-2 ring-blue-500' : ''
              } ${getComplexityColor(step.complexity)} border-l-4`}
              onClick={() => handleStepClick(step)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{step.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(step.status)}>
                      {getStatusIcon(step.status)}
                      <span className="ml-1">{step.status}</span>
                    </Badge>
                    <Badge variant="outline">
                      {step.complexity}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Progress:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={step.completionPercentage} className="h-2 flex-1" />
                      <span className="text-xs">{step.completionPercentage}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-gray-500">Time:</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{step.estimatedHours}h</span>
                      {step.actualHours && (
                        <span className="text-gray-500">({step.actualHours}h)</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-gray-500">Team:</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Users className="w-3 h-3" />
                      <span>{step.assignedTo.length} members</span>
                    </div>
                  </div>
                </div>

                {step.assignedTo.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {step.assignedTo.map(person => (
                      <Badge key={person} variant="secondary" className="text-xs">
                        {person}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Visualization</h2>
          <p className="text-gray-600">Interactive workflow progress and complexity indicators</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "flow" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("flow")}
          >
            Flow View
          </Button>
          <Button
            variant={viewMode === "timeline" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("timeline")}
          >
            Timeline View
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2"></div>
            <div className="text-sm font-medium">Low Complexity</div>
            <div className="text-xs text-gray-600">1-2 hours, single operator</div>
          </CardContent>
        </Card>
        
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 text-center">
            <div className="w-4 h-4 bg-yellow-500 rounded-full mx-auto mb-2"></div>
            <div className="text-sm font-medium">Medium Complexity</div>
            <div className="text-xs text-gray-600">Half-day, 2-3 members</div>
          </CardContent>
        </Card>
        
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="w-4 h-4 bg-orange-500 rounded-full mx-auto mb-2"></div>
            <div className="text-sm font-medium">High Complexity</div>
            <div className="text-xs text-gray-600">Multi-day, specialized equipment</div>
          </CardContent>
        </Card>
        
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <div className="w-4 h-4 bg-red-500 rounded-full mx-auto mb-2"></div>
            <div className="text-sm font-medium">Critical Complexity</div>
            <div className="text-xs text-gray-600">Extended timeline, multiple departments</div>
          </CardContent>
        </Card>
      </div>

      {viewMode === "flow" ? renderFlowView() : renderTimelineView()}
    </div>
  );
}