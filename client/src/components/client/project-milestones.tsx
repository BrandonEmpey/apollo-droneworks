import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, FileText, Plus, Trash2, CheckCircle, AlertCircle, PlusCircle, List, BarChart2 } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ProjectMilestoneTimeline from "./project-milestone-timeline";

// Define the milestone schema that matches our backend model
const milestoneFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().optional(),
  date: z.date({ required_error: "Date is required" }),
  status: z.enum(["pending", "in-progress", "completed", "delayed"], {
    required_error: "Status is required"
  }),
  type: z.enum(["milestone", "deliverable", "meeting", "payment"], {
    required_error: "Type is required"
  }),
  fileIds: z.array(z.number()).optional(),
});

type MilestoneFormValues = z.infer<typeof milestoneFormSchema>;

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

interface ProjectMilestonesProps {
  projectId: number;
}

const ProjectMilestones: React.FC<ProjectMilestonesProps> = ({ projectId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<number | undefined>(undefined);
  
  // Fetch project milestones
  const { 
    data: milestones = [], 
    isLoading, 
    error 
  } = useQuery<ProjectMilestone[]>({
    queryKey: ["/api/client-projects", projectId, "milestones"],
    queryFn: async () => {
      const res = await fetch(`/api/client-projects/${projectId}/milestones`);
      if (!res.ok) throw new Error("Failed to fetch milestones");
      return res.json();
    },
    enabled: !!projectId,
  });

  // Create milestone mutation
  const createMilestone = useMutation({
    mutationFn: async (data: MilestoneFormValues) => {
      const response = await fetch(`/api/client-projects/${projectId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, projectId }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create milestone");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects", projectId, "milestones"] });
      toast({
        title: "Success",
        description: "Milestone created successfully",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create milestone: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update milestone status mutation
  const updateMilestoneStatus = useMutation({
    mutationFn: async ({ milestoneId, status }: { milestoneId: number; status: string }) => {
      const response = await fetch(`/api/client-projects/${projectId}/milestones/${milestoneId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update milestone status");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects", projectId, "milestones"] });
      toast({
        title: "Status Updated",
        description: "Milestone status has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update milestone status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete milestone mutation
  const deleteMilestone = useMutation({
    mutationFn: async (milestoneId: number) => {
      const response = await fetch(`/api/client-projects/${projectId}/milestones/${milestoneId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete milestone");
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects", projectId, "milestones"] });
      toast({
        title: "Success",
        description: "Milestone deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete milestone: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form setup for adding new milestones
  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: {
      title: "",
      description: "",
      date: new Date(),
      status: "pending",
      type: "milestone",
      fileIds: [],
    },
  });

  // Handle form submission
  const onSubmit = (values: MilestoneFormValues) => {
    createMilestone.mutate(values);
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500 hover:bg-green-600";
      case "in-progress":
        return "bg-blue-500 hover:bg-blue-600";
      case "delayed":
        return "bg-orange-500 hover:bg-orange-600";
      case "pending":
      default:
        return "bg-slate-500 hover:bg-slate-600";
    }
  };

  // Get milestone type icon
  const getMilestoneTypeIcon = (type: string) => {
    switch (type) {
      case "deliverable":
        return <FileText className="h-4 w-4 mr-1" />;
      case "meeting":
        return <Clock className="h-4 w-4 mr-1" />;
      case "payment":
        return <AlertCircle className="h-4 w-4 mr-1" />;
      case "milestone":
      default:
        return <CheckCircle className="h-4 w-4 mr-1" />;
    }
  };

  // Format date for display
  const formatDate = (date: string | Date) => {
    return format(new Date(date), "MMM d, yyyy");
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center h-32 text-red-500">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>Error loading project milestones</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full bg-[#080d17] border-gold-dark/30">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-medium text-gold-gradient">Project Milestones</CardTitle>
            <CardDescription>Track project timeline and important deliverables</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-gold-dark hover:bg-[#132642] text-gold-gradient h-10">
                <Plus className="h-4 w-4 mr-2" /> Add Milestone
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-[#0b111f] text-white border-gold-dark/30">
              <DialogHeader>
                <DialogTitle className="text-gold-gradient">Add New Milestone</DialogTitle>
                <DialogDescription>
                  Create a new milestone for this project. Fill out the details below.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Milestone title" 
                            {...field} 
                            className="bg-[#080d17] border-gold-dark/30 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the milestone" 
                            {...field} 
                            value={field.value || ""}
                            className="bg-[#080d17] border-gold-dark/30 text-white min-h-[80px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Due Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="bg-[#080d17] border-gold-dark/30 text-white w-full justify-start text-left font-normal"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-auto p-0 bg-[#0b111f] border-gold-dark/30" 
                            align="start"
                          >
                            <CalendarUI
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              className="bg-[#0b111f]"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-[#080d17] border-gold-dark/30 text-white">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-[#0b111f] border-gold-dark/30">
                              <SelectItem 
                                value="milestone"
                                className="text-white hover:bg-[#132642] focus:bg-[#132642] focus:text-white"
                              >
                                Milestone
                              </SelectItem>
                              <SelectItem 
                                value="deliverable"
                                className="text-white hover:bg-[#132642] focus:bg-[#132642] focus:text-white"  
                              >
                                Deliverable
                              </SelectItem>
                              <SelectItem 
                                value="meeting"
                                className="text-white hover:bg-[#132642] focus:bg-[#132642] focus:text-white"
                              >
                                Meeting
                              </SelectItem>
                              <SelectItem 
                                value="payment"
                                className="text-white hover:bg-[#132642] focus:bg-[#132642] focus:text-white"
                              >
                                Payment
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-[#080d17] border-gold-dark/30 text-white">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-[#0b111f] border-gold-dark/30">
                              <SelectItem 
                                value="pending"
                                className="text-white hover:bg-[#132642] focus:bg-[#132642] focus:text-white"
                              >
                                Pending
                              </SelectItem>
                              <SelectItem 
                                value="in-progress"
                                className="text-white hover:bg-[#132642] focus:bg-[#132642] focus:text-white"
                              >
                                In Progress
                              </SelectItem>
                              <SelectItem 
                                value="completed"
                                className="text-white hover:bg-[#132642] focus:bg-[#132642] focus:text-white"
                              >
                                Completed
                              </SelectItem>
                              <SelectItem 
                                value="delayed"
                                className="text-white hover:bg-[#132642] focus:bg-[#132642] focus:text-white"
                              >
                                Delayed
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={createMilestone.isPending}
                      className="bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400"
                    >
                      {createMilestone.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        "Save Milestone"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Calendar className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium mb-1">No milestones yet</p>
            <p className="text-sm text-center mb-4">Add milestones to track important project dates and deliverables</p>
            <Button 
              variant="outline" 
              className="border-gold-dark hover:bg-[#132642] text-gold-gradient"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <PlusCircle className="h-4 w-4 mr-2" /> Add Your First Milestone
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="bg-[#132642] border border-gold-dark/30 mb-4 grid grid-cols-2">
              <TabsTrigger 
                value="list"
                className="data-[state=active]:bg-[#080d17] data-[state=active]:text-white font-medium"
              >
                <List className="h-4 w-4 mr-2" /> List View
              </TabsTrigger>
              <TabsTrigger 
                value="timeline"
                className="data-[state=active]:bg-[#080d17] data-[state=active]:text-white font-medium"
              >
                <BarChart2 className="h-4 w-4 mr-2" /> Timeline View
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="space-y-4 mt-0">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {milestones
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((milestone) => (
                      <Card key={milestone.id} className="bg-[#132642] shadow-sm border-gold-dark/20">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`${getStatusColor(milestone.status)} text-white`}>
                                  {milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
                                </Badge>
                                <Badge variant="outline" className="bg-transparent border-gold-dark/40 text-white">
                                  <div className="flex items-center">
                                    {getMilestoneTypeIcon(milestone.type)}
                                    {milestone.type.charAt(0).toUpperCase() + milestone.type.slice(1)}
                                  </div>
                                </Badge>
                              </div>
                              <CardTitle className="text-lg text-white">{milestone.title}</CardTitle>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-red-900/20"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this milestone?")) {
                                  deleteMilestone.mutate(milestone.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {milestone.description && (
                            <p className="text-sm text-slate-300 mb-3">{milestone.description}</p>
                          )}
                          <div className="flex items-center text-sm text-slate-400">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>Due: {formatDate(milestone.date)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="timeline" className="mt-0">
              <ProjectMilestoneTimeline 
                milestones={milestones}
                selectedMilestone={selectedMilestone}
                onSelectMilestone={(id) => setSelectedMilestone(id)}
                onUpdateStatus={(id, status) => updateMilestoneStatus.mutate({ milestoneId: id, status })}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectMilestones;