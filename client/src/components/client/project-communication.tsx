import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, File, Image, Paperclip, Download, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Message schema
const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
  attachments: z.array(z.any()).optional(),
});

type MessageFormValues = z.infer<typeof messageSchema>;

// Define the message type
type ProjectMessage = {
  id: number;
  projectId: number;
  userId: number;
  userName: string;
  userAvatar?: string;
  content: string;
  attachments?: {
    id: number;
    name: string;
    url: string;
    type: string; // 'image', 'file'
  }[];
  isClientMessage: boolean;
  createdAt: string;
};

interface ProjectCommunicationProps {
  projectId: number;
  clientId: number;
}

const ProjectCommunication: React.FC<ProjectCommunicationProps> = ({ projectId, clientId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: "",
      attachments: [],
    },
  });

  // Fetch project messages
  const { 
    data: messages = [], 
    isLoading, 
    error 
  } = useQuery<ProjectMessage[]>({
    queryKey: ["/api/client-projects", projectId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/client-projects/${projectId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!projectId,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (data: MessageFormValues) => {
      setIsSubmitting(true);
      
      try {
        // In a real implementation, we would first upload any attachments
        // and then include their URLs in the message data
        const processedAttachments = attachments.map(file => ({
          name: file.name,
          url: URL.createObjectURL(file),
          type: file.type.startsWith('image/') ? 'image' : 'file',
        }));
        
        // Send the message with attachment info
        const response = await apiRequest(
          "POST", 
          `/api/client-projects/${projectId}/messages`, 
          {
            content: data.content,
            attachments: processedAttachments,
            clientId,
            isClientMessage: true,
          }
        );
        
        return response.json();
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects", projectId, "messages"] });
      // Reset form and attachments
      reset();
      setAttachments([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...filesArray]);
    }
    // Clear the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Form submission handler
  const onSubmit = (data: MessageFormValues) => {
    sendMessage.mutate(data);
  };

  // Scroll to bottom of messages when new ones arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle file type icon
  const getFileIcon = (type: string) => {
    return type === 'image' ? <Image className="h-4 w-4" /> : <File className="h-4 w-4" />;
  };

  // Format messages by date sections
  const messagesByDate: { [key: string]: ProjectMessage[] } = {};
  
  messages.forEach(message => {
    const date = format(new Date(message.createdAt), "MMMM d, yyyy");
    if (!messagesByDate[date]) {
      messagesByDate[date] = [];
    }
    messagesByDate[date].push(message);
  });

  return (
    <Card className="w-full h-[600px] bg-[#080d17] border-gold-dark/30 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-medium text-gold-gradient">Project Communication</CardTitle>
        <CardDescription>Chat with the project team and share files</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full max-h-[calc(600px-9rem)] px-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
              <p>Error loading messages</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="bg-[#132642] p-6 rounded-full mb-4">
                <Send className="h-8 w-8 text-gold" />
              </div>
              <h3 className="text-lg font-medium text-offwhite mb-2">No messages yet</h3>
              <p className="text-offwhite/70 max-w-xs">
                Start the conversation by sending a message to the project team. They'll respond as soon as possible.
              </p>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {Object.entries(messagesByDate).map(([date, dateMessages]) => (
                <div key={date} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Separator className="flex-grow bg-gold-dark/20" />
                    <span className="text-xs text-offwhite/50 px-2 py-1 bg-[#132642] rounded-full">
                      {date}
                    </span>
                    <Separator className="flex-grow bg-gold-dark/20" />
                  </div>
                  
                  {dateMessages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.isClientMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`
                          max-w-[80%] space-y-2
                          ${message.isClientMessage 
                            ? 'items-end' 
                            : 'items-start'}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          {!message.isClientMessage && (
                            <Avatar className="h-6 w-6">
                              {message.userAvatar ? (
                                <AvatarImage src={message.userAvatar} alt={message.userName} />
                              ) : (
                                <AvatarFallback className="bg-blue-500 text-xs text-white">
                                  {message.userName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          )}
                          <span className="text-xs text-offwhite/70">
                            {message.isClientMessage ? 'You' : message.userName}
                          </span>
                          <span className="text-xs text-offwhite/50">
                            {format(new Date(message.createdAt), "h:mm a")}
                          </span>
                        </div>
                        
                        <div 
                          className={`
                            p-3 rounded-lg
                            ${message.isClientMessage 
                              ? 'bg-blue-600 text-white rounded-tr-none ml-auto' 
                              : 'bg-[#132642] text-offwhite rounded-tl-none mr-auto'}
                          `}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                        
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {message.attachments.map((attachment) => (
                              <a 
                                key={attachment.id}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`
                                  flex items-center gap-2 px-3 py-2 rounded-md text-sm
                                  ${message.isClientMessage 
                                    ? 'bg-blue-700 text-white hover:bg-blue-800' 
                                    : 'bg-[#0b111f] text-offwhite hover:bg-[#132642]'}
                                  border border-gold-dark/30 transition-colors
                                `}
                              >
                                {getFileIcon(attachment.type)}
                                <span className="truncate max-w-[140px]">{attachment.name}</span>
                                <Download className="h-3 w-3" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="p-4 pt-2 border-t border-gold-dark/20 mt-auto">
        <form 
          onSubmit={handleSubmit(onSubmit)} 
          className="w-full space-y-2"
        >
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-2">
              {attachments.map((file, index) => (
                <div 
                  key={index}
                  className="bg-[#132642] text-offwhite text-xs rounded-full px-2 py-1 flex items-center gap-1"
                >
                  {file.type.startsWith('image/') ? (
                    <Image className="h-3 w-3" />
                  ) : (
                    <File className="h-3 w-3" />
                  )}
                  <span className="truncate max-w-[100px]">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 text-offwhite/70 hover:bg-transparent hover:text-red-400"
                    onClick={() => removeAttachment(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-end gap-2">
            <div className="relative flex-grow">
              <Textarea
                {...register("content")}
                placeholder="Type your message here..."
                className="min-h-[80px] bg-[#132642] border-gold-dark/30 text-offwhite resize-none pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute bottom-2 right-2 h-8 w-8 p-0 text-offwhite/70 hover:bg-transparent hover:text-gold"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
              />
            </div>
            <Button
              type="submit"
              className="h-10 bg-gradient-to-r from-[#b8a15c] to-[#e1cc81] hover:from-[#c4ab64] hover:to-[#ebd58a] text-[#1d1d1d] font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {errors.content && (
            <p className="text-xs text-red-500 mt-1">{errors.content.message}</p>
          )}
        </form>
      </CardFooter>
    </Card>
  );
};

export default ProjectCommunication;