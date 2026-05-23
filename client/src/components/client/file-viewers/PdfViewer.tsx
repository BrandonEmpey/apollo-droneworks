import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface PdfViewerProps {
  fileUrl: string;
  fileName?: string;
}

export default function PdfViewer({ fileUrl, fileName = 'document.pdf' }: PdfViewerProps) {
  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-offwhite/70">PDF Viewer</div>
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
      <div className="rounded-md bg-[#080d17] overflow-hidden" style={{ height: '70vh' }}>
        <iframe
          src={`${fileUrl}#view=FitH`}
          title={fileName}
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
