import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Upload, 
  FileUp, 
  Trash2, 
  Edit, 
  Eye, 
  Download,
  ImageIcon,
  Map,
  Box,
  Settings,
  FolderOpen
} from "lucide-react";

interface VirtualTour {
  id: number;
  name: string;
  description?: string;
  projectId?: number;
  tourPath: string;
  thumbnailUrl?: string;
  isPublic: boolean;
  hasVrMode: boolean;
  fileSizeMb?: number;
  status: string;
  uploadedAt: string;
  panoramaCount: number;
  has2dMaps: boolean;
  has3dModels: boolean;
  tourType: string;
  projectName?: string;
}

export default function VirtualTourManager() {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadMode, setUploadMode] = useState<'files' | 'zip'>('zip');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [tourStructure, setTourStructure] = useState<any>(null);
  const [entryPoint, setEntryPoint] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tours = [], isLoading } = useQuery({
    queryKey: ["/api/admin/virtual-tours"],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/admin/projects"],
  });

  // Enhanced file validation for 3DVista tours
  const validateTourFiles = (files: File[]) => {
    const errors: string[] = [];
    const fileNames = files.map(f => f.name.toLowerCase());
    
    // Check for HTML entry point
    const htmlFiles = fileNames.filter(name => name.endsWith('.html'));
    if (htmlFiles.length === 0) {
      errors.push("No HTML entry point found. 3DVista tours require an HTML file (usually index.html or tour.html)");
    }
    
    // Check for JavaScript files (3DVista player)
    const jsFiles = fileNames.filter(name => name.endsWith('.js'));
    if (jsFiles.length === 0) {
      errors.push("No JavaScript files found. 3DVista tours require player scripts");
    }
    
    // Check for CSS files
    const cssFiles = fileNames.filter(name => name.endsWith('.css'));
    if (cssFiles.length === 0) {
      errors.push("No CSS files found. Tours may not display properly without styling");
    }
    
    // Check for image files
    const imageFiles = fileNames.filter(name => 
      name.endsWith('.jpg') || name.endsWith('.jpeg') || 
      name.endsWith('.png') || name.endsWith('.webp')
    );
    if (imageFiles.length === 0) {
      errors.push("No image files found. Virtual tours require panoramic images");
    }
    
    // Auto-detect entry point
    let detectedEntry = '';
    if (htmlFiles.includes('index.html')) {
      detectedEntry = 'index.html';
    } else if (htmlFiles.includes('tour.html')) {
      detectedEntry = 'tour.html';
    } else if (htmlFiles.length > 0) {
      detectedEntry = htmlFiles[0];
    }
    
    setEntryPoint(detectedEntry);
    setValidationErrors(errors);
    
    return { isValid: errors.length === 0, detectedEntry };
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  };

  // Handle file selection (both drag-drop and click)
  const handleFileSelection = (files: File[]) => {
    if (uploadMode === 'zip') {
      const zipFiles = files.filter(f => f.name.toLowerCase().endsWith('.zip'));
      if (zipFiles.length === 0) {
        toast({
          title: "Invalid file type",
          description: "Please select a ZIP file containing your 3DVista tour",
          variant: "destructive"
        });
        return;
      }
      setSelectedFiles(zipFiles);
      // Note: ZIP validation happens on server-side after extraction
    } else {
      setSelectedFiles(files);
      validateTourFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelection(Array.from(e.target.files));
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (tourId: number) => {
      await apiRequest("DELETE", `/api/admin/virtual-tours/${tourId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-tours"] });
      toast({
        title: "Tour Deleted",
        description: "Virtual tour has been successfully deleted.",
      });
    },
  });

  const handleFileUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const files = (event.currentTarget.querySelector('input[type="file"]') as HTMLInputElement)?.files;
    
    if (!files || files.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select tour files to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Add files to form data
      for (let i = 0; i < files.length; i++) {
        formData.append('tourFiles', files[i]);
      }

      const response = await apiRequest("POST", "/api/admin/virtual-tours/upload", formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-tours"] });
      setShowUploadDialog(false);
      
      toast({
        title: "Upload Successful",
        description: "Virtual tour has been uploaded and processed.",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload virtual tour files.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const getTourTypeColor = (type: string) => {
    switch (type) {
      case "construction": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "inspection": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "real_estate": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const formatFileSize = (sizeMb?: number) => {
    if (!sizeMb) return "Unknown size";
    if (sizeMb < 1000) return `${sizeMb.toFixed(1)} MB`;
    return `${(sizeMb / 1000).toFixed(1)} GB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-offwhite">Virtual Tour Manager</h2>
          <p className="text-offwhite/60">Upload and manage 3DVista virtual tours for client projects</p>
        </div>
        
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gold text-[#080d17] hover:bg-gold/90">
              <Upload className="h-4 w-4 mr-2" />
              Upload Tour
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Virtual Tour</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Tour Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., Construction Progress Week 5"
                    required
                    className="bg-dark-card border-dark-border text-offwhite"
                  />
                </div>
                
                <div>
                  <Label htmlFor="tourType">Tour Type</Label>
                  <Select name="tourType" required>
                    <SelectTrigger className="bg-dark-card border-dark-border text-offwhite">
                      <SelectValue placeholder="Select tour type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="inspection">Aerial Mapping</SelectItem>
                      <SelectItem value="real_estate">Real Estate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="projectId">Associated Project (Optional)</Label>
                <Select name="projectId">
                  <SelectTrigger className="bg-dark-card border-dark-border text-offwhite">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Brief description of the tour content..."
                  className="bg-dark-card border-dark-border text-offwhite"
                />
              </div>
              
              {/* Upload Mode Selection */}
              <div className="space-y-2">
                <Label className="text-offwhite">Upload Method</Label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="uploadMode"
                      value="zip"
                      checked={uploadMode === 'zip'}
                      onChange={(e) => setUploadMode(e.target.value as 'zip' | 'files')}
                      className="text-gold"
                    />
                    <span className="text-offwhite">ZIP Package (Recommended)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="uploadMode"
                      value="files"
                      checked={uploadMode === 'files'}
                      onChange={(e) => setUploadMode(e.target.value as 'zip' | 'files')}
                      className="text-gold"
                    />
                    <span className="text-offwhite">Individual Files</span>
                  </label>
                </div>
              </div>

              {/* Enhanced File Upload Area */}
              <div className="space-y-4">
                <Label className="text-offwhite">
                  {uploadMode === 'zip' ? '3DVista Tour Package' : 'Tour Files'}
                </Label>
                
                {/* Drag & Drop Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive 
                      ? 'border-gold bg-gold/10' 
                      : 'border-gray-600 bg-dark-card hover:border-gold/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="space-y-2">
                    <FolderOpen className="h-12 w-12 text-gold mx-auto" />
                    <p className="text-offwhite font-medium">
                      {uploadMode === 'zip' 
                        ? 'Drop your 3DVista ZIP file here or click to browse'
                        : 'Drop your tour files here or click to browse'
                      }
                    </p>
                    <p className="text-sm text-offwhite/60">
                      {uploadMode === 'zip' 
                        ? 'Supports ZIP files containing complete 3DVista tour exports'
                        : 'Supports HTML, CSS, JS, images, and configuration files'
                      }
                    </p>
                    <input
                      type="file"
                      onChange={handleFileInput}
                      multiple={uploadMode === 'files'}
                      accept={uploadMode === 'zip' ? '.zip' : '.html,.js,.css,.jpg,.jpeg,.png,.webp,.json,.xml'}
                      className="hidden"
                      id="file-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('file-input')?.click()}
                      className="border-gold text-gold hover:bg-gold/10"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Files
                    </Button>
                  </div>
                </div>

                {/* File List & Validation */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-offwhite font-medium">Selected Files:</h4>
                    <div className="bg-dark-card rounded-lg p-3 max-h-32 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex justify-between items-center py-1">
                          <span className="text-offwhite text-sm">{file.name}</span>
                          <span className="text-offwhite/60 text-xs">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entry Point Selection (for file mode) */}
                {uploadMode === 'files' && entryPoint && (
                  <div>
                    <Label htmlFor="entryPoint" className="text-offwhite">HTML Entry Point</Label>
                    <Input
                      id="entryPoint"
                      value={entryPoint}
                      onChange={(e) => setEntryPoint(e.target.value)}
                      placeholder="index.html"
                      className="bg-dark-card border-dark-border text-offwhite"
                    />
                    <p className="text-sm text-offwhite/60 mt-1">
                      Main HTML file that loads the virtual tour
                    </p>
                  </div>
                )}

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
                    <h4 className="text-red-400 font-medium mb-2">Validation Issues:</h4>
                    <ul className="space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="text-red-300 text-sm">• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Upload Instructions */}
                <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-3">
                  <h4 className="text-blue-400 font-medium mb-2">3DVista Upload Guide:</h4>
                  <ul className="space-y-1 text-blue-300 text-sm">
                    <li>• Use ZIP mode for complete 3DVista exports (recommended)</li>
                    <li>• Ensure your tour includes index.html or tour.html as entry point</li>
                    <li>• Include all assets: images, scripts, stylesheets, and data files</li>
                    <li>• Maintain original folder structure for proper tour functionality</li>
                  </ul>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="has2dMaps" name="has2dMaps" />
                  <Label htmlFor="has2dMaps">Includes 2D Maps</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox id="has3dModels" name="has3dModels" />
                  <Label htmlFor="has3dModels">Includes 3D Models</Label>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox id="isPublic" name="isPublic" />
                <Label htmlFor="isPublic">Make publicly accessible</Label>
              </div>
              
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-dark-border rounded-full h-2">
                    <div 
                      className="bg-gold h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isUploading}
                  className="bg-gold text-[#080d17] hover:bg-gold/90"
                >
                  {isUploading ? "Uploading..." : "Upload Tour"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowUploadDialog(false)}
                  className="border-dark-border text-offwhite hover:bg-dark-card"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid gap-4">
        {tours.length === 0 ? (
          <Card className="bg-dark-card border-dark-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-offwhite/40 mb-4" />
              <p className="text-offwhite/60 text-center">
                No virtual tours uploaded yet.<br />
                Click "Upload Tour" to add your first 3DVista tour.
              </p>
            </CardContent>
          </Card>
        ) : (
          tours.map((tour: VirtualTour) => (
            <Card key={tour.id} className="bg-dark-card border-dark-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-offwhite">{tour.name}</h3>
                      <Badge className={`${getTourTypeColor(tour.tourType)} border`}>
                        {tour.tourType.replace('_', ' ')}
                      </Badge>
                      {tour.status === "processing" && (
                        <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">
                          Processing
                        </Badge>
                      )}
                    </div>
                    
                    {tour.description && (
                      <p className="text-offwhite/70 mb-3">{tour.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-offwhite/60">
                      <span>Uploaded: {new Date(tour.uploadedAt).toLocaleDateString()}</span>
                      <span>{formatFileSize(tour.fileSizeMb)}</span>
                      {tour.projectName && <span>Project: {tour.projectName}</span>}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-3">
                      {tour.panoramaCount > 0 && (
                        <div className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                          <ImageIcon className="h-3 w-3" />
                          {tour.panoramaCount} views
                        </div>
                      )}
                      {tour.has2dMaps && (
                        <div className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                          <Map className="h-3 w-3" />
                          2D Maps
                        </div>
                      )}
                      {tour.has3dModels && (
                        <div className="flex items-center gap-1 text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                          <Box className="h-3 w-3" />
                          3D Models
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/tours/${tour.tourPath}/index.html`, '_blank')}
                      className="border-dark-border text-offwhite hover:bg-dark-card"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-dark-border text-offwhite hover:bg-dark-card"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMutation.mutate(tour.id)}
                      disabled={deleteMutation.isPending}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}