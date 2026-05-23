import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  File,
  FileText,
  Image,
  MoreVertical,
  Download,
  Eye,
  Trash2,
  Edit,
  Upload,
  Plus,
  Search,
  Map,
  X,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ClientFile } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import FileViewer from "../client/file-viewers/FileViewer";
import AdminFileUpload from "./admin-file-upload";


function getFileTypeIcon(type: string) {
  switch (type) {
    case "image":
      return <Image className="h-4 w-4 text-gold" />;
    case "geotiff":
      return <Map className="h-4 w-4 text-gold" />;
    // 3D model case removed
    case "document":
      return <FileText className="h-4 w-4 text-gold" />;
    default:
      return <File className="h-4 w-4 text-gold" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function ProjectFilesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<string | null>(null);
  const [publicFilter, setPublicFilter] = useState<boolean | null>(null);
  const [selectedFile, setSelectedFile] = useState<ClientFile | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ClientFile | null>(null);
  const [isUpdatingPublic, setIsUpdatingPublic] = useState<number | null>(null);

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/crm/clients");
        if (!response.ok) throw new Error("Failed to fetch clients");
        const data = await response.json();
        setClients(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load clients",
          variant: "destructive",
        });
      } finally {
        setIsLoadingClients(false);
      }
    };

    fetchClients();
  }, [toast]);

  // Fetch projects when client changes
  useEffect(() => {
    if (!selectedClientId) {
      setProjects([]);
      setSelectedProjectId(null);
      return;
    }

    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const response = await fetch(`/api/client-projects?clientId=${selectedClientId}`);
        if (!response.ok) throw new Error("Failed to fetch projects");
        const data = await response.json();
        setProjects(data);
        // Auto-select first project if any
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id.toString());
        } else if (data.length === 0) {
          setSelectedProjectId(null);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load projects",
          variant: "destructive",
        });
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [selectedClientId, toast]);

  // Fetch project files
  const {
    data: files,
    isLoading: isLoadingFiles,
    error: filesError,
  } = useQuery<ClientFile[]>({
    queryKey: ["/api/client-projects", selectedProjectId ? parseInt(selectedProjectId) : null, "files"],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const response = await fetch(`/api/client-projects/${selectedProjectId}/files`);
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json();
    },
    enabled: !!selectedProjectId,
  });

  // Filter files based on search, type, and public status
  const filteredFiles = files?.filter((file) => {
    let matches = true;
    
    // Filter by search query
    if (searchQuery) {
      matches = matches && (
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (file.description && file.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Filter by file type
    if (fileTypeFilter) {
      matches = matches && file.fileType === fileTypeFilter;
    }
    
    // Filter by public status
    if (publicFilter !== null) {
      matches = matches && (file.isPublic === publicFilter);
    }
    
    return matches;
  });

  // Handle file deletion
  const handleDeleteFile = async () => {
    if (!fileToDelete) return;
    
    try {
      const response = await apiRequest(
        "DELETE",
        `/api/client-projects/${selectedProjectId}/files/${fileToDelete.id}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to delete file");
      }
      
      // Refresh file list
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects", parseInt(selectedProjectId!), "files"] });
      
      toast({
        title: "Success",
        description: `${fileToDelete.name} has been deleted.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive",
      });
    } finally {
      setFileToDelete(null);
      setIsDeleteConfirmOpen(false);
    }
  };

  // Handle toggling public status
  const togglePublicStatus = async (file: ClientFile) => {
    setIsUpdatingPublic(file.id);
    
    try {
      const response = await apiRequest(
        "PUT",
        `/api/client-projects/${selectedProjectId}/files/${file.id}`,
        {
          isPublic: !file.isPublic,
        }
      );
      
      if (!response.ok) {
        throw new Error("Failed to update file");
      }
      
      // Refresh file list
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects", parseInt(selectedProjectId!), "files"] });
      
      toast({
        title: "Success",
        description: `${file.name} is now ${!file.isPublic ? "public" : "private"}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update file",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPublic(null);
    }
  };

  // Handle file upload completion
  const handleUploadSuccess = () => {
    setIsUploadDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/client-projects", parseInt(selectedProjectId!), "files"] });
    toast({
      title: "Success",
      description: "File uploaded successfully",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">Client & Project Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-select">Client</Label>
                <Select
                  disabled={isLoadingClients}
                  value={selectedClientId || ""}
                  onValueChange={(value) => {
                    setSelectedClientId(value);
                    setSelectedProjectId(null);
                  }}
                >
                  <SelectTrigger id="client-select" className="bg-[#080d17] border-gold-dark/30 text-offwhite">
                    <SelectValue placeholder={isLoadingClients ? "Loading clients..." : "Select a client"} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b111f] border-gold-dark/30">
                    {clients.map((client) => (
                      <SelectItem
                        key={client.id}
                        value={client.id.toString()}
                        className="text-offwhite hover:bg-[#132642] focus:bg-[#132642] focus:text-offwhite"
                      >
                        {client.firstName} {client.lastName}
                        {client.company && ` - ${client.company}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="project-select">Project</Label>
                <Select
                  disabled={isLoadingProjects || !selectedClientId || projects.length === 0}
                  value={selectedProjectId || ""}
                  onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger id="project-select" className="bg-[#080d17] border-gold-dark/30 text-offwhite">
                    <SelectValue 
                      placeholder={
                        isLoadingProjects 
                          ? "Loading projects..." 
                          : !selectedClientId 
                            ? "Select a client first"
                            : projects.length === 0
                              ? "No projects available"
                              : "Select a project"
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b111f] border-gold-dark/30">
                    {projects.map((project) => (
                      <SelectItem
                        key={project.id}
                        value={project.id.toString()}
                        className="text-offwhite hover:bg-[#132642] focus:bg-[#132642] focus:text-offwhite"
                      >
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-medium">Project Files</CardTitle>
          <Button
            size="sm"
            onClick={() => setIsUploadDialogOpen(true)}
            disabled={!selectedProjectId}
            className="bg-[#1b2f4d] hover:bg-[#284677] text-offwhite"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload File
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground text-offwhite/50" />
                <Input
                  placeholder="Search files..."
                  className="pl-8 bg-[#080d17] border-gold-dark/30 text-offwhite"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-row gap-2 items-center">
                <Select
                  value={fileTypeFilter || "all"}
                  onValueChange={(value) => setFileTypeFilter(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-[140px] bg-[#080d17] border-gold-dark/30 text-offwhite">
                    <SelectValue placeholder="File type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b111f] border-gold-dark/30">
                    <SelectItem value="all" className="text-offwhite hover:bg-[#132642] focus:bg-[#132642]">All types</SelectItem>
                    <SelectItem value="image" className="text-offwhite hover:bg-[#132642] focus:bg-[#132642]">Image</SelectItem>
                    <SelectItem value="document" className="text-offwhite hover:bg-[#132642] focus:bg-[#132642]">Document</SelectItem>
                    <SelectItem value="geotiff" className="text-offwhite hover:bg-[#132642] focus:bg-[#132642]">GeoTIFF</SelectItem>
                    {/* 3D Model option removed */}
                  </SelectContent>
                </Select>
                <Select
                  value={publicFilter === null ? "all" : (publicFilter ? "public" : "private")}
                  onValueChange={(value) => {
                    if (value === "all") setPublicFilter(null);
                    else if (value === "public") setPublicFilter(true);
                    else setPublicFilter(false);
                  }}
                >
                  <SelectTrigger className="w-[140px] bg-[#080d17] border-gold-dark/30 text-offwhite">
                    <SelectValue placeholder="Access" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b111f] border-gold-dark/30">
                    <SelectItem value="all" className="text-offwhite hover:bg-[#132642] focus:bg-[#132642]">All files</SelectItem>
                    <SelectItem value="public" className="text-offwhite hover:bg-[#132642] focus:bg-[#132642]">Public</SelectItem>
                    <SelectItem value="private" className="text-offwhite hover:bg-[#132642] focus:bg-[#132642]">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {!selectedProjectId ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-md border-gold-dark/30 bg-[#080d17]">
                <File className="h-10 w-10 text-gold-dark/30 mb-3" />
                <h3 className="text-lg font-medium text-offwhite mb-1">No Project Selected</h3>
                <p className="text-offwhite/70 mb-4">
                  Please select a client and project to manage files
                </p>
              </div>
            ) : isLoadingFiles ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-md border-gold-dark/30 bg-[#080d17]">
                <Loader2 className="h-10 w-10 text-gold animate-spin mb-3" />
                <h3 className="text-lg font-medium text-offwhite">Loading files...</h3>
              </div>
            ) : filesError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-md border-gold-dark/30 bg-[#080d17]">
                <div className="text-destructive mb-2">Error loading files</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/client-projects", parseInt(selectedProjectId), "files"] })}
                  className="bg-[#0b111f] border-gold-dark/30 text-offwhite hover:bg-[#132642] hover:text-offwhite"
                >
                  Retry
                </Button>
              </div>
            ) : filteredFiles && filteredFiles.length > 0 ? (
              <div className="rounded-md border border-gold-dark/30">
                <Table>
                  <TableHeader className="bg-[#080d17]">
                    <TableRow className="hover:bg-[#0b111f] border-gold-dark/30">
                      <TableHead className="text-offwhite w-[40%]">File</TableHead>
                      <TableHead className="text-offwhite">Type</TableHead>
                      <TableHead className="text-offwhite">Size</TableHead>
                      <TableHead className="text-offwhite">Uploaded</TableHead>
                      <TableHead className="text-offwhite text-center">Public</TableHead>
                      <TableHead className="text-offwhite text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.map((file) => (
                      <TableRow key={file.id} className="hover:bg-[#0b111f] border-gold-dark/30">
                        <TableCell className="text-offwhite">
                          <div className="flex items-center space-x-2">
                            {getFileTypeIcon(file.fileType)}
                            <div className="flex flex-col">
                              <span className="font-medium truncate max-w-[280px]">{file.name}</span>
                              {file.description && (
                                <span className="text-xs text-offwhite/70 truncate max-w-[280px]">
                                  {file.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-offwhite">
                          <Badge 
                            variant="outline" 
                            className={`
                              ${file.fileType === 'image' && 'bg-blue-950/30 text-blue-300 border-blue-800/50'}
                              ${file.fileType === 'document' && 'bg-amber-950/30 text-amber-300 border-amber-800/50'}
                              ${file.fileType === 'geotiff' && 'bg-green-950/30 text-green-300 border-green-800/50'}
                              {/* 3D model styling removed */}
                            `}
                          >
                            {file.fileType.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-offwhite/70 text-sm">
                          {formatFileSize(file.size)}
                        </TableCell>
                        <TableCell className="text-offwhite/70 text-sm">
                          {formatDate(file.uploadedAt)}
                        </TableCell>
                        <TableCell className="text-center">
                          {isUpdatingPublic === file.id ? (
                            <div className="flex justify-center">
                              <Loader2 className="h-4 w-4 animate-spin text-gold" />
                            </div>
                          ) : (
                            <Switch
                              checked={file.isPublic}
                              onCheckedChange={() => togglePublicStatus(file)}
                              className="data-[state=checked]:bg-gold"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 text-offwhite/70 hover:text-offwhite hover:bg-[#132642]"
                              >
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[160px] bg-[#0b111f] border-gold-dark/30">
                              <DropdownMenuLabel className="text-offwhite">Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-gold-dark/30" />
                              <DropdownMenuItem
                                className="text-offwhite hover:bg-[#132642] focus:bg-[#132642] cursor-pointer"
                                onClick={() => {
                                  setSelectedFile(file);
                                  setIsViewerOpen(true);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                <span>View</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-offwhite hover:bg-[#132642] focus:bg-[#132642] cursor-pointer"
                                asChild
                              >
                                <a 
                                  href={file.fileUrl} 
                                  download 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center"
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  <span>Download</span>
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gold-dark/30" />
                              <DropdownMenuItem
                                className="text-red-400 hover:bg-red-900/20 focus:bg-red-900/20 hover:text-red-300 focus:text-red-300 cursor-pointer"
                                onClick={() => {
                                  setFileToDelete(file);
                                  setIsDeleteConfirmOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-md border-gold-dark/30 bg-[#080d17]">
                <File className="h-10 w-10 text-gold-dark/30 mb-3" />
                <h3 className="text-lg font-medium text-offwhite mb-1">No Files Found</h3>
                {searchQuery || fileTypeFilter || publicFilter !== null ? (
                  <p className="text-offwhite/70 mb-4">
                    No files match your search criteria. Try adjusting your filters.
                  </p>
                ) : (
                  <p className="text-offwhite/70 mb-4">
                    This project doesn't have any files yet. Upload your first file to get started.
                  </p>
                )}
                <Button
                  size="sm"
                  onClick={() => setIsUploadDialogOpen(true)}
                  className="bg-[#1b2f4d] hover:bg-[#284677] text-offwhite"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File viewer dialog */}
      {selectedFile && isViewerOpen && (
        <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
          <DialogContent className="sm:max-w-[700px] bg-[#0b111f] border-gold-dark/30 text-offwhite">
            <DialogTitle className="text-xl font-medium text-offwhite">{selectedFile.name}</DialogTitle>
            <DialogDescription>
              <FileViewer
                fileUrl={selectedFile.fileUrl}
                fileName={selectedFile.name}
                fileType={selectedFile.fileType}
              />
            </DialogDescription>
            <DialogFooter>
              <Button 
                onClick={() => {
                  setSelectedFile(null);
                  setIsViewerOpen(false);
                }}
                className="bg-[#1b2f4d] hover:bg-[#284677] text-offwhite"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Upload file dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[700px] bg-[#0b111f] border-gold-dark/30 text-offwhite">
          <DialogTitle className="text-xl font-medium text-offwhite">Upload File</DialogTitle>
          <AdminFileUpload
            preselectedClientId={selectedClientId ? parseInt(selectedClientId) : null}
            preselectedProjectId={selectedProjectId ? parseInt(selectedProjectId) : null}
            onSuccess={handleUploadSuccess}
            onCancel={() => setIsUploadDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#0b111f] border-gold-dark/30 text-offwhite">
          <DialogTitle className="text-xl font-medium text-offwhite">Delete File?</DialogTitle>
          <div className="py-4">
            <p className="text-offwhite/80 mb-2">
              Are you sure you want to delete this file?
            </p>
            {fileToDelete && (
              <div className="flex items-center space-x-2 p-3 bg-[#080d17] rounded border border-gold-dark/30">
                {getFileTypeIcon(fileToDelete.fileType)}
                <span className="text-offwhite font-medium truncate">{fileToDelete.name}</span>
              </div>
            )}
            <p className="text-red-400 text-sm mt-4">
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="bg-[#0b111f] hover:bg-[#132642] border-gold-dark/30 text-offwhite"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleDeleteFile}
              className="bg-red-900/70 hover:bg-red-900 text-red-100"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}