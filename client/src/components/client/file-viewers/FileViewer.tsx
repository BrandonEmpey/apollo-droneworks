import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileIcon } from 'lucide-react';
import ImageViewer from './ImageViewer';
import GeoTiffViewer from './GeoTiffViewer';
import PdfViewer from './PdfViewer';
import VideoViewer from './VideoViewer';

interface FileViewerProps {
  fileUrl: string;
  fileName?: string;
  fileType?: string;
  extension?: string;
  fileExtension?: string;
  viewerType?: string;
}

export default function FileViewer({ 
  fileUrl, 
  fileName = '', 
  fileType, 
  extension, 
  fileExtension,
  viewerType: initialViewerType 
}: FileViewerProps) {
  const [viewerType, setViewerType] = useState<string | null>(initialViewerType || null);
  const [loading, setLoading] = useState(!initialViewerType);
  const [error, setError] = useState<string | null>(null);
  
  // Get file extension from multiple sources, with fileUrl as the most reliable fallback
  const extractExtension = (s: string | undefined): string => {
    if (!s) return '';
    const cleaned = s.split('?')[0].split('#')[0];
    const last = cleaned.split('/').pop() || '';
    if (!last.includes('.')) return '';
    return last.split('.').pop()?.toLowerCase() || '';
  };
  const resolvedExtension =
    fileExtension ||
    extension ||
    extractExtension(fileName) ||
    extractExtension(fileUrl) ||
    'unknown';

  useEffect(() => {
    if (initialViewerType) {
      return;
    }
    
    const loadTimer = setTimeout(() => {
      setLoading(false);
      
      const type = fileType || determineFileType(resolvedExtension);
      setViewerType(type);
    }, 500);
    
    return () => clearTimeout(loadTimer);
  }, [fileUrl, resolvedExtension, fileType, initialViewerType]);

  // Determine the appropriate viewer based on file extension
  const determineFileType = (extension: string): string => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const geoTiffExtensions = ['tif', 'tiff', 'geotiff'];
    const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'ogv'];
    const pdfExtensions = ['pdf'];

    if (imageExtensions.includes(extension)) {
      return 'image';
    } else if (geoTiffExtensions.includes(extension)) {
      return 'geotiff';
    } else if (videoExtensions.includes(extension)) {
      return 'video';
    } else if (pdfExtensions.includes(extension)) {
      return 'pdf';
    } else {
      return 'document';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-8 bg-[#080d17] rounded-md">
        <div className="animate-spin w-8 h-8 border-4 border-gold border-t-transparent rounded-full" />
        <p className="mt-4 text-offwhite/70">Loading file viewer...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Render the appropriate viewer
  const renderViewer = () => {
    switch (viewerType) {
      case 'image':
        return <ImageViewer fileUrl={fileUrl} />;
      case 'geotiff':
        return <GeoTiffViewer fileUrl={fileUrl} />;
      case 'pdf':
        return <PdfViewer fileUrl={fileUrl} fileName={fileName} />;
      case 'video':
        return <VideoViewer fileUrl={fileUrl} fileName={fileName} extension={resolvedExtension} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-[#080d17] rounded-md min-h-[300px]">
            <FileIcon className="h-16 w-16 text-gold mb-4" />
            <h3 className="text-offwhite text-xl font-medium mb-2">{fileName}</h3>
            <p className="text-offwhite/70 mb-3 text-center">
              This file type cannot be previewed directly. Please download the file to view its contents.
            </p>
            <Button 
              className="bg-[#1b2f4d] hover:bg-[#284677] text-offwhite"
              asChild
            >
              <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Download File
              </a>
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="file-viewer">
      {renderViewer()}
    </div>
  );
}