import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Box, X, FileBox, AlertCircle } from "lucide-react";
import ModelViewer from "./ModelViewer";

type SupportedFormat = "gltf" | "glb" | "obj" | "fbx";

const SUPPORTED_EXTENSIONS: SupportedFormat[] = ["gltf", "glb", "obj", "fbx"];
const ACCEPTED_MIME_TYPES = ".gltf,.glb,.obj,.fbx";

const FORMAT_BADGES: Record<SupportedFormat, { label: string; color: string }> = {
  gltf: { label: "GLTF", color: "bg-blue-950/40 text-blue-300 border-blue-700/50" },
  glb: { label: "GLB", color: "bg-purple-950/40 text-purple-300 border-purple-700/50" },
  obj: { label: "OBJ", color: "bg-amber-950/40 text-amber-300 border-amber-700/50" },
  fbx: { label: "FBX", color: "bg-green-950/40 text-green-300 border-green-700/50" },
};

function getFormatFromFileName(name: string): SupportedFormat | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (SUPPORTED_EXTENSIONS.includes(ext as SupportedFormat)) {
    return ext as SupportedFormat;
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ModelPreviewPanel() {
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<SupportedFormat | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
        activeUrlRef.current = null;
      }
    };
  }, []);

  const handleFile = useCallback((file: File) => {
    setValidationError(null);
    const detectedFormat = getFormatFromFileName(file.name);
    if (!detectedFormat) {
      setValidationError(
        `Unsupported file type. Please upload a .gltf, .glb, .obj, or .fbx file.`
      );
      return;
    }
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    activeUrlRef.current = url;
    setModelFile(file);
    setModelUrl(url);
    setFormat(detectedFormat);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const clearModel = () => {
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
    setModelFile(null);
    setModelUrl(null);
    setFormat(null);
    setValidationError(null);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[#080d17] border-gold-dark/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="h-5 w-5 text-gold" />
              <CardTitle className="text-lg font-medium text-offwhite">3D Model Preview</CardTitle>
            </div>
            {modelFile && format && (
              <Badge
                variant="outline"
                className={FORMAT_BADGES[format].color}
              >
                {FORMAT_BADGES[format].label}
              </Badge>
            )}
          </div>
          <CardDescription className="text-offwhite/60">
            Upload a 3D model file to preview it interactively before attaching it to a client project.
            Supported formats: GLTF, GLB, OBJ, FBX.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!modelFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                flex flex-col items-center justify-center gap-4 p-12 rounded-lg border-2 border-dashed cursor-pointer transition-colors
                ${dragOver
                  ? "border-gold bg-gold/5"
                  : "border-gold-dark/30 bg-[#060a13] hover:border-gold/50 hover:bg-[#0b111f]"
                }
              `}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="p-4 rounded-full bg-[#1c304d]/40">
                  <FileBox className="h-10 w-10 text-gold/70" />
                </div>
                <div>
                  <p className="text-offwhite font-medium mb-1">
                    {dragOver ? "Drop your model here" : "Upload a 3D model file"}
                  </p>
                  <p className="text-offwhite/50 text-sm">
                    Drag &amp; drop or click to browse
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center mt-1">
                  {SUPPORTED_EXTENSIONS.map((ext) => (
                    <Badge
                      key={ext}
                      variant="outline"
                      className={`text-xs ${FORMAT_BADGES[ext].color}`}
                    >
                      .{ext.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                className="bg-[#1c304d] hover:bg-[#284677] text-offwhite mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_MIME_TYPES}
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <FileBox className="h-4 w-4 text-gold" />
                  <span className="text-offwhite text-sm font-medium truncate max-w-[300px]">
                    {modelFile.name}
                  </span>
                  <span className="text-offwhite/40 text-xs">
                    ({formatBytes(modelFile.size)})
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-offwhite/60 hover:text-offwhite hover:bg-[#1c304d] h-7 px-2 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1.5 h-3 w-3" />
                    Replace
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400/70 hover:text-red-400 hover:bg-red-900/20 h-7 px-2"
                    onClick={clearModel}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_MIME_TYPES}
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>
              {modelUrl && format && (
                <div className="rounded-lg overflow-hidden border border-gold-dark/20" style={{ height: "500px" }}>
                  <ModelViewer
                    fileUrl={modelUrl}
                    fileName={modelFile.name}
                    format={format}
                  />
                </div>
              )}
            </div>
          )}

          {validationError && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-red-800/40 bg-red-900/10 px-3 py-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {validationError}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#080d17] border-gold-dark/30">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-offwhite/50 uppercase tracking-wider">GLTF / GLB</p>
              <p className="text-sm text-offwhite/80">
                Primary format. Supports materials, textures, and animations. Use <strong className="text-offwhite">GLB</strong> for local preview — it bundles everything into one file. Multi-file GLTF (with external .bin/textures) cannot be previewed from a local upload.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs text-offwhite/50 uppercase tracking-wider">OBJ</p>
              <p className="text-sm text-offwhite/80">
                Geometry-only format. Rendered with a default grey material since OBJ materials (.mtl) are not bundled.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs text-offwhite/50 uppercase tracking-wider">FBX</p>
              <p className="text-sm text-offwhite/80">
                Autodesk format supporting geometry and embedded materials. Animations included when present.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
