import { useState, ChangeEvent, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ClientFile } from "@shared/schema";

interface FileUploadFormProps {
  projectId: number;
  clientId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function FileUploadForm({ projectId, clientId, onSuccess, onCancel }: FileUploadFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fileName, setFileName] = useState("");
  const [fileDescription, setFileDescription] = useState("");
  const [fileKeywords, setFileKeywords] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Mutation for uploading file
  const uploadMutation = useMutation({
    mutationFn: async (fileData: FormData) => {
      // First upload the actual file to get a permanent URL
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: fileData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to server");
      }
      
      const uploadResult = await uploadResponse.json();
      const fileSize = selectedFile?.size || 0;
      const fileType = determineFileType(selectedFile);
      
      // Now save the file metadata with the permanent URL
      const filePayload = {
        name: fileName,
        description: fileDescription,
        fileUrl: uploadResult.url, // Use the permanent server URL
        fileType,
        clientId,
        projectId,
        size: fileSize,
        isPublic,
        uploadedAt: new Date(),
        keywords: fileKeywords.trim() ? fileKeywords.split(',').map(k => k.trim()).filter(k => k) : [],
        expiresAtDate: expirationDate || null,
        uploadedByUserId: null, // Will be set by server based on authenticated user
      };
      
      const response = await apiRequest(
        "POST", 
        `/api/client-projects/${projectId}/files`,
        filePayload
      );
      
      if (!response.ok) {
        throw new Error("Failed to save file metadata");
      }
      
      return response.json();
    },
    onSuccess: (newFile: ClientFile) => {
      // Update the cache with the new file
      queryClient.invalidateQueries({ queryKey: ["/api/client-projects", projectId, "files"] });
      
      toast({
        title: "File uploaded",
        description: "Your file has been successfully uploaded.",
      });
      
      // Reset form
      resetForm();
      
      // Call success callback if provided
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setSelectedFile(file);
    
    // Auto-populate name from filename if not already set
    if (!fileName) {
      setFileName(file.name);
    }
  };
  
  // Determine file type based on extension
  const determineFileType = (file: File | null): string => {
    if (!file) return "document";
    
    const extension = file.name.split('.').pop()?.toLowerCase() || "";
    
    const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
    const videoExts = ["mp4", "mov", "avi", "webm", "mkv"];
    const documentExts = ["doc", "docx", "txt", "pdf", "xls", "xlsx", "csv"];
    const geospatialExts = ["tif", "tiff", "geotiff"];
    const archiveExts = ["zip", "rar", "7z", "tar", "gz"];
    
    if (imageExts.includes(extension)) return "image";
    if (videoExts.includes(extension)) return "video";
    if (documentExts.includes(extension)) return "document";
    if (geospatialExts.includes(extension)) return "geotiff";
    if (archiveExts.includes(extension)) return "zip";
    
    return "document"; // Default type
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    if (!fileName) {
      toast({
        title: "Missing file name",
        description: "Please provide a name for your file.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // In a real implementation, we would use FormData to upload the file
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", fileName);
      formData.append("description", fileDescription);
      formData.append("clientId", clientId.toString());
      formData.append("projectId", projectId.toString());
      formData.append("isPublic", isPublic.toString());
      
      await uploadMutation.mutateAsync(formData);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Reset the form
  const resetForm = () => {
    setFileName("");
    setFileDescription("");
    setFileKeywords("");
    setExpirationDate("");
    setSelectedFile(null);
    setIsPublic(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="file" className="text-offwhite text-sm">Select File</Label>
          <div 
            className="border-2 border-dashed border-gold-dark/30 rounded-md p-4 text-center cursor-pointer hover:border-gold-dark/60 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="mx-auto h-8 w-8 text-gold-dark/50" />
            <p className="mt-1 text-sm text-offwhite/70">
              Click to select a file, or drag and drop
            </p>
            <Input 
              ref={fileInputRef}
              id="file" 
              type="file" 
              className="hidden" 
              onChange={handleFileChange}
            />
          </div>
          {selectedFile && (
            <div className="flex items-center justify-between bg-[#080d17] p-2 rounded">
              <span className="text-sm text-offwhite truncate">{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-transparent"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Remove
              </Button>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="fileName" className="text-offwhite text-sm">File Name</Label>
          <Input 
            id="fileName" 
            value={fileName} 
            onChange={(e) => setFileName(e.target.value)}
            className="bg-[#080d17] border-gold-dark/30 text-offwhite text-sm"
            placeholder="Enter a name for your file"
          />
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="description" className="text-offwhite text-sm">Description (Optional)</Label>
          <Textarea 
            id="description" 
            value={fileDescription} 
            onChange={(e) => setFileDescription(e.target.value)}
            className="bg-[#080d17] border-gold-dark/30 text-offwhite h-12 text-sm"
            placeholder="Add a description for this file..."
          />
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="keywords" className="text-offwhite text-sm">Keywords (Optional)</Label>
          <Input 
            id="keywords" 
            value={fileKeywords} 
            onChange={(e) => setFileKeywords(e.target.value)}
            className="bg-[#080d17] border-gold-dark/30 text-offwhite text-sm"
            placeholder="e.g., aerial, drone, photography"
          />
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="expirationDate" className="text-offwhite text-sm">Expiration Date (Optional)</Label>
          <Input 
            id="expirationDate" 
            type="date"
            value={expirationDate} 
            onChange={(e) => setExpirationDate(e.target.value)}
            className="bg-[#080d17] border-gold-dark/30 text-offwhite text-sm"
          />
          <p className="text-xs text-offwhite/50">
            File will be flagged for removal after this date
          </p>
        </div>
        
        <div className="flex items-center space-x-2 py-1">
          <Switch 
            id="isPublic" 
            checked={isPublic} 
            onCheckedChange={setIsPublic} 
          />
          <Label htmlFor="isPublic" className="text-offwhite text-sm">Make this file publicly accessible</Label>
        </div>
        
        <div className="flex justify-end space-x-3 pt-1 border-t border-gold-dark/20 mt-2">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="border-gold-dark/30 hover:border-gold hover:bg-[#080d17] text-offwhite"
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedFile || isUploading}
            className="bg-gradient-to-r from-[#b8a15c] to-[#e1cc81] hover:from-[#c4ab64] hover:to-[#ebd58a] text-[#1d1d1d] font-medium"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>Upload File</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}