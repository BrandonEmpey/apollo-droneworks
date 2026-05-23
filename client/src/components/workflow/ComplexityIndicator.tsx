import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Clock, 
  Users, 
  Wrench, 
  AlertTriangle, 
  TrendingUp, 
  Cloud,
  MapPin,
  Calendar
} from "lucide-react";

export interface ComplexityFactors {
  duration: number; // hours
  teamSize: number;
  specializedEquipment: boolean;
  weatherDependency: boolean;
  locationComplexity: "low" | "medium" | "high";
  riskLevel: "low" | "medium" | "high" | "critical";
  dependencies: number;
  timeConstraints: "flexible" | "scheduled" | "urgent" | "critical";
}

export interface ComplexityAssessment {
  level: "low" | "medium" | "high" | "critical";
  score: number; // 0-100
  factors: ComplexityFactors;
  recommendations: string[];
  estimatedCost: number;
  riskMitigation: string[];
}

interface ComplexityIndicatorProps {
  assessment: ComplexityAssessment;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
  showTooltip?: boolean;
}

const getComplexityConfig = (level: string) => {
  switch (level) {
    case "low":
      return {
        color: "bg-green-500",
        bgColor: "bg-green-50",
        textColor: "text-green-800",
        borderColor: "border-green-200",
        label: "Low Complexity",
        description: "Simple, routine operation"
      };
    case "medium":
      return {
        color: "bg-yellow-500",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-800",
        borderColor: "border-yellow-200",
        label: "Medium Complexity",
        description: "Moderate planning required"
      };
    case "high":
      return {
        color: "bg-orange-500",
        bgColor: "bg-orange-50",
        textColor: "text-orange-800",
        borderColor: "border-orange-200",
        label: "High Complexity",
        description: "Specialized resources needed"
      };
    case "critical":
      return {
        color: "bg-red-500",
        bgColor: "bg-red-50",
        textColor: "text-red-800",
        borderColor: "border-red-200",
        label: "Critical Complexity",
        description: "Maximum resources and planning"
      };
    default:
      return {
        color: "bg-gray-500",
        bgColor: "bg-gray-50",
        textColor: "text-gray-800",
        borderColor: "border-gray-200",
        label: "Unknown",
        description: "Assessment pending"
      };
  }
};

const getRiskConfig = (level: string) => {
  switch (level) {
    case "low": return { icon: "🟢", label: "Low Risk" };
    case "medium": return { icon: "🟡", label: "Medium Risk" };
    case "high": return { icon: "🟠", label: "High Risk" };
    case "critical": return { icon: "🔴", label: "Critical Risk" };
    default: return { icon: "⚪", label: "Unknown" };
  }
};

const getTimeConstraintConfig = (constraint: string) => {
  switch (constraint) {
    case "flexible": return { color: "text-green-600", label: "Flexible Timeline" };
    case "scheduled": return { color: "text-blue-600", label: "Scheduled" };
    case "urgent": return { color: "text-orange-600", label: "Urgent" };
    case "critical": return { color: "text-red-600", label: "Critical Timeline" };
    default: return { color: "text-gray-600", label: "Unknown" };
  }
};

