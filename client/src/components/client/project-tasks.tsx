import React, { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Circle,
  Clock,
  Edit,
  Plus,
  Trash2,
  AlertCircle,
  Ban,
  CalendarDays,
  ArrowUpCircle,
  CircleDashed,
  ArrowDownCircle,
  File as FileIcon,
  FileText,
  Link,
  Image,
  Video,
  FileQuestion,
  XCircle,
  Mail,
  Paperclip,
  Download,
} from "lucide-react";

import TaskMessageForm from "./task-message-form";
import TimelapseViewer from "./timelapse-viewer/timelapse-viewer";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define file type
type TaskFile = {
  id?: number;
  name: string;
  url: string;
  fileType: string;
  taskId: number;
  uploadedAt?: string | Date;
};

// Define task note type
type TaskNote = {
  id?: number;
  content: string;
  fromClient: boolean;
  createdAt?: string | Date;
};

// Define task type
type ProjectTask = {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  dueDate: string | Date | null;
  priority: string;
  status: string;
  apolloResponsibility: string | null; // Changed from assignedTo to apolloResponsibility
  completedAt: string | Date | null;
  clientNotes: string | null; // Legacy: Notes from client to Apollo
  adminNotes: string | null; // Legacy: Notes from Apollo to client
  createdAt: string | Date;
  updatedAt: string | Date;
  files?: TaskFile[]; // Array of associated files
  notes?: TaskNote[]; // Array of task notes (chat messages)
};

// Task form validation schema
const taskFormSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.string().default("medium"),
  status: z.string().default("todo"),
  clientNotes: z.string().optional().nullable(),
  adminNotes: z.string().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface ProjectTasksProps {
  projectId: number;
}

