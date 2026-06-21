import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  Eye, 
  Headset, 
  Map, 
  Box, 
  Image as ImageIcon,
  Globe,
  Filter,
  Search,
  Calendar,
  Download,
  Maximize2,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

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

export default function VirtualTours() {
  const [selectedTour, setSelectedTour] = useState<VirtualTour | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showTourDialog, setShowTourDialog] = useState(false);
  const [iframeSrc, setIframeSrc] = useState("");
  const [isVrMode, setIsVrMode] = useState(false);

  // Fetch virtual tours
  const { data: tours, isLoading: isLoadingTours, refetch } = useQuery({
    queryKey: ['/api/client/virtual-tours'],
    queryFn: async () => {
      const response = await fetch('/api/client/virtual-tours');
      if (!response.ok) {
        throw new Error('Failed to load virtual tours');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter and search tours
  const filteredTours = tours?.filter(tour => {
    const matchesType = filterType === "all" || tour.tourType === filterType;
    const matchesSearch = tour.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tour.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tour.projectName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  }) || [];

  const openTour = (tour: VirtualTour) => {
    setSelectedTour(tour);
    
    // Construct the tour URL with full path
    const tourUrl = `${window.location.origin}/tours/${tour.tourPath}/index.html`;
    
    setIframeSrc(tourUrl);
    setShowTourDialog(true);
  };

  const getTourTypeColor = (type: string) => {
    switch (type) {
      case "construction": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "real_estate": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "inspection": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const formatFileSize = (sizeMb?: number) => {
    if (!sizeMb) return "Unknown size";
    if (sizeMb < 1024) return `${sizeMb} MB`;
    return `${(sizeMb / 1024).toFixed(1)} GB`;
  };

  if (isLoadingTours) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-offwhite">Virtual Tours</h2>
          <p className="text-offwhite/70 mt-1">
            Explore immersive 360° virtual tours of your jobsites
          </p>
        </div>
        <Button 
          onClick={() => refetch()}
          variant="outline"
          className="border-gold-dark/30 text-gold hover:bg-gold/10"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="bg-[#132642] border-gold-dark/30">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-offwhite/50 h-4 w-4" />
                <Input
                  placeholder="Search tours by name, description, or project..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#080d17] border-gold-dark/30 text-offwhite"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48 bg-[#080d17] border-gold-dark/30 text-offwhite">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-[#080d17] border-gold-dark/30">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="construction">Construction</SelectItem>
                <SelectItem value="real_estate">Real Estate</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tours Grid */}
      {filteredTours.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTours.map((tour) => (
            <Card key={tour.id} className="bg-[#132642] border-gold-dark/30 overflow-hidden group hover:border-gold/50 transition-colors">
              <div className="relative aspect-video bg-[#080d17] overflow-hidden">
                {tour.thumbnailUrl ? (
                  <img
                    src={tour.thumbnailUrl}
                    alt={tour.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Globe className="h-16 w-16 text-gold/50" />
                  </div>
                )}
                
                {/* Overlay badges */}
                <div className="absolute top-2 left-2 flex gap-2">
                  <Badge className={getTourTypeColor(tour.tourType)}>
                    {tour.tourType.replace('_', ' ')}
                  </Badge>
                  {tour.status !== "active" && (
                    <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                      {tour.status}
                    </Badge>
                  )}
                </div>

                {/* Feature indicators */}
                <div className="absolute bottom-2 right-2 flex gap-1">
                  {tour.panoramaCount > 0 && (
                    <div 
                      className="bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1"
                      title={`${tour.panoramaCount} panoramic views`}
                    >
                      <ImageIcon className="h-3 w-3" />
                      {tour.panoramaCount}
                    </div>
                  )}
                  {tour.has2dMaps && (
                    <div 
                      className="bg-black/60 text-white text-xs px-2 py-1 rounded"
                      title="2D orthomosaic maps included"
                    >
                      <Map className="h-3 w-3" />
                    </div>
                  )}
                  {tour.has3dModels && (
                    <div 
                      className="bg-black/60 text-white text-xs px-2 py-1 rounded"
                      title="3D photogrammetry models included"
                    >
                      <Box className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-offwhite text-lg">{tour.name}</CardTitle>
                {tour.description && (
                  <CardDescription className="text-offwhite/60 text-sm line-clamp-2">
                    {tour.description}
                  </CardDescription>
                )}
                {tour.projectName && (
                  <p className="text-gold text-sm">Project: {tour.projectName}</p>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-offwhite/50 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(tour.uploadedAt), 'MMM dd, yyyy')}
                  </div>
                  <div>{formatFileSize(tour.fileSizeMb)}</div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => openTour(tour)}
                    className="flex-1 bg-gold text-[#080d17] hover:bg-gold/90"
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {tour.tourType === "inspection" ? "View Mapping" : "View Tour"}
                  </Button>
                  

                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-[#132642] border-gold-dark/30">
          <CardContent className="p-12 text-center">
            <Globe className="h-16 w-16 mx-auto mb-4 text-gold/50" />
            <h3 className="text-xl font-medium text-offwhite mb-2">
              {searchTerm || filterType !== "all" ? "No tours found" : "No Virtual Tours Available"}
            </h3>
            <p className="text-offwhite/60">
              {searchTerm || filterType !== "all" 
                ? "Try adjusting your search or filter criteria."
                : "Virtual tours for your projects will appear here once they're uploaded."
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tour Viewer Dialog */}
      <Dialog open={showTourDialog} onOpenChange={setShowTourDialog}>
        <DialogContent className="max-w-7xl h-[90vh] p-0 bg-[#080d17] border-gold-dark/30 flex flex-col">
          <DialogHeader className="p-4 border-b border-gold-dark/30 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-offwhite text-xl">
                  {selectedTour?.name}
                </DialogTitle>
                {selectedTour?.description && (
                  <p className="text-offwhite/60 text-sm mt-1">{selectedTour.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => window.open(iframeSrc, '_blank')}
                  variant="outline"
                  size="sm"
                  className="border-gold-dark/30 text-gold hover:bg-gold/10"
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Fullscreen
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 relative overflow-hidden">
            {iframeSrc && (
              <iframe
                src={iframeSrc}
                className="w-full h-full border-0 absolute inset-0"
                allowFullScreen
                allow="vr; accelerometer; gyroscope; magnetometer; autoplay"
                title={selectedTour?.name || "Virtual Tour"}
              />
            )}
            
            {/* Loading indicator */}
            <div className="absolute inset-0 flex items-center justify-center bg-[#080d17] pointer-events-none opacity-0 transition-opacity">
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
          </div>
          
          {/* Fallback message for unsupported browsers */}
          <noscript>
            <div className="p-4 bg-red-500/20 text-red-400 border border-red-500/30 m-4 rounded">
              <p>Please enable JavaScript or use a modern browser to view the virtual tour.</p>
            </div>
          </noscript>
        </DialogContent>
      </Dialog>
    </div>
  );
}