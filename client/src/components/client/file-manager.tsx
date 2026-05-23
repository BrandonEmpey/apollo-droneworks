import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Upload, 
  Download, 
  FileType, 
  FileText, 
  Image, 
  Video, 
  FileType as File3d, 
  FileSymlink, 
  Loader2, 
  Trash2, 
  Link,
  Share,
  Eye
} from "lucide-react";
import { format } from "date-fns";

// Define the file item type based on our expected response from the server
interface FileItem {
  id: number;
  clientId: number;
  name: string;
  description?: string;
  fileUrl: string;
  fileType: 'image' | 'video' | 'document' | '3d_model' | 'other';
  thumbnailUrl?: string;
  size: number;
  uploadedAt: string;
  expiresAt?: string;
  isPublic: boolean;
  bookingId?: number;
  projectId?: number;
}

// Props definition
interface FileManagerProps {
  clientId: number;
  files?: FileItem[];
  isAdmin: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function FileManager({ clientId, files = [], isAdmin, isLoading = false, onRefresh }: FileManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fileType, setFileType] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileViewOpen, setFileViewOpen] = useState<boolean>(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [fileToDelete, setFileToDelete] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadDetails, setUploadDetails] = useState({
    name: "",
    description: "",
    fileType: "document",
    isPublic: false
  });

  // File upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setUploading(true);
      try {
        const response = await apiRequest(
          "POST", 
          `/api/clients/${clientId}/files`, 
          formData,
          true // isFormData flag
        );
        return await response.json();
      } catch (error) {
        console.error("Upload error:", error);
        throw error;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "File Uploaded",
        description: "The file was uploaded successfully.",
      });
      // Reset upload form
      setUploadFile(null);
      setUploadDetails({
        name: "",
        description: "",
        fileType: "document",
        isPublic: false
      });
      setUploadDialogOpen(false);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/files`] });
      if (onRefresh) onRefresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "There was an error uploading the file.",
        variant: "destructive",
      });
    }
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const response = await apiRequest("DELETE", `/api/clients/${clientId}/files/${fileId}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "File Deleted",
        description: "The file was deleted successfully.",
      });
      setDeleteDialogOpen(false);
      setFileToDelete(null);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/files`] });
      if (onRefresh) onRefresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "There was an error deleting the file.",
        variant: "destructive",
      });
    }
  });

  // File sharing mutation for toggling public access
  const toggleShareMutation = useMutation({
    mutationFn: async ({ fileId, isPublic }: { fileId: number, isPublic: boolean }) => {
      const response = await apiRequest(
        "PATCH", 
        `/api/clients/${clientId}/files/${fileId}`, 
        { isPublic }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.isPublic ? "File Shared" : "File Unshared",
        description: data.isPublic 
          ? "The file is now publicly accessible via link." 
          : "The file is now private.",
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/files`] });
      if (onRefresh) onRefresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Operation Failed",
        description: error.message || "There was an error updating the file.",
        variant: "destructive",
      });
    }
  });

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      
      // Auto-fill the name field with the file name (without extension)
      const fileName = file.name.split('.').slice(0, -1).join('.');
      setUploadDetails(prev => ({
        ...prev,
        name: fileName || file.name // fallback to full name if we couldn't extract it
      }));
      
      // Try to determine file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let fileType = "other";
      
      if (file.type.startsWith('image/')) {
        fileType = "image";
      } else if (file.type.startsWith('video/')) {
        fileType = "video";
      } else if (file.type.startsWith('text/') || 
                file.type === 'application/pdf' || 
                ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExtension || '')) {
        fileType = "document";
      } else if (['obj', 'stl', 'fbx', 'glb', 'gltf'].includes(fileExtension || '')) {
        fileType = "3d_model";
      }
      
      setUploadDetails(prev => ({
        ...prev,
        fileType
      }));
    }
  };

  // Submit upload form
  const handleUploadSubmit = () => {
    if (!uploadFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    if (!uploadDetails.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a name for the file.",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', uploadDetails.name);
    formData.append('description', uploadDetails.description);
    formData.append('fileType', uploadDetails.fileType);
    formData.append('isPublic', uploadDetails.isPublic ? 'true' : 'false');
    formData.append('clientId', clientId.toString());
    
    uploadFileMutation.mutate(formData);
  };

  // Handle file deletion
  const handleDeleteFile = (fileId: number) => {
    setFileToDelete(fileId);
    setDeleteDialogOpen(true);
  };
  
  // Handle file sharing toggle
  const handleToggleShare = (file: FileItem) => {
    toggleShareMutation.mutate({
      fileId: file.id,
      isPublic: !file.isPublic
    });
  };
  
  // View file details
  const handleViewFile = (file: FileItem) => {
    setSelectedFile(file);
    setFileViewOpen(true);
  };

  // Filter files by type
  const filteredFiles = files.filter(file => {
    if (fileType === "all") return true;
    return file.fileType === fileType;
  });

  // Sort files by date
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    const dateA = new Date(a.uploadedAt).getTime();
    const dateB = new Date(b.uploadedAt).getTime();
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get icon for file type
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <Image className="h-6 w-6 text-blue-500" />;
      case 'video':
        return <Video className="h-6 w-6 text-red-500" />;
      case 'document':
        return <FileText className="h-6 w-6 text-yellow-500" />;
      case '3d_model':
        return <File3d className="h-6 w-6 text-green-500" />;
      default:
        return <FileType className="h-6 w-6 text-gray-500" />;
    }
  };

  // Get file category label
  const getFileTypeLabel = (fileType: string): string => {
    switch (fileType) {
      case 'image': return 'Image';
      case 'video': return 'Video';
      case 'document': return 'Document';
      case '3d_model': return '3D Model';
      default: return 'Other';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-offwhite">Project Files</h2>
          <p className="text-sm text-offwhite/70">
            {isAdmin ? "Manage files shared with this client" : "Access your project files and deliverables"}
          </p>
        </div>
        
        <div className="flex gap-2">
          {isAdmin && (
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gold text-black hover:bg-gold-light">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] bg-[#080d17] border-gold-dark/40">
                <DialogHeader>
                  <DialogTitle className="text-offwhite">Upload File</DialogTitle>
                  <DialogDescription>
                    Upload a file to share with the client. The file will be securely stored and accessible to the client.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid w-full items-center gap-1.5">
                    <label htmlFor="file-upload" className="text-sm font-medium text-offwhite">
                      File
                    </label>
                    <div className="flex items-center justify-center w-full">
                      <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-black-light/40 border-gold-dark/40 hover:bg-black-light/70">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {uploadFile ? (
                            <>
                              <FileSymlink className="w-8 h-8 mb-3 text-gold" />
                              <p className="mb-2 text-sm text-offwhite truncate max-w-[300px]">
                                <span className="font-semibold">{uploadFile.name}</span>
                              </p>
                              <p className="text-xs text-offwhite/70">
                                {formatFileSize(uploadFile.size)}
                              </p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mb-3 text-gold" />
                              <p className="mb-2 text-sm text-offwhite">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-offwhite/70">
                                SVG, PNG, JPG, GIF, PDF, DOCX, MP4, OBJ or STL (MAX. 50MB)
                              </p>
                            </>
                          )}
                        </div>
                        <input 
                          id="file-upload" 
                          type="file" 
                          className="hidden" 
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                  </div>
                  
                  <div className="grid w-full items-center gap-1.5">
                    <label htmlFor="name" className="text-sm font-medium text-offwhite">
                      Name
                    </label>
                    <Input
                      id="name"
                      value={uploadDetails.name}
                      onChange={(e) => setUploadDetails({...uploadDetails, name: e.target.value})}
                      placeholder="Enter file name"
                      className="bg-black-light border-gold-dark/40 text-offwhite"
                    />
                  </div>
                  
                  <div className="grid w-full items-center gap-1.5">
                    <label htmlFor="description" className="text-sm font-medium text-offwhite">
                      Description (Optional)
                    </label>
                    <Input
                      id="description"
                      value={uploadDetails.description}
                      onChange={(e) => setUploadDetails({...uploadDetails, description: e.target.value})}
                      placeholder="Enter file description"
                      className="bg-black-light border-gold-dark/40 text-offwhite"
                    />
                  </div>
                  
                  <div className="grid w-full items-center gap-1.5">
                    <label htmlFor="fileType" className="text-sm font-medium text-offwhite">
                      File Type
                    </label>
                    <Select
                      value={uploadDetails.fileType}
                      onValueChange={(value) => setUploadDetails({...uploadDetails, fileType: value})}
                    >
                      <SelectTrigger id="fileType" className="bg-black-light border-gold-dark/40 text-offwhite">
                        <SelectValue placeholder="Select file type" />
                      </SelectTrigger>
                      <SelectContent className="bg-black-light border-gold-dark/40 text-offwhite">
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="3d_model">3D Model</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={uploadDetails.isPublic}
                      onChange={(e) => setUploadDetails({...uploadDetails, isPublic: e.target.checked})}
                      className="form-checkbox h-4 w-4 text-gold border-gold-dark/40 rounded bg-black-light"
                    />
                    <label htmlFor="isPublic" className="text-sm text-offwhite">
                      Make file publicly accessible via link
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setUploadDialogOpen(false)}
                    className="text-offwhite border-gold-dark/40 hover:bg-black-light/70"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUploadSubmit}
                    disabled={uploading || !uploadFile || !uploadDetails.name.trim()}
                    className="bg-gold text-black hover:bg-gold-light"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          <Select
            value={fileType}
            onValueChange={setFileType}
          >
            <SelectTrigger className="w-[140px] bg-[#0b111f] border-gold-dark/40 text-offwhite">
              <SelectValue placeholder="File Type" />
            </SelectTrigger>
            <SelectContent className="bg-[#0b111f] border-gold-dark/40 text-offwhite">
              <SelectItem value="all">All Files</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="3d_model">3D Models</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={sortOrder}
            onValueChange={(value: string) => setSortOrder(value as "newest" | "oldest")}
          >
            <SelectTrigger className="w-[140px] bg-[#0b111f] border-gold-dark/40 text-offwhite">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="bg-[#0b111f] border-gold-dark/40 text-offwhite">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      ) : sortedFiles.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center bg-black-light/40 rounded-lg border border-gold-dark/20">
          <FileSymlink className="h-12 w-12 mb-4 text-offwhite/30" />
          <h3 className="text-lg font-medium text-offwhite">No Files Found</h3>
          <p className="text-sm text-offwhite/70 max-w-md mt-2">
            {isAdmin 
              ? "No files have been uploaded for this client yet. Upload files to share with them."
              : "No files have been shared with you yet. Check back later or contact support."}
          </p>
          {isAdmin && (
            <Button 
              className="mt-4 bg-gold text-black hover:bg-gold-light"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload First File
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedFiles.map((file) => (
            <Card key={file.id} className="bg-black-light/70 border-gold-dark/30 overflow-hidden flex flex-col">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    {getFileIcon(file.fileType)}
                    <CardTitle className="text-offwhite text-base truncate">{file.name}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-offwhite/70 text-xs">
                  {getFileTypeLabel(file.fileType)} • {formatFileSize(file.size)}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 pb-2 text-sm">
                {file.description && (
                  <p className="text-offwhite/80 text-xs line-clamp-2">{file.description}</p>
                )}
                <p className="text-offwhite/60 text-xs mt-2">
                  Uploaded: {format(new Date(file.uploadedAt), 'MMM d, yyyy')}
                </p>
              </CardContent>
              <CardFooter className="p-4 pt-2 mt-auto flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-offwhite border-gold-dark/30 hover:bg-[#0b111f] flex-1"
                  onClick={() => handleViewFile(file)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  View
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-offwhite border-gold-dark/30 hover:bg-[#0b111f] flex-1"
                  asChild
                >
                  <a href={file.fileUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download
                  </a>
                </Button>
                
                {isAdmin && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={`border-gold-dark/30 hover:bg-[#0b111f] flex-1 ${file.isPublic ? 'text-green-400' : 'text-offwhite'}`}
                      onClick={() => handleToggleShare(file)}
                    >
                      {toggleShareMutation.isPending && toggleShareMutation.variables?.fileId === file.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Share className="h-3.5 w-3.5 mr-1" />
                      )}
                      {file.isPublic ? 'Shared' : 'Share'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-400 border-gold-dark/30 hover:bg-[#0b111f] hover:text-red-500 flex-1"
                      onClick={() => handleDeleteFile(file.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* File View Dialog */}
      <Dialog open={fileViewOpen} onOpenChange={setFileViewOpen}>
        {selectedFile && (
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] bg-[#080d17] border-gold-dark/40">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {getFileIcon(selectedFile.fileType)}
                <DialogTitle className="text-offwhite">{selectedFile.name}</DialogTitle>
              </div>
              <DialogDescription>
                {selectedFile.description || "No description provided."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 overflow-y-auto max-h-[60vh]">
              {selectedFile.fileType === 'image' ? (
                <div className="flex justify-center">
                  <img 
                    src={selectedFile.fileUrl} 
                    alt={selectedFile.name} 
                    className="max-w-full max-h-[400px] object-contain rounded-md" 
                  />
                </div>
              ) : selectedFile.fileType === 'video' ? (
                <div className="flex justify-center">
                  <video 
                    src={selectedFile.fileUrl} 
                    controls 
                    className="max-w-full max-h-[400px] rounded-md"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : selectedFile.fileType === 'document' && (
                selectedFile.fileUrl.endsWith('.pdf') || 
                selectedFile.fileUrl.includes('.pdf?')
              ) ? (
                <div className="flex justify-center">
                  <iframe 
                    src={selectedFile.fileUrl} 
                    className="w-full h-[400px] border-0 rounded-md" 
                    title={selectedFile.name}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <FileSymlink className="h-16 w-16 text-gold mb-4" />
                  <p className="text-center text-offwhite">
                    This file type cannot be previewed directly. 
                    Please download the file to view its contents.
                  </p>
                </div>
              )}
              
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-offwhite/80">File Type</h3>
                    <p className="text-sm text-offwhite">{getFileTypeLabel(selectedFile.fileType)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-offwhite/80">Size</h3>
                    <p className="text-sm text-offwhite">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-offwhite/80">Uploaded On</h3>
                    <p className="text-sm text-offwhite">
                      {format(new Date(selectedFile.uploadedAt), 'MMM d, yyyy, h:mm a')}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-offwhite/80">Access</h3>
                    <p className="text-sm text-offwhite">
                      {selectedFile.isPublic ? (
                        <span className="flex items-center">
                          <Share className="h-4 w-4 mr-1 text-green-400" />
                          Public (via link)
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Link className="h-4 w-4 mr-1" />
                          Private
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                {selectedFile.isPublic && (
                  <div className="pt-2">
                    <h3 className="text-sm font-medium text-offwhite/80 mb-1">Public Share Link</h3>
                    <div className="flex">
                      <Input 
                        value={`${window.location.origin}/shared/file/${selectedFile.id}`}
                        readOnly
                        className="bg-black-light border-gold-dark/40 text-offwhite flex-1 text-xs"
                      />
                      <Button 
                        variant="outline"
                        className="ml-2 border-gold-dark/40 text-offwhite hover:bg-[#0b111f]"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/shared/file/${selectedFile.id}`
                          );
                          toast({
                            title: "Link Copied",
                            description: "The share link has been copied to your clipboard.",
                          });
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-xs text-offwhite/60 mt-1">
                      Anyone with this link can access the file without logging in.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setFileViewOpen(false)}
                className="text-offwhite border-gold-dark/40 hover:bg-[#0b111f]"
              >
                Close
              </Button>
              <Button
                asChild
                className="bg-gold text-black hover:bg-gold-light"
              >
                <a href={selectedFile.fileUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#080d17] border-gold-dark/40 text-offwhite">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-offwhite border-gold-dark/40 hover:bg-[#0b111f]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (fileToDelete !== null) {
                  deleteFileMutation.mutate(fileToDelete);
                }
              }}
              disabled={deleteFileMutation.isPending}
            >
              {deleteFileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}