const ProjectTasks: React.FC<ProjectTasksProps> = ({ projectId }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [newTaskNote, setNewTaskNote] = useState("");
  const notesEndRef = useRef<HTMLDivElement>(null);
  
  // Super simple direct scrolling approach
  const scrollToBottom = (taskId?: number) => {
    const scrollIt = () => {
      try {
        // If we have a specific taskId, only scroll that task's chat
        if (taskId) {
          const chatContainer = document.getElementById(`task-chat-${taskId}`);
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight + 1000;
            console.log(`Scrolled task ${taskId} chat to bottom`);
          }
          return;
        }
        
        // Otherwise scroll all tasks that are visible
        const allChatContainers = document.querySelectorAll('[id^="task-chat-"]');
        allChatContainers.forEach(container => {
          if (container instanceof HTMLElement) {
            container.scrollTop = container.scrollHeight + 1000;
            console.log(`Scrolled chat container to bottom`);
          }
        });
      } catch (err) {
        console.error('Error scrolling chat to bottom:', err);
      }
    };
    
    // Attempt scrolling multiple times with increasing delays
    scrollIt(); // Immediate
    setTimeout(scrollIt, 50);  // Very short delay
    setTimeout(scrollIt, 150); // Short delay
    setTimeout(scrollIt, 300); // Medium delay
    setTimeout(scrollIt, 500); // Longer delay
  };
  
  // Fetch project tasks
  const { 
    data: tasks = [], 
    isLoading, 
    error 
  } = useQuery<ProjectTask[]>({
    queryKey: ["/api/client-projects", projectId, "tasks"],
    queryFn: async () => {
      const res = await fetch(`/api/client-projects/${projectId}/tasks`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      
      const taskData = await res.json();
      
      // Fetch files for each task
      const tasksWithFiles = await Promise.all(
        taskData.map(async (task: ProjectTask) => {
          try {
            const filesRes = await fetch(`/api/client-projects/${projectId}/tasks/${task.id}/files`);
            if (filesRes.ok) {
              const files = await filesRes.json();
              return { ...task, files };
            }
          } catch (err) {
            console.error(`Failed to fetch files for task ${task.id}:`, err);
          }
          return task;
        })
      );
      
      // For debugging - log the response to see the actual structure
      console.log("Tasks with notes:", tasksWithFiles);
      
      return tasksWithFiles;
    },
    enabled: !!projectId,
  });

  // Create task mutation
  const createTask = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      const res = await fetch(`/api/client-projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects", projectId, "tasks"] });
      toast({
        title: "Task created",
        description: "The task has been created successfully.",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateTask = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TaskFormValues> }) => {
      const res = await fetch(`/api/client-projects/${projectId}/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects", projectId, "tasks"] });
      toast({
        title: "Task updated",
        description: "The task has been updated successfully.",
      });
      setEditingTask(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTask = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/client-projects/${projectId}/tasks/${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Failed to delete task");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects", projectId, "tasks"] });
      toast({
        title: "Task deleted",
        description: "The task has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Status update helper function
  const handleStatusChange = (task: ProjectTask, newStatus: string) => {
    updateTask.mutate({
      id: task.id,
      data: { status: newStatus }
    });
  };

  // Scroll to bottom whenever tasks change or messages are added
  React.useEffect(() => {
    scrollToBottom();
  }, [tasks]);
  
  // Form for adding/editing tasks
  const TaskForm = ({ task }: { task?: ProjectTask }) => {
    const isEditing = !!task;
    
    const form = useForm<TaskFormValues>({
      resolver: zodResolver(taskFormSchema),
      defaultValues: task ? {
        title: task.title,
        description: task.description || "",
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
        priority: task.priority,
        status: task.status,
        clientNotes: task.clientNotes || "",
        adminNotes: task.adminNotes || "",
      } : {
        title: "",
        description: "",
        dueDate: "",
        priority: "medium",
        status: "todo",
        clientNotes: "",
        adminNotes: "",
      },
    });

    const onSubmit = (data: TaskFormValues) => {
      if (isEditing && task) {
        updateTask.mutate({ id: task.id, data });
      } else {
        createTask.mutate(data);
      }
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Task title" {...field} />
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
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Task description" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="space-y-4">
            <div className="bg-[#080d17] border border-slate-800 p-4 rounded-md">
              <h4 className="text-sm font-medium mb-4 text-gold">Task Communications</h4>
              
              {user?.isAdmin ? (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="adminNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <div className="flex items-center gap-2">
                            <span>Message to Client</span>
                            <Badge variant="outline" className="text-xs">Visible to Client</Badge>
                          </div>
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add a note that will be visible to the client" 
                            {...field} 
                            value={field.value || ""} 
                            className="min-h-[80px] bg-[#132642] border-gold/20"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Show client's notes to admins in a read-only preview if editing */}
                  {isEditing && task?.clientNotes && (
                    <div className="mt-4">
                      <label className="text-sm font-medium mb-2 block">
                        <div className="flex items-center gap-2">
                          <span>Client's Message</span>
                          <Badge variant="outline" className="text-xs border-indigo-400/30">Private to Apollo</Badge>
                        </div>
                      </label>
                      <div className="bg-indigo-900/40 rounded-lg p-3 border border-indigo-400/20 text-sm text-slate-300">
                        {task.clientNotes}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="clientNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <div className="flex items-center gap-2">
                          <span>Message to Apollo DroneWorks</span>
                          <Badge variant="outline" className="text-xs border-indigo-400/30">Private to Apollo</Badge>
                        </div>
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add a note that will only be visible to Apollo DroneWorks team" 
                          {...field} 
                          value={field.value || ""} 
                          className="min-h-[80px] bg-indigo-900/40 border-indigo-400/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Show admin's notes to clients in a read-only preview if editing */}
              {!user?.isAdmin && isEditing && task?.adminNotes && (
                <div className="mt-4">
                  <label className="text-sm font-medium mb-2 block">
                    <div className="flex items-center gap-2">
                      <span>Apollo's Message</span>
                    </div>
                  </label>
                  <div className="bg-[#132642] rounded-lg p-3 border border-gold/20 text-sm text-slate-300">
                    {task.adminNotes}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsAddDialogOpen(false);
                setEditingTask(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    );
  };

  // Helper to format dates
  const formatDate = (date: string | Date | null) => {
    if (!date) return "No date set";
    return format(new Date(date), "MMM d, yyyy");
  };

  // Helper to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "todo":
        return <Circle className="h-4 w-4 text-slate-400" />;
      case "in-progress":
        return <CircleDashed className="h-4 w-4 text-blue-400" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case "blocked":
        return <Ban className="h-4 w-4 text-red-400" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  // Helper to get priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <ArrowUpCircle className="h-4 w-4 text-red-400" />;
      case "medium":
        return <ArrowDownCircle className="h-4 w-4 text-yellow-400" />;
      case "low":
        return <ArrowDownCircle className="h-4 w-4 text-green-400" />;
      default:
        return null;
    }
  };

  // Add file to task mutation
  const addFileToTask = useMutation({
    mutationFn: async ({ taskId, fileData }: { taskId: number; fileData: { name: string; url: string; fileType: string } }) => {
      const res = await fetch(`/api/client-projects/${projectId}/tasks/${taskId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fileData),
      });
      
      if (!res.ok) throw new Error("Failed to add file to task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects", projectId, "tasks"] });
      toast({
        title: "File added",
        description: "The file has been attached to the task.",
      });
      setIsFileDialogOpen(false);
      setFileUrl("");
      setFileName("");
      setSelectedTaskId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add file: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete file from task mutation
  const deleteFile = useMutation({
    mutationFn: async ({ taskId, fileId }: { taskId: number; fileId: number }) => {
      const res = await fetch(`/api/client-projects/${projectId}/tasks/${taskId}/files/${fileId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Failed to delete file");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects", projectId, "tasks"] });
      toast({
        title: "File deleted",
        description: "The file has been removed from the task.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete file: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle attaching file to task
  const handleAttachFile = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsFileDialogOpen(true);
  };
  
  // Handle sending a message about a task
  const handleSendMessage = (task: ProjectTask) => {
    setSelectedTaskId(task.id);
    setSelectedTask(task);
    setIsMessageDialogOpen(true);
  };
  
  // Add demo files to task for testing
  const addDemoFilesToTask = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch(`/api/client-projects/${projectId}/tasks/${taskId}/demo-files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!res.ok) throw new Error("Failed to add demo files");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects", projectId, "tasks"] });
      toast({
        title: "Demo files added",
        description: "Demo files have been added to the task for testing.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add demo files: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Parse task notes from a string into an array of message objects
  const parseTaskNotes = (notes: string | null, isClientNotes: boolean = false): TaskNote[] => {
    if (!notes) return [];
    
    // Debug log for parsing
    console.log("Tasks with notes:", tasks.filter(t => t.clientNotes || t.adminNotes));
    
    const parsedNotes: TaskNote[] = [];
    
    // Split by double newlines to get individual messages
    const messageBlocks = notes.split('\n\n');
    
    messageBlocks.forEach(block => {
      // Look for timestamp pattern [timestamp] followed by message
      const match = block.match(/^\[(.*?)\] (.*)/);
      if (match) {
        const timestamp = match[1];
        const content = match[2];
        
        parsedNotes.push({
          content,
          fromClient: isClientNotes, // Set based on which field we're parsing
          createdAt: timestamp
        });
      }
    });
    
    // Final debug check
    if (isClientNotes && parsedNotes.length === 0 && notes.trim()) {
      console.log("Warning: Client notes exist but no messages parsed:", notes);
    }
    
    return parsedNotes;
  };
  
  // Add a note to a task
  const addTaskNote = useMutation({
    mutationFn: async ({ taskId, note }: { taskId: number; note: string }) => {
      // For now, we'll use the existing API to update either clientNotes or adminNotes
      // Later this would be refactored to use a dedicated task notes API
      const isClient = !user?.isAdmin;
      
      // Instead of replacing the existing note, we'll append to it with a timestamp
      const timestamp = new Date().toLocaleString();
      const existingTask = tasks.find(t => t.id === taskId);
      
      // Create a formatted message with a timestamp
      const formattedMessage = `[${timestamp}] ${note}`;
      
      // Debugging information
      console.log("Adding task note:", {
        isClient,
        existingClientNotes: existingTask?.clientNotes,
        existingAdminNotes: existingTask?.adminNotes,
        formattedMessage
      });
      
      // Append to existing notes or create new one
      const updateData = isClient 
        ? { 
            clientNotes: existingTask?.clientNotes 
              ? existingTask.clientNotes + '\n\n' + formattedMessage 
              : formattedMessage 
          } 
        : { 
            adminNotes: existingTask?.adminNotes 
              ? existingTask.adminNotes + '\n\n' + formattedMessage 
              : formattedMessage 
          };
        
      const res = await fetch(`/api/client-projects/${projectId}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      
      if (!res.ok) throw new Error("Failed to add note to task");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects", projectId, "tasks"] });
      toast({
        title: "Message sent",
        description: "Your message has been added to the chat.",
      });
      setNewTaskNote("");
      
      // Try multiple scroll attempts with increasing delays to ensure content is loaded
      setTimeout(() => scrollToBottom(variables.taskId), 200);
      setTimeout(() => scrollToBottom(variables.taskId), 500);
      setTimeout(() => scrollToBottom(variables.taskId), 1000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle submitting file
  const handleFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTaskId || !fileUrl || !fileName) {
      toast({
        title: "Missing information",
        description: "Please provide both file name and URL",
        variant: "destructive",
      });
      return;
    }
    
    // Get file type from URL or defaulting to "link"
    const fileExtension = fileUrl.split('.').pop()?.toLowerCase() || "";
    let fileType = "link";
    
    if (["pdf", "doc", "docx", "xls", "xlsx", "txt"].includes(fileExtension)) {
      fileType = "document";
    } else if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(fileExtension)) {
      fileType = "image";
    } else if (["mp4", "mov", "avi", "wmv", "webm"].includes(fileExtension)) {
      fileType = "video";
    }
    
    addFileToTask.mutate({
      taskId: selectedTaskId,
      fileData: {
        name: fileName,
        url: fileUrl,
        fileType,
      }
    });
  };

  // Filter tasks by status
  const filteredTasks = tasks.filter(task => {
    if (filterStatus === "all") return true;
    return task.status === filterStatus;
  });

  if (isLoading) {
    return <div className="flex justify-center p-4">Loading tasks...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {(error as Error).message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Project Tasks</h3>
          <p className="text-sm text-slate-400">{tasks.length} tasks in this project</p>
        </div>
        
        <div className="flex space-x-4">
          <Select 
            value={filterStatus} 
            onValueChange={(value) => setFilterStatus(value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Task</DialogTitle>
                <DialogDescription>
                  Create a new task for this project.
                </DialogDescription>
              </DialogHeader>
              <TaskForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="pr-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p>No tasks found. Create a new task to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredTasks.map((task) => (
              <Card 
                key={task.id} 
                className="border border-slate-800 bg-slate-950"
                data-task-id={task.id}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="flex flex-col mr-2 space-y-1">
                        <label className={`flex items-center cursor-pointer ${task.status === 'todo' ? 'text-slate-400' : 'text-slate-600'}`}>
                          <input 
                            type="checkbox" 
                            checked={task.status === 'todo'}
                            onChange={() => handleStatusChange(task, 'todo')}
                            className="sr-only" 
                          />
                          <Circle className={`h-4 w-4 mr-1 ${task.status === 'todo' ? 'text-slate-400' : 'text-slate-600'}`} />
                          <span className="text-xs">To Do</span>
                        </label>
                        <label className={`flex items-center cursor-pointer ${task.status === 'in-progress' ? 'text-blue-400' : 'text-slate-600'}`}>
                          <input 
                            type="checkbox" 
                            checked={task.status === 'in-progress'}
                            onChange={() => handleStatusChange(task, 'in-progress')}
                            className="sr-only" 
                          />
                          <CircleDashed className={`h-4 w-4 mr-1 ${task.status === 'in-progress' ? 'text-blue-400' : 'text-slate-600'}`} />
                          <span className="text-xs">In Progress</span>
                        </label>
                        <label className={`flex items-center cursor-pointer ${task.status === 'completed' ? 'text-green-400' : 'text-slate-600'}`}>
                          <input 
                            type="checkbox" 
                            checked={task.status === 'completed'}
                            onChange={() => handleStatusChange(task, 'completed')}
                            className="sr-only" 
                          />
                          <CheckCircle2 className={`h-4 w-4 mr-1 ${task.status === 'completed' ? 'text-green-400' : 'text-slate-600'}`} />
                          <span className="text-xs">Completed</span>
                        </label>
                        <label className={`flex items-center cursor-pointer ${task.status === 'blocked' ? 'text-red-400' : 'text-slate-600'}`}>
                          <input 
                            type="checkbox" 
                            checked={task.status === 'blocked'}
                            onChange={() => handleStatusChange(task, 'blocked')}
                            className="sr-only" 
                          />
                          <Ban className={`h-4 w-4 mr-1 ${task.status === 'blocked' ? 'text-red-400' : 'text-slate-600'}`} />
                          <span className="text-xs">Blocked</span>
                        </label>
                      </div>
                      <div>
                        <CardTitle className="text-md font-medium">{task.title}</CardTitle>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-blue-900/20"
                        onClick={() => setEditingTask(task)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-red-900/20"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this task?")) {
                            deleteTask.mutate(task.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {task.description && (
                      <p className="text-sm text-slate-300 mb-3">{task.description}</p>
                    )}
                    
                    {/* Task Status Badges */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant={task.status === "completed" ? "outline" : "secondary"} className="flex items-center gap-1">
                        {getStatusIcon(task.status)}
                        <span className="capitalize">{task.status.replace("-", " ")}</span>
                      </Badge>
                      
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getPriorityIcon(task.priority)}
                        <span className="capitalize">{task.priority} Priority</span>
                      </Badge>
                      
                      {task.dueDate && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(task.dueDate)}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {/* Left Column with Tabs for Files and Timelapse */}
                      <div className="md:col-span-1">
                        <Tabs defaultValue="files" className="w-full">
                          <TabsList className="grid w-full grid-cols-2 bg-slate-900 border border-slate-800">
                            <TabsTrigger value="files" className="data-[state=active]:bg-blue-900/20">
                              <FileIcon className="h-4 w-4 mr-1" /> Files
                            </TabsTrigger>
                            <TabsTrigger value="timelapse" className="data-[state=active]:bg-blue-900/20">
                              <Clock className="h-4 w-4 mr-1" /> Timelapse
                            </TabsTrigger>
                          </TabsList>
                          
                          {/* Files Tab Content */}
                          <TabsContent value="files" className="mt-2">
                            <h4 className="text-sm font-medium mb-2 flex items-center">
                              <FileIcon className="h-4 w-4 mr-1" />
                              Deliverable Files
                            </h4>
                        
                        {task.files && task.files.length > 0 ? (
                          <div className="space-y-2">
                            {task.files.map((file, index) => (
                              <div key={index} className="flex items-center justify-between">
                                <a 
                                  href={file.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  {file.fileType === "document" ? (
                                    <FileText className="h-3 w-3 mr-1 flex-shrink-0" />
                                  ) : file.fileType === "image" ? (
                                    <Image className="h-3 w-3 mr-1 flex-shrink-0" />
                                  ) : file.fileType === "video" ? (
                                    <Video className="h-3 w-3 mr-1 flex-shrink-0" />
                                  ) : (
                                    <Link className="h-3 w-3 mr-1 flex-shrink-0" />
                                  )}
                                  <span className="truncate">{file.name}</span>
                                </a>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 rounded-full hover:bg-red-900/20"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if (window.confirm(`Are you sure you want to delete the file "${file.name}"?`)) {
                                      deleteFile.mutate({ taskId: task.id, fileId: file.id || 0 });
                                    }
                                  }}
                                >
                                  <XCircle className="h-3 w-3 text-red-400" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No deliverable files attached</p>
                        )}
                        
                        {/* File management buttons */}
                        <div className="flex mt-3 space-x-2">
                          {/* Only admin users can attach files */}
                          {user?.isAdmin && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="self-start text-xs text-slate-300 hover:text-white"
                                onClick={() => handleAttachFile(task.id)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Attach File
                              </Button>
                              
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="self-start text-xs text-slate-300 hover:text-white"
                                onClick={() => addDemoFilesToTask.mutate(task.id)}
                                disabled={addDemoFilesToTask.isPending}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                {addDemoFilesToTask.isPending ? "Adding..." : "Add Demo Files"}
                              </Button>
                            </>
                          )}
                        </div>
                          </TabsContent>
                          
                          {/* Timelapse Tab Content */}
                          <TabsContent value="timelapse" className="mt-2">
                            <h4 className="text-sm font-medium mb-2 h-[28px] flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              Project Timelapse
                            </h4>
                            <div className="bg-[#080d17] rounded-md border border-slate-800 p-3">
                              <TimelapseViewer projectId={projectId} taskId={task.id} taskName={task.title} />
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                      
                      {/* Communication Column - Right (equal width) */}
                      <div className="md:col-span-1 border-l border-slate-700 pl-4 flex flex-col h-full">
                        <h4 className="text-sm font-medium mb-2 h-[28px] flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          Task Communications
                        </h4>
                        
                        {/* Task Chat Section with Chronological Messages */}
                        <div className="flex flex-col space-y-2">
                          <div 
                            id={`task-chat-${task.id}`} 
                            className="h-[400px] w-full rounded-md border border-slate-800 bg-[#080d17] p-3 overflow-y-auto"
                            style={{ scrollBehavior: 'smooth' }}
                          >
                            <div className="space-y-3">
                              {/* Combine and sort messages chronologically */}
                              {(() => {
                                // Get client and admin messages
                                const clientMessages = task.clientNotes ? parseTaskNotes(task.clientNotes, true) : [];
                                const adminMessages = task.adminNotes ? parseTaskNotes(task.adminNotes) : [];
                                
                                // Combine all messages
                                const allMessages = [...clientMessages, ...adminMessages];
                                
                                // Sort by timestamp
                                allMessages.sort((a, b) => {
                                  const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                                  const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                                  return dateA - dateB;
                                });
                                
                                // If no messages, show empty state
                                if (allMessages.length === 0) {
                                  return <p className="text-xs text-slate-400 italic">No communications yet</p>;
                                }
                                
                                // Render each message with appropriate styling
                                return allMessages.map((note, index) => (
                                  <div 
                                    key={`message-${index}`} 
                                    className={`flex ${note.fromClient ? "justify-end" : "justify-start"} mb-2`}
                                  >
                                    <div 
                                      className={
                                        note.fromClient 
                                          ? "max-w-[85%] bg-indigo-900/40 rounded-lg rounded-tr-none p-3 border border-indigo-400/20" 
                                          : "max-w-[85%] bg-[#132642] rounded-lg rounded-tl-none p-3 border border-gold/20"
                                      }
                                    >
                                      <div className="flex justify-between items-center mb-1">
                                        <span 
                                          className={
                                            note.fromClient 
                                              ? "text-xs font-medium text-indigo-400" 
                                              : "text-xs font-medium text-gold"
                                          }
                                        >
                                          {/* Message labels:
                                            - For client messages, show "You" if viewing as client, otherwise show client name
                                            - For admin messages, show "You" if viewing as admin, otherwise show "Apollo DroneWorks"
                                          */}
                                          {note.fromClient 
                                            ? (user?.isAdmin ? "Client" : "You") 
                                            : (user?.isAdmin ? "You" : "Apollo DroneWorks")
                                          }
                                        </span>
                                        <span 
                                          className={
                                            note.fromClient 
                                              ? "text-[10px] text-indigo-300/70 ml-2" 
                                              : "text-[10px] text-slate-500 ml-2"
                                          }
                                        >
                                          {note.createdAt ? new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                        </span>
                                      </div>
                                      <p className="text-sm text-slate-300">{note.content}</p>
                                    </div>
                                  </div>
                                ));
                              })()}
                              
                              {/* Reference for scrolling to bottom */}
                              <div id={`task-chat-end-${task.id}`} ref={notesEndRef} />
                            </div>
                          </div>
                          
                          {/* Message Input Form - Directly below the message window */}
                          <form 
                            className="flex gap-2" 
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (newTaskNote.trim()) {
                                addTaskNote.mutate({ 
                                  taskId: task.id, 
                                  note: newTaskNote 
                                });
                              }
                            }}
                          >
                            <Input
                              value={newTaskNote}
                              onChange={(e) => setNewTaskNote(e.target.value)}
                              placeholder="Type a message..."
                              className="flex-grow text-xs"
                            />
                            <Button 
                              type="submit" 
                              size="sm" 
                              disabled={addTaskNote.isPending || !newTaskNote.trim()}
                            >
                              {addTaskNote.isPending ? (
                                <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                              ) : (
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  width="16" 
                                  height="16" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="2" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  className="h-3 w-3"
                                >
                                  <path d="m3 10 5 5 5-5" />
                                  <path d="M13 10h5a2 2 0 0 1 2 2v4" />
                                  <path d="M18 16v3" />
                                </svg>
                              )}
                            </Button>
                          </form>
                          
                          <div className="flex justify-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs text-slate-300 hover:text-white"
                              onClick={() => handleSendMessage(task)}
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              Send Email with Task Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Modify the details of this task.
            </DialogDescription>
          </DialogHeader>
          {editingTask && <TaskForm task={editingTask} />}
        </DialogContent>
      </Dialog>

      {/* Attach File Dialog */}
      <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach File</DialogTitle>
            <DialogDescription>
              Add a file or deliverable URL to this task.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFileSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="fileName" className="text-sm font-medium">
                File Name
              </label>
              <Input
                id="fileName"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter a descriptive name for this file"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="fileUrl" className="text-sm font-medium">
                File URL
              </label>
              <Input
                id="fileUrl"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="Enter the URL to the file"
                required
              />
              <p className="text-xs text-slate-400">
                Enter the URL to any file accessible on the web (Google Drive, Dropbox, etc.)
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFileDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Attach File</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Message Dialog */}
      {selectedTask && (
        <TaskMessageForm
          projectId={projectId}
          taskId={selectedTask.id}
          isOpen={isMessageDialogOpen}
          onClose={() => {
            setIsMessageDialogOpen(false);
            setSelectedTask(null);
          }}
          taskTitle={selectedTask.title}
        />
      )}
    </div>
  );
};

export default ProjectTasks;