export function ComplexityIndicator({ 
  assessment, 
  size = "md", 
  showDetails = false,
  showTooltip = true 
}: ComplexityIndicatorProps) {
  const config = getComplexityConfig(assessment.level);
  const riskConfig = getRiskConfig(assessment.factors.riskLevel);
  const timeConfig = getTimeConstraintConfig(assessment.factors.timeConstraints);

  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-6 h-6"
  };

  const badgeSize = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-2"
  };

  const ComplexityBadge = () => (
    <Badge 
      className={`${config.bgColor} ${config.textColor} ${config.borderColor} border ${badgeSize[size]} font-medium`}
    >
      <div className={`${config.color} ${sizeClasses[size]} rounded-full mr-2`}></div>
      {config.label}
      <span className="ml-2 font-normal">({assessment.score}/100)</span>
    </Badge>
  );

  const DetailedView = () => (
    <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`${config.color} w-6 h-6 rounded-full`}></div>
            <div>
              <h3 className={`font-semibold ${config.textColor}`}>{config.label}</h3>
              <p className="text-sm text-gray-600">{config.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${config.textColor}`}>{assessment.score}</div>
            <div className="text-sm text-gray-500">Complexity Score</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Duration: {assessment.factors.duration}h</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Team Size: {assessment.factors.teamSize} members</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-gray-500" />
              <span className="text-sm">
                Equipment: {assessment.factors.specializedEquipment ? "Specialized" : "Standard"}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-gray-500" />
              <span className="text-sm">
                Weather: {assessment.factors.weatherDependency ? "Dependent" : "Independent"}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Location: {assessment.factors.locationComplexity}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gray-500" />
              <span className="text-sm">{riskConfig.icon} {riskConfig.label}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Dependencies: {assessment.factors.dependencies}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className={`text-sm ${timeConfig.color}`}>{timeConfig.label}</span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-medium text-gray-800 mb-2">Estimated Cost</h4>
          <div className={`text-lg font-semibold ${config.textColor}`}>
            ${assessment.estimatedCost.toLocaleString()}
          </div>
        </div>

        {assessment.recommendations.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-800 mb-2">Recommendations</h4>
            <ul className="space-y-1">
              {assessment.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {assessment.riskMitigation.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Risk Mitigation</h4>
            <ul className="space-y-1">
              {assessment.riskMitigation.map((risk, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const tooltipContent = (
    <div className="max-w-xs p-2">
      <div className="font-medium mb-2">{config.label}</div>
      <div className="text-sm space-y-1">
        <div>Score: {assessment.score}/100</div>
        <div>Duration: {assessment.factors.duration}h</div>
        <div>Team: {assessment.factors.teamSize} members</div>
        <div>Risk: {riskConfig.label}</div>
        <div>Cost: ${assessment.estimatedCost.toLocaleString()}</div>
      </div>
    </div>
  );

  if (showDetails) {
    return <DetailedView />;
  }

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-block">
              <ComplexityBadge />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <ComplexityBadge />;
}

// Utility function to calculate complexity assessment
export function calculateComplexityAssessment(factors: ComplexityFactors): ComplexityAssessment {
  let score = 0;
  
  // Duration scoring (0-25 points)
  if (factors.duration <= 2) score += 5;
  else if (factors.duration <= 8) score += 10;
  else if (factors.duration <= 24) score += 18;
  else score += 25;

  // Team size scoring (0-20 points)
  if (factors.teamSize === 1) score += 5;
  else if (factors.teamSize <= 3) score += 10;
  else if (factors.teamSize <= 6) score += 15;
  else score += 20;

  // Equipment scoring (0-15 points)
  score += factors.specializedEquipment ? 15 : 5;

  // Weather dependency (0-10 points)
  score += factors.weatherDependency ? 10 : 2;

  // Location complexity (0-10 points)
  switch (factors.locationComplexity) {
    case "low": score += 2; break;
    case "medium": score += 6; break;
    case "high": score += 10; break;
  }

  // Risk level (0-10 points)
  switch (factors.riskLevel) {
    case "low": score += 2; break;
    case "medium": score += 5; break;
    case "high": score += 8; break;
    case "critical": score += 10; break;
  }

  // Dependencies (0-5 points)
  score += Math.min(factors.dependencies, 5);

  // Time constraints (0-5 points)
  switch (factors.timeConstraints) {
    case "flexible": score += 1; break;
    case "scheduled": score += 2; break;
    case "urgent": score += 4; break;
    case "critical": score += 5; break;
  }

  // Determine complexity level
  let level: "low" | "medium" | "high" | "critical";
  if (score <= 25) level = "low";
  else if (score <= 50) level = "medium";
  else if (score <= 75) level = "high";
  else level = "critical";

  // Generate recommendations based on factors
  const recommendations: string[] = [];
  if (factors.duration > 8) recommendations.push("Consider breaking into smaller phases");
  if (factors.teamSize > 4) recommendations.push("Assign dedicated team lead for coordination");
  if (factors.specializedEquipment) recommendations.push("Schedule equipment availability checks");
  if (factors.weatherDependency) recommendations.push("Monitor weather conditions closely");
  if (factors.riskLevel === "high" || factors.riskLevel === "critical") {
    recommendations.push("Conduct thorough risk assessment");
  }

  // Generate risk mitigation strategies
  const riskMitigation: string[] = [];
  if (factors.weatherDependency) riskMitigation.push("Prepare backup indoor alternatives");
  if (factors.specializedEquipment) riskMitigation.push("Have backup equipment ready");
  if (factors.locationComplexity === "high") riskMitigation.push("Conduct site survey beforehand");
  if (factors.timeConstraints === "critical") riskMitigation.push("Assign priority resource allocation");

  // Calculate estimated cost (base $500 + complexity factors)
  const baseCost = 500;
  const durationCost = factors.duration * 150;
  const teamCost = factors.teamSize * 200;
  const equipmentCost = factors.specializedEquipment ? 1000 : 200;
  const riskPremium = factors.riskLevel === "critical" ? 500 : 
                     factors.riskLevel === "high" ? 300 : 0;
  
  const estimatedCost = baseCost + durationCost + teamCost + equipmentCost + riskPremium;

  return {
    level,
    score,
    factors,
    recommendations,
    estimatedCost,
    riskMitigation
  };
}