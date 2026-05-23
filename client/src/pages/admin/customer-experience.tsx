import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
  Users,
  MessageSquare,
  Bell,
  Smartphone,
  FileText,
  Download,
  Star,
  Eye,
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit,
  Trash2
} from "lucide-react";

interface ClientPortalAccess {
  id: number;
  clientId: number;
  accessToken: string;
  lastLogin: string;
  isActive: boolean;
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    dashboard: {
      defaultView: string;
      autoRefresh: boolean;
    };
    privacy: {
      shareProgress: boolean;
      allowTestimonials: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}

interface ProjectUpdate {
  id: number;
  projectId: number;
  clientId: number;
  updateType: string;
  title: string;
  description: string;
  visibility: string;
  attachments: Array<{
    filename: string;
    url: string;
    type: string;
    size: number;
  }>;
  readBy: Array<{
    userId: number;
    readAt: string;
  }>;
  createdBy: number;
  createdAt: string;
}

interface NotificationSubscription {
  id: number;
  clientId: number;
  subscriptionType: string;
  channel: string;
  isEnabled: boolean;
  frequency: string;
  filterCriteria: {
    projectTypes?: string[];
    priorities?: string[];
    updateTypes?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export default function CustomerExperience() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    title: "",
    description: "",
    projectId: "",
    updateType: "progress",
    visibility: "client"
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch customer experience data
  const { data: portalAccess, isLoading: isPortalLoading } = useQuery({
    queryKey: ["/api/customer/portal-access"],
  });

  const { data: projectUpdates, isLoading: isUpdatesLoading } = useQuery({
    queryKey: ["/api/customer/project-updates"],
  });

  const { data: notifications, isLoading: isNotificationsLoading } = useQuery({
    queryKey: ["/api/customer/notification-subscriptions"],
  });

  const { data: clientFeedback, isLoading: isFeedbackLoading } = useQuery({
    queryKey: ["/api/customer/feedback"],
  });

  // Handler functions
  const handleCreateUpdate = () => {
    const updateData = {
      title: updateForm.title,
      description: updateForm.description,
      projectId: parseInt(updateForm.projectId),
      updateType: updateForm.updateType,
      visibility: updateForm.visibility
    };
    createUpdateMutation.mutate(updateData);
  };

  const resetUpdateForm = () => {
    setUpdateForm({
      title: "",
      description: "",
      projectId: "",
      updateType: "progress",
      visibility: "client"
    });
  };

  // Mutations
  const createUpdateMutation = useMutation({
    mutationFn: async (updateData: any) => {
      return apiRequest("/api/customer/project-updates", "POST", updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/project-updates"] });
      setIsUpdateDialogOpen(false);
      resetUpdateForm();
      toast({
        title: "Success",
        description: "Project update created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project update",
        variant: "destructive",
      });
    },
  });

  const toggleNotificationMutation = useMutation({
    mutationFn: async ({ subscriptionId, isEnabled }: { subscriptionId: number; isEnabled: boolean }) => {
      return apiRequest(`/api/customer/notification-subscriptions/${subscriptionId}`, "PUT", { isEnabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/notification-subscriptions"] });
      toast({
        title: "Success",
        description: "Notification settings updated",
      });
    },
  });



  const getUpdateTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "progress":
        return "bg-blue-100 text-blue-800";
      case "milestone":
        return "bg-green-100 text-green-800";
      case "delay":
        return "bg-yellow-100 text-yellow-800";
      case "completion":
        return "bg-purple-100 text-purple-800";
      case "file_upload":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "client":
        return <Users className="w-4 h-4" />;
      case "internal":
        return <Eye className="w-4 h-4" />;
      case "public":
        return <Star className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  if (isPortalLoading) {
    return <div className="flex items-center justify-center h-64">Loading customer experience dashboard...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Experience</h1>
          <p className="text-muted-foreground">
            Enhance client engagement and communication
          </p>
        </div>
        <Button onClick={() => setIsUpdateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project Update
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="portal">Client Portal</TabsTrigger>
          <TabsTrigger value="updates">Project Updates</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">
                  +3 from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Project Updates</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(projectUpdates as any[])?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +12 this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Portal Sessions</CardTitle>
                <Smartphone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">156</div>
                <p className="text-xs text-muted-foreground">
                  +23% from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.9/5</div>
                <p className="text-xs text-muted-foreground">
                  +0.1 from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Updates
                </CardTitle>
                <CardDescription>
                  Latest project updates and communications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(projectUpdates as ProjectUpdate[])?.slice(0, 5).map((update: ProjectUpdate) => (
                    <div key={update.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Badge className={getUpdateTypeColor(update.updateType)}>
                        {update.updateType}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{update.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                          {update.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                          {getVisibilityIcon(update.visibility)}
                          <span className="truncate">Project {update.projectId}</span>
                          <span>•</span>
                          <span className="whitespace-nowrap">{new Date(update.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!(projectUpdates as ProjectUpdate[]) || (projectUpdates as ProjectUpdate[]).length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      No recent updates
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Client Feedback
                </CardTitle>
                <CardDescription>
                  Recent feedback and support requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(clientFeedback as any[])?.slice(0, 5).map((feedback: any) => (
                    <div key={feedback.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < (feedback.rating || 0)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{feedback.subject}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                          {feedback.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant={feedback.status === "resolved" ? "default" : "secondary"}>
                            {feedback.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(feedback.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!(clientFeedback as any[]) || (clientFeedback as any[]).length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      No feedback received
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="portal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Portal Management</CardTitle>
              <CardDescription>
                Configure self-service portal access and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  Client portal configuration interface coming soon. This will allow you to manage portal access, customize dashboards, and configure client preferences.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Updates Management</CardTitle>
              <CardDescription>
                Send real-time updates to clients about their projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(projectUpdates as ProjectUpdate[])?.map((update: ProjectUpdate) => (
                  <div key={update.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getUpdateTypeColor(update.updateType)}>
                          {update.updateType}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getVisibilityIcon(update.visibility)}
                          {update.visibility}
                        </Badge>
                      </div>
                      <h3 className="font-medium">{update.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {update.description}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>Project {update.projectId}</span>
                        <span>Client {update.clientId}</span>
                        <span>{new Date(update.createdAt).toLocaleDateString()}</span>
                        <span>{update.readBy?.length || 0} reads</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!(projectUpdates as ProjectUpdate[]) || (projectUpdates as ProjectUpdate[]).length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No project updates created yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Management</CardTitle>
              <CardDescription>
                Configure automated notifications for clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications?.map((subscription: NotificationSubscription) => (
                  <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Bell className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium capitalize">
                          {subscription.subscriptionType.replace(/_/g, " ")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {subscription.channel} • {subscription.frequency}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={subscription.isEnabled}
                      onCheckedChange={(checked) =>
                        toggleNotificationMutation.mutate({
                          subscriptionId: subscription.id,
                          isEnabled: checked,
                        })
                      }
                    />
                  </div>
                ))}
                {(!notifications || notifications.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No notification subscriptions configured
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Feedback & Support</CardTitle>
              <CardDescription>
                Review and respond to client feedback and support requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clientFeedback?.map((feedback: any) => (
                  <div key={feedback.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className={
                          feedback.feedbackType === "complaint" ? "bg-red-100 text-red-800" :
                          feedback.feedbackType === "suggestion" ? "bg-blue-100 text-blue-800" :
                          "bg-green-100 text-green-800"
                        }>
                          {feedback.feedbackType}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < (feedback.rating || 0)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <Badge variant={feedback.status === "resolved" ? "default" : "secondary"}>
                        {feedback.status}
                      </Badge>
                    </div>
                    <h3 className="font-medium mb-2">{feedback.subject}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {feedback.content}
                    </p>
                    {feedback.adminResponse && (
                      <div className="p-3 bg-muted rounded-lg mb-3">
                        <p className="text-sm font-medium mb-1">Admin Response:</p>
                        <p className="text-sm">{feedback.adminResponse}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Client {feedback.clientId}</span>
                      <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                    </div>
                    {feedback.status !== "resolved" && (
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Respond
                        </Button>
                        <Button variant="outline" size="sm">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Mark Resolved
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {(!clientFeedback || clientFeedback.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No client feedback received
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Project Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create Project Update</DialogTitle>
            <DialogDescription>
              Send a real-time update to clients about their project progress
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleCreateUpdate(new FormData(e.currentTarget));
          }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectId">Project ID</Label>
                  <Input
                    id="projectId"
                    name="projectId"
                    type="number"
                    placeholder="1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    name="clientId"
                    type="number"
                    placeholder="1"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="updateType">Update Type</Label>
                  <Select name="updateType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="progress">Progress Update</SelectItem>
                      <SelectItem value="milestone">Milestone Completion</SelectItem>
                      <SelectItem value="delay">Delay Notification</SelectItem>
                      <SelectItem value="completion">Project Completion</SelectItem>
                      <SelectItem value="file_upload">File Upload</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select name="visibility" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client Only</SelectItem>
                      <SelectItem value="internal">Internal Only</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Update Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Photos captured successfully"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Detailed description of the update"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUpdateMutation.isPending}>
                {createUpdateMutation.isPending ? "Creating..." : "Create Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}