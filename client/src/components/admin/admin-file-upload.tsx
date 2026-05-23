import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { File, Upload, X, Check, AlertTriangle } from "lucide-react";

interface AdminFileUploadProps {
  preselectedClientId?: number | null;
  preselectedProjectId?: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// File type definitions and helpers
const FILE_TYPES = {
  IMAGE: ["jpg", "jpeg", "png", "gif", "webp", "tiff", "svg"],
  DOCUMENT: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"],
  GEOTIFF: ["tif", "tiff", "geotiff"],
};

function getFileTypeFromExtension(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  
  if (FILE_TYPES.IMAGE.includes(extension)) {
    return "image";
  } else if (FILE_TYPES.DOCUMENT.includes(extension)) {
    return "document";
  } else if (FILE_TYPES.GEOTIFF.includes(extension)) {
    return "geotiff";
  } else {
    return "other";
  }
}

// Form schema
const formSchema = z.object({
  clientId: z.string().min(1, {
    message: "Please select a client",
  }),
  projectId: z.string().min(1, {
    message: "Please select a project",
  }),
  name: z.string().min(1, {
    message: "File name is required",
  }).max(255, {
    message: "File name cannot exceed 255 characters",
  }),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
});

export default function AdminFileUpload({ 
  preselectedClientId, 
  preselectedProjectId,
  onSuccess,
  onCancel
}: AdminFileUploadProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileTypeWarning, setFileTypeWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: preselectedClientId ? String(preselectedClientId) : "",
      projectId: preselectedProjectId ? String(preselectedProjectId) : "",
      name: "",
      description: "",
      isPublic: false,
    },
  });

  // Fetch clients
  const {
    data: clients,
    isLoading: isLoadingClients,
  } = useQuery({
    queryKey: ["/api/crm/clients"],
    queryFn: async () => {
      const response = await fetch("/api/crm/clients");
      if (!response.ok) throw new Error("Failed to fetch clients");
      return response.json();
    },
  });

  // Fetch projects based on selected client
  const {
    data: projects,
    isLoading: isLoadingProjects,
  } = useQuery({
    queryKey: ["/api/client-projects", form.watch("clientId")],
    queryFn: async () => {
      const clientId = form.watch("clientId");
      if (!clientId) return [];
      
      const response = await fetch(`/api/client-projects/client/${clientId}`);
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
    enabled: !!form.watch("clientId"),
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Update file name in form if not already set
      if (!form.getValues("name") || form.getValues("name") === "") {
        form.setValue("name", file.name);
      }
      
      // Check file type and show warning for unsupported types
      const fileType = getFileTypeFromExtension(file.name);
      if (fileType === "other") {
        setFileTypeWarning("This file type may not be supported for preview. It will be available for download.");
      } else {
        setFileTypeWarning(null);
      }
    }
  };

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", values.name);
      formData.append("description", values.description || "");
      formData.append("isPublic", values.isPublic.toString());
      
      // Get file type from extension
      const fileType = getFileTypeFromExtension(selectedFile.name);
      formData.append("fileType", fileType);

      // Set up progress tracking with XMLHttpRequest
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/client-projects/${values.projectId}/files`);
      
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(progress);
        }
      });
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          toast({
            title: "Success",
            description: "File uploaded successfully",
          });
          if (onSuccess) onSuccess();
        } else {
          const errorMessage = xhr.responseText || "Failed to upload file";
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
        setIsUploading(false);
      };
      
      xhr.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to upload file",
          variant: "destructive",
        });
        setIsUploading(false);
      };
      
      xhr.send(formData);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  // Cancel upload and reset state
  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  return (
    <div className="space-y-5 py-4">
      <div className="mb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-offwhite">Client</FormLabel>
                    <Select
                      disabled={isUploading || isLoadingClients || !!preselectedClientId}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Clear project selection when client changes
                        if (value !== field.value) {
                          form.setValue("projectId", "");
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-[#080d17] border-gold-dark/30 text-offwhite">
                          <SelectValue placeholder={isLoadingClients ? "Loading clients..." : "Select a client"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0b111f] border-gold-dark/30">
                        {clients?.map((client: any) => (
                          <SelectItem
                            key={client.id}
                            value={client.id.toString()}
                            className="text-offwhite hover:bg-[#132642] focus:bg-[#132642]"
                          >
                            {client.firstName} {client.lastName}
                            {client.company && ` - ${client.company}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-offwhite">Project</FormLabel>
                    <Select
                      disabled={
                        isUploading || 
                        isLoadingProjects || 
                        !form.watch("clientId") || 
                        (projects?.length === 0) ||
                        !!preselectedProjectId
                      }
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-[#080d17] border-gold-dark/30 text-offwhite">
                          <SelectValue 
                            placeholder={
                              isLoadingProjects
                                ? "Loading projects..."
                                : !form.watch("clientId")
                                ? "Select a client first"
                                : (projects?.length === 0)
                                ? "No projects available"
                                : "Select a project"
                            } 
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0b111f] border-gold-dark/30">
                        {projects?.map((project: any) => (
                          <SelectItem
                            key={project.id}
                            value={project.id.toString()}
                            className="text-offwhite hover:bg-[#132642] focus:bg-[#132642]"
                          >
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-5">
              <div>
                <FormLabel className="text-offwhite block mb-2">File</FormLabel>
                <div className="flex items-center space-x-4">
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-[#1b2f4d] hover:bg-[#284677] text-offwhite"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Browse Files
                  </Button>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                  
                  {selectedFile && (
                    <div className="flex flex-1 items-center rounded-md bg-[#080d17] p-2 shadow">
                      <File className="h-5 w-5 text-gold mr-2" />
                      <span className="text-offwhite truncate flex-1">{selectedFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-offwhite/70 hover:text-offwhite hover:bg-[#132642]"
                        onClick={() => setSelectedFile(null)}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {fileTypeWarning && (
                  <div className="flex items-center mt-2 text-amber-400 text-sm">
                    <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span>{fileTypeWarning}</span>
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-offwhite">File Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-[#080d17] border-gold-dark/30 text-offwhite"
                        disabled={isUploading}
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
                    <FormLabel className="text-offwhite">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="bg-[#080d17] border-gold-dark/30 text-offwhite min-h-[80px]"
                        placeholder="Add a description for this file (optional)"
                        disabled={isUploading}
                      />
                    </FormControl>
                    <FormDescription className="text-offwhite/50">
                      This description will be visible to clients when viewing the file.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gold-dark/30 p-3 bg-[#080d17]">
                    <div className="space-y-0.5">
                      <FormLabel className="text-offwhite">Client Visibility</FormLabel>
                      <FormDescription className="text-offwhite/50">
                        Make this file visible to the client in their portal
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isUploading}
                        className="data-[state=checked]:bg-gold"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-offwhite/70">
                  <span>Uploading file...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <Separator className="bg-gold-dark/30" />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isUploading}
                className="bg-[#0b111f] hover:bg-[#132642] border-gold-dark/30 text-offwhite"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="bg-[#1b2f4d] hover:bg-[#284677] text-offwhite"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-offwhite border-t-transparent rounded-full mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Upload File
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}