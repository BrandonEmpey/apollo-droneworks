import React, { useState } from "react";
import { differenceInDays, format, isFuture, isPast, parseISO } from "date-fns";
import { 
  AlertCircle, 
  Calendar, 
  CheckCircle, 
  Clock, 
  FileText,
  MoreHorizontal
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// Define milestone type
type ProjectMilestone = {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  date: string | Date;
  status: string;
  type: string;
  fileIds: number[] | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

interface ProjectMilestoneTimelineProps {
  milestones: ProjectMilestone[];
  selectedMilestone?: number;
  onSelectMilestone?: (id: number) => void;
  onUpdateStatus?: (id: number, status: string) => void;
}

const ProjectMilestoneTimeline: React.FC<ProjectMilestoneTimelineProps> = ({
  milestones,
  selectedMilestone,
  onSelectMilestone,
  onUpdateStatus,
}) => {
  // Sort milestones by date
  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Get the earliest and latest dates to calculate timeline span
  const earliestDate = sortedMilestones.length > 0 
    ? new Date(sortedMilestones[0].date) 
    : new Date();
  
  const latestDate = sortedMilestones.length > 0 
    ? new Date(sortedMilestones[sortedMilestones.length - 1].date) 
    : new Date();

  const totalDays = differenceInDays(latestDate, earliestDate) + 1;

  // Get milestone type icon
  const getMilestoneTypeIcon = (type: string) => {
    switch (type) {
      case "deliverable":
        return <FileText className="h-4 w-4" />;
      case "meeting":
        return <Clock className="h-4 w-4" />;
      case "payment":
        return <AlertCircle className="h-4 w-4" />;
      case "milestone":
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  // Get status-based styling
  const getStatusStyling = (status: string, date: string | Date) => {
    const dateObj = new Date(date);
    
    switch (status) {
      case "completed":
        return {
          bgColor: "bg-green-500",
          borderColor: "border-green-600",
          textColor: "text-white",
          dotColor: "bg-green-500"
        };
      case "in-progress":
        return {
          bgColor: "bg-blue-500",
          borderColor: "border-blue-600",
          textColor: "text-white",
          dotColor: "bg-blue-500"
        };
      case "delayed":
        return {
          bgColor: "bg-orange-500",
          borderColor: "border-orange-600", 
          textColor: "text-white",
          dotColor: "bg-orange-500"
        };
      default:
        // Pending status
        return isPast(dateObj) && status === "pending"
          ? {
              bgColor: "bg-red-400",
              borderColor: "border-red-500",
              textColor: "text-white",
              dotColor: "bg-red-400"
            }
          : {
              bgColor: "bg-slate-500",
              borderColor: "border-slate-600",
              textColor: "text-white",
              dotColor: "bg-slate-500"
            };
    }
  };

  return (
    <Card className="w-full bg-[#080d17] border-gold-dark/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-medium text-gold-gradient">Project Timeline</CardTitle>
        <CardDescription>Visual representation of project milestones</CardDescription>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <Calendar className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium mb-1">No milestones to display</p>
            <p className="text-sm text-center">Add milestones to visualize your project timeline</p>
          </div>
        ) : (
          <div className="relative pb-4">
            {/* Main timeline line */}
            <div className="absolute left-6 top-8 bottom-0 w-[2px] bg-gradient-to-b from-amber-600 to-yellow-400 opacity-40"></div>

            {/* Timeline events */}
            <div className="space-y-8">
              {sortedMilestones.map((milestone) => {
                const { bgColor, borderColor, textColor, dotColor } = getStatusStyling(
                  milestone.status,
                  milestone.date
                );
                const isSelected = selectedMilestone === milestone.id;
                
                return (
                  <div 
                    key={milestone.id} 
                    className={`relative pl-12 transition-all ${
                      isSelected ? "scale-105" : ""
                    }`}
                    onClick={() => onSelectMilestone && onSelectMilestone(milestone.id)}
                  >
                    {/* Timeline dot */}
                    <div 
                      className={`absolute left-5 top-1.5 w-4 h-4 rounded-full border-2 border-[#132642] ${dotColor} transform -translate-x-1/2`}
                    ></div>
                    
                    {/* Event card */}
                    <div 
                      className={`
                        p-3 rounded-md shadow-md border
                        ${isSelected ? borderColor + " border-2" : "border-gold-dark/20"} 
                        ${isSelected ? bgColor + "/20" : "bg-[#132642]"}
                        cursor-pointer hover:border-gold-dark/70 transition-colors
                      `}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-full ${bgColor}`}>
                            {getMilestoneTypeIcon(milestone.type)}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{milestone.title}</h4>
                            <div className="flex items-center text-xs text-slate-400">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(milestone.date), "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`text-xs uppercase px-2 py-1 rounded ${bgColor} ${textColor}`}>
                            {milestone.status}
                          </div>
                          {onUpdateStatus && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 w-8 p-0 text-white hover:bg-[#080d17]/70"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent 
                                align="end" 
                                className="bg-[#0b111f] border-gold-dark/30 text-white"
                              >
                                <DropdownMenuLabel className="text-gold-gradient">
                                  Update Status
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-gold-dark/20" />
                                <DropdownMenuItem
                                  className="hover:bg-[#132642] cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateStatus(milestone.id, "pending");
                                  }}
                                >
                                  Set as Pending
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="hover:bg-[#132642] cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateStatus(milestone.id, "in-progress");
                                  }}
                                >
                                  Set as In Progress
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="hover:bg-[#132642] cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateStatus(milestone.id, "completed");
                                  }}
                                >
                                  Set as Completed
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="hover:bg-[#132642] cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateStatus(milestone.id, "delayed");
                                  }}
                                >
                                  Set as Delayed
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-slate-300 ml-10">{milestone.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectMilestoneTimeline;