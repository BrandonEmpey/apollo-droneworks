import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Loader2, FileImage, FileVideo, Paperclip } from "lucide-react";

type FileUploadProps = {
  onFileUpload: (url: string) => void;
  acceptedFileTypes?: string;
  buttonText?: string;
  currentFile?: string;
  maxSizeMB?: number;
};

export function FileUpload({
  onFileUpload,
  acceptedFileTypes = "*/*",
  buttonText = "Upload File",
  currentFile,
  maxSizeMB = 10
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentFile || null);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Determine if file is an image or video
  const isImage = (file: File | string) => {
    if (typeof file === 'string') {
      return file.match(/\.(jpeg|jpg|gif|png|webp|avif|svg)$/i);
    }
    return file.type.startsWith('image/');
  };

  const isVideo = (file: File | string) => {
    if (typeof file === 'string') {
      return file.match(/\.(mp4|webm|ogg|mov|avi)$/i);
    }
    return file.type.startsWith('video/');
  };

  // Resize image to fit the service tile dimensions (600x400)
  const resizeImage = (originalBase64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas with proper dimensions
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Target dimensions match our service cards exactly
        const targetWidth = 600;
        const targetHeight = 400;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Fill the background with dark color (to match the app theme)
        ctx.fillStyle = '#080d17';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Calculate dimensions to maintain aspect ratio
        let drawWidth = targetWidth;
        let drawHeight = targetHeight;
        let drawX = 0;
        let drawY = 0;

        // Calculate the scaling ratio to fit within the canvas
        const origRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;

        if (origRatio > targetRatio) {
          // Image is wider than target ratio, scale to match width and preserve more vertical content
          drawWidth = targetWidth;
          drawHeight = drawWidth / origRatio;
          // Position the image in the top part of the canvas, but not all the way at the top
          // to provide a more balanced composition
          drawY = Math.max(0, (targetHeight - drawHeight) * 0.2); // 20% from top 
        } else {
          // Image is taller than target ratio, scale to match width but don't cut the top
          drawWidth = targetWidth;
          drawHeight = drawWidth / origRatio;
          
          // If the height is more than the target, maintain the top of the image
          if (drawHeight > targetHeight) {
            // Scale the image to fit width and position it at the top
            // with a small margin to avoid an extreme top-cut
            drawY = -Math.min((drawHeight - targetHeight) * 0.1, (drawHeight - targetHeight) * 0.3);
          } else {
            // Image is shorter than target height, center it vertically
            drawY = (targetHeight - drawHeight) / 2;
          }
        }

        // Draw the image
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        // Get the resized image as base64
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = originalBase64;
    });
  };

  // Convert file to base64 with progress updates
  const convertToBase64 = async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(0);

    // Create a reader to read the file
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      // Update progress as the file is read
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };
      
      // When the file is loaded, resolve with the base64 data
      reader.onload = () => {
        setIsUploading(false);
        resolve(reader.result as string);
      };
      
      // Handle errors
      reader.onerror = () => {
        setIsUploading(false);
        reject(new Error('Failed to read file'));
      };
      
      // Start reading the file as a data URL (base64)
      reader.readAsDataURL(file);
    });
  };
  
  // Handle file selection
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) return;

    // Check file size
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `The file exceeds the maximum size of ${maxSizeMB}MB.`,
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    
    try {
      // Convert file to base64 first
      const base64Data = await convertToBase64(selectedFile);
      setUploadProgress(70); // Set progress to show resizing is happening

      // If it's an image, resize it automatically
      if (isImage(selectedFile)) {
        const resizedImage = await resizeImage(base64Data);
        setPreviewUrl(resizedImage);
        onFileUpload(resizedImage);
      } else {
        // For non-images, just use the file directly
        setPreviewUrl(base64Data);
        onFileUpload(base64Data);
      }
      
      setUploadProgress(100);
      setTimeout(() => setIsUploading(false), 500);

      toast({
        title: "Upload complete",
        description: "Your file has been uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  // Clear the current file
  const handleClearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onFileUpload("");
  };

  // Handle click on the upload button
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Display the appropriate icon based on file type
  const renderFileTypeIcon = () => {
    if (!previewUrl) return <Paperclip className="h-6 w-6" />;
    
    if (typeof previewUrl === 'string') {
      if (isImage(previewUrl)) return <FileImage className="h-6 w-6" />;
      if (isVideo(previewUrl)) return <FileVideo className="h-6 w-6" />;
    }
    
    if (file) {
      if (isImage(file)) return <FileImage className="h-6 w-6" />;
      if (isVideo(file)) return <FileVideo className="h-6 w-6" />;
    }
    
    return <Paperclip className="h-6 w-6" />;
  };

  // For images and videos, render a preview
  const renderPreview = () => {
    if (!previewUrl) return null;

    if (typeof previewUrl === 'string') {
      if (isImage(previewUrl)) {
        return (
          <div className="mt-2 relative">
            {/* This div has the exact same dimensions as the service card images */}
            <div className="h-48 w-full overflow-hidden rounded-md border border-gold-dark/30" style={{ aspectRatio: '1.5' }}>
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-90"
              onClick={handleClearFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      }

      if (isVideo(previewUrl)) {
        return (
          <div className="mt-2 relative">
            <video 
              src={previewUrl} 
              controls 
              className="w-full h-48 rounded-md border border-gold-dark/30"
              style={{ aspectRatio: '1.5' }}
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-90"
              onClick={handleClearFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }

    return (
      <div className="mt-2 p-3 bg-[#080d17] border border-gold-dark/30 rounded-md flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {renderFileTypeIcon()}
          <span className="text-sm text-offwhite truncate max-w-[200px]">
            {file?.name || "File selected"}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-transparent"
          onClick={handleClearFile}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <Input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={acceptedFileTypes}
        className="hidden"
      />
      
      {!previewUrl && (
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed border-gold-dark/40 text-offwhite hover:bg-[#132642] hover:border-gold-dark/60"
          onClick={handleUploadClick}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uploadProgress < 100 ? "Processing..." : "Finishing..."}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {buttonText}
            </>
          )}
        </Button>
      )}
      
      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2 bg-[#0b111f]" />
          <p className="text-xs text-offwhite/70 text-right">{uploadProgress}%</p>
        </div>
      )}
      
      {renderPreview()}
      
      {previewUrl && !isUploading && (
        <Button
          type="button"
          variant="outline"
          className="w-full mt-2 border-gold-dark/40 text-offwhite hover:bg-[#132642]"
          onClick={handleUploadClick}
        >
          <Upload className="mr-2 h-4 w-4" />
          Replace {isImage(previewUrl) ? "Image" : isVideo(previewUrl) ? "Video" : "File"}
        </Button>
      )}
    </div>
  );
}