import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays, addDays, isAfter, isBefore } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from "recharts";
import { Loader2, AlertCircle, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface ProjectAnalyticsProps {
  projectId: number;
}

type ProgressMetric = {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  status: "positive" | "negative" | "neutral";
  change?: number;
};

type TaskStatusData = {
  name: string;
  value: number;
  color: string;
};

type MilestoneData = {
  name: string;
  completed: number;
  pending: number;
};

type TimelineActivityData = {
  date: string;
  tasks: number;
  messages: number;
  files: number;
};

const ProjectAnalytics: React.FC<ProjectAnalyticsProps> = ({ projectId }) => {
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "90days" | "all">("30days");
  
  // Fetch project analytics data
  const { 
    data: analytics, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["/api/client-projects", projectId, "analytics", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/client-projects/${projectId}/analytics?timeRange=${timeRange}`);
      if (!res.ok) throw new Error("Failed to fetch project analytics");
      return res.json();
    },
    enabled: !!projectId,
  });

  // Handle loading state
  if (isLoading) {
    return (
      <Card className="w-full bg-[#080d17] border-gold-dark/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card className="w-full bg-[#080d17] border-gold-dark/30">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center h-32 text-red-500">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>Error loading project analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sample data for demonstration - in a real application, this would come from the API
  // These would be replaced with data from the 'analytics' object fetched from the API
  const progressMetrics: ProgressMetric[] = [
    {
      id: "completion",
      name: "Project Completion",
      value: 68,
      target: 100,
      unit: "%",
      status: "positive",
      change: 12,
    },
    {
      id: "tasks",
      name: "Tasks Completed",
      value: 24,
      target: 36,
      unit: "",
      status: "positive",
      change: 8,
    },
    {
      id: "milestones",
      name: "Milestones Reached",
      value: 4,
      target: 8,
      unit: "",
      status: "neutral",
      change: 1,
    },
    {
      id: "timeline",
      name: "Timeline Status",
      value: -2,
      target: 0,
      unit: " days",
      status: "negative",
      change: -1,
    },
  ];

  const taskStatusData: TaskStatusData[] = [
    { name: "Completed", value: 24, color: "#22c55e" },
    { name: "In Progress", value: 8, color: "#3b82f6" },
    { name: "Todo", value: 4, color: "#94a3b8" },
    { name: "Blocked", value: 2, color: "#ef4444" },
  ];

  const milestoneData: MilestoneData[] = [
    { name: "Planning", completed: 2, pending: 0 },
    { name: "Design", completed: 1, pending: 1 },
    { name: "Development", completed: 1, pending: 2 },
    { name: "Delivery", completed: 0, pending: 1 },
  ];

  // Generate timeline activity data for the past 30 days
  const generateTimelineData = (): TimelineActivityData[] => {
    const data: TimelineActivityData[] = [];
    const today = new Date();
    const daysToShow = timeRange === "7days" ? 7 : timeRange === "30days" ? 30 : 90;
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = addDays(today, -i);
      const dateStr = format(date, "MMM d");
      
      // Generate random data for demo purposes
      data.push({
        date: dateStr,
        tasks: Math.floor(Math.random() * 3),
        messages: Math.floor(Math.random() * 5),
        files: Math.floor(Math.random() * 2),
      });
    }
    
    return data;
  };

  const timelineData = generateTimelineData();

  // Format change indicator
  const formatChange = (value: number, status: "positive" | "negative" | "neutral") => {
    if (status === "neutral" || value === 0) {
      return <span className="text-offwhite/70">No change</span>;
    }
    
    const isPositive = value > 0;
    const icon = isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />;
    const color = isPositive ? "text-green-500" : "text-red-500";
    
    return (
      <span className={`flex items-center ${color}`}>
        {icon}
        <span className="ml-1">{Math.abs(value)}</span>
      </span>
    );
  };

  return (
    <Card className="w-full bg-[#080d17] border-gold-dark/30">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-medium text-gold-gradient">Project Analytics</CardTitle>
            <CardDescription>Track project performance and progress</CardDescription>
          </div>
          <Select value={timeRange} onValueChange={(value: "7days" | "30days" | "90days" | "all") => setTimeRange(value)}>
            <SelectTrigger className="w-[160px] bg-[#132642] border-gold-dark/30 text-offwhite">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent className="bg-[#0b111f] border-gold-dark/30">
              <SelectItem value="7days" className="text-offwhite hover:bg-[#132642]">Last 7 days</SelectItem>
              <SelectItem value="30days" className="text-offwhite hover:bg-[#132642]">Last 30 days</SelectItem>
              <SelectItem value="90days" className="text-offwhite hover:bg-[#132642]">Last 90 days</SelectItem>
              <SelectItem value="all" className="text-offwhite hover:bg-[#132642]">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {progressMetrics.map((metric) => (
            <Card key={metric.id} className="bg-[#132642] border-gold-dark/30">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-medium text-offwhite/70">{metric.name}</h3>
                  <Badge 
                    className={`
                      ${metric.status === "positive" ? "bg-green-500" : 
                        metric.status === "negative" ? "bg-red-500" : "bg-blue-500"}
                    `}
                  >
                    {formatChange(metric.change || 0, metric.status)}
                  </Badge>
                </div>
                <div className="flex items-baseline mb-2">
                  <span className="text-2xl font-bold text-offwhite">
                    {metric.value}{metric.unit}
                  </span>
                  <span className="text-sm text-offwhite/50 ml-1">
                    / {metric.target}{metric.unit}
                  </span>
                </div>
                <Progress 
                  value={(metric.value / metric.target) * 100} 
                  className="h-2 bg-[#080d17]" 
                />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Tabs for different analytics views */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-[#132642] border border-gold-dark/30 p-1 rounded-md grid grid-cols-3">
            <TabsTrigger 
              value="overview"
              className="rounded data-[state=active]:bg-[#080d17] data-[state=active]:text-offwhite data-[state=active]:font-medium data-[state=active]:shadow-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="tasks"
              className="rounded data-[state=active]:bg-[#080d17] data-[state=active]:text-offwhite data-[state=active]:font-medium data-[state=active]:shadow-sm"
            >
              Tasks
            </TabsTrigger>
            <TabsTrigger 
              value="timeline"
              className="rounded data-[state=active]:bg-[#080d17] data-[state=active]:text-offwhite data-[state=active]:font-medium data-[state=active]:shadow-sm"
            >
              Timeline
            </TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Task Status Chart */}
              <Card className="bg-[#132642] border-gold-dark/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md font-medium text-offwhite">Task Status</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={taskStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {taskStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`${value} Tasks`, 'Count']}
                          contentStyle={{ backgroundColor: '#0b111f', borderColor: '#b8a15c50', borderRadius: '4px' }}
                          itemStyle={{ color: '#ffffff' }}
                        />
                        <Legend 
                          layout="horizontal" 
                          verticalAlign="bottom" 
                          align="center"
                          wrapperStyle={{ color: '#ffffff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Milestone Progress */}
              <Card className="bg-[#132642] border-gold-dark/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md font-medium text-offwhite">Milestone Progress</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={milestoneData}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" tick={{ fill: '#ffffff' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0b111f', borderColor: '#b8a15c50', borderRadius: '4px' }}
                          itemStyle={{ color: '#ffffff' }}
                        />
                        <Legend wrapperStyle={{ color: '#ffffff' }} />
                        <Bar dataKey="completed" stackId="a" fill="#22c55e" name="Completed" />
                        <Bar dataKey="pending" stackId="a" fill="#94a3b8" name="Pending" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Tasks Tab */}
          <TabsContent value="tasks" className="pt-2">
            <Card className="bg-[#132642] border-gold-dark/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-medium text-offwhite">Task Completion Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={timelineData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" tick={{ fill: '#ffffff' }} />
                      <YAxis tick={{ fill: '#ffffff' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0b111f', borderColor: '#b8a15c50', borderRadius: '4px' }}
                        itemStyle={{ color: '#ffffff' }}
                      />
                      <Legend wrapperStyle={{ color: '#ffffff' }} />
                      <Bar dataKey="tasks" name="Tasks Completed" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Timeline Tab */}
          <TabsContent value="timeline" className="pt-2">
            <Card className="bg-[#132642] border-gold-dark/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-medium text-offwhite">Project Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={timelineData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" tick={{ fill: '#ffffff' }} />
                      <YAxis tick={{ fill: '#ffffff' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0b111f', borderColor: '#b8a15c50', borderRadius: '4px' }}
                        itemStyle={{ color: '#ffffff' }}
                      />
                      <Legend wrapperStyle={{ color: '#ffffff' }} />
                      <Bar dataKey="tasks" name="Tasks" fill="#3b82f6" />
                      <Bar dataKey="messages" name="Messages" fill="#f59e0b" />
                      <Bar dataKey="files" name="Files" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t border-gold-dark/30 pt-4">
        <div className="flex items-center text-xs text-offwhite/50">
          <Clock className="h-3 w-3 mr-1" />
          Last updated: {format(new Date(), "MMMM d, yyyy h:mm a")}
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProjectAnalytics;