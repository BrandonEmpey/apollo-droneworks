import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface VideoViewerProps {
  fileUrl: string;
  fileName?: string;
  extension?: string;
}

export default function VideoViewer({ fileUrl, fileName = 'video', extension }: VideoViewerProps) {
  const ext = (extension || fileName.split('.').pop() || 'mp4').toLowerCase();
  const mimeMap: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    m4v: 'video/x-m4v',
    ogv: 'video/ogg',
  };
  const mime = mimeMap[ext] || 'video/mp4';

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-offwhite/70">Video Player</div>
        <Button
          variant="outline"
          size="sm"
          className="bg-[#0b111f] hover:bg-[#132642] border-gold-dark/30 text-offwhite"
          asChild
        >
          <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 mr-2" />
            Download
          </a>
        </Button>
      </div>
      <div className="rounded-md bg-black overflow-hidden flex items-center justify-center">
        <video
          controls
          preload="metadata"
          className="w-full max-h-[70vh]"
          data-testid="video-player"
        >
          <source src={fileUrl} type={mime} />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}
