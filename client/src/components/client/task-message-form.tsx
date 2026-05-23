import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Link, Paperclip, FileText } from "lucide-react";

// TaskFile type (similar to the one in project-tasks.tsx)
type TaskFile = {
  id: number;
  name: string;
  url: string;
  fileType: string;
  taskId: number;
  uploadedAt?: string | Date;
};

// Task message form validation schema
const taskMessageSchema = z.object({
  recipientEmail: z.string().email("Please enter a valid email address"),
  subject: z.string().min(2, "Subject must be at least 2 characters"),
  message: z.string().min(5, "Message must be at least 5 characters"),
  includedFiles: z.array(z.number()).optional().default([]),
});

type TaskMessageFormValues = z.infer<typeof taskMessageSchema>;

interface TaskMessageFormProps {
  projectId: number;
  taskId: number;
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
}

const TaskMessageForm: React.FC<TaskMessageFormProps> = ({
  projectId,
  taskId,
  isOpen,
  onClose,
  taskTitle,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);

  // Fetch task files
  const { data: files = [], isLoading: isLoadingFiles } = useQuery<TaskFile[]>({
    queryKey: ["/api/client-projects", projectId, "tasks", taskId, "files"],
    queryFn: async () => {
      const res = await fetch(`/api/client-projects/${projectId}/tasks/${taskId}/files`);
      if (!res.ok) throw new Error("Failed to fetch task files");
      return res.json();
    },
    enabled: isOpen && !!taskId,
  });

  const form = useForm<TaskMessageFormValues>({
    resolver: zodResolver(taskMessageSchema),
    defaultValues: {
      recipientEmail: "",
      subject: `Re: ${taskTitle}`,
      message: "",
      includedFiles: [],
    },
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (data: TaskMessageFormValues) => {
      const res = await fetch(`/api/client-projects/${projectId}/tasks/${taskId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects", projectId, "tasks", taskId, "messages"] });
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TaskMessageFormValues) => {
    sendMessage.mutate({
      ...data,
      includedFiles: selectedFiles,
    });
  };

  const handleFileToggle = (fileId: number) => {
    setSelectedFiles((prev) => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };

  // Helper to get file icon
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "document":
        return <FileText className="h-4 w-4 text-blue-400" />;
      case "image":
        return <Paperclip className="h-4 w-4 text-green-400" />;
      case "video":
        return <Paperclip className="h-4 w-4 text-red-400" />;
      case "link":
      default:
        return <Link className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5" />
            Send Message About Task: {taskTitle}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipientEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter recipient email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter message subject" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Write your message here..." 
                      className="min-h-[120px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {files.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Attach Files from Task</div>
                <ScrollArea className="h-[120px] border rounded-md p-2">
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`file-${file.id}`}
                          checked={selectedFiles.includes(file.id)}
                          onCheckedChange={() => handleFileToggle(file.id)}
                        />
                        <label 
                          htmlFor={`file-${file.id}`}
                          className="flex items-center text-sm cursor-pointer"
                        >
                          {getFileIcon(file.fileType)}
                          <span className="ml-2">{file.name}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sendMessage.isPending}>
                {sendMessage.isPending ? "Sending..." : "Send Message"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskMessageForm;