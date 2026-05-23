import React, { useState, useEffect, useMemo } from 'react';
import apolloLogo from '../../../assets/apollo-logo.png';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Image, Video, VideoOff, Clock, Calendar, Map, UploadCloud, Trash2, Search, SortAsc, SortDesc, FileImage, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { FileUpload } from '@/components/ui/file-upload';

interface TimelapseItem {
  id: number;
  taskId: number;
  mediaType: string; // 'image' | 'video' | 'orthomosaic'
  url: string;
  caption: string | null;
  captureDate: string;
  thumbnail?: string | null;
  metadata?: any | null;
}

interface TimelapseViewerProps {
  projectId: number;
  taskId?: number;
  taskName?: string;
  isChronological?: boolean;
  allowSearch?: boolean;
}

const TimelapseViewer: React.FC<TimelapseViewerProps> = ({ projectId, taskId, taskName, isChronological = false, allowSearch = false }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState<TimelapseItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(isChronological ? 'asc' : 'desc');
  const [uploadData, setUploadData] = useState({
    url: '',
    caption: '',
    mediaType: 'image',
  });
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('file');

  // Determine which endpoint to use based on whether taskId is provided
  const timelapseEndpoint = taskId
    ? `/api/client-projects/${projectId}/tasks/${taskId}/timelapse`
    : `/api/client-projects/${projectId}/timelapse`;

  // Fetch timelapse items
  const { data: timelapseItems, isLoading, refetch } = useQuery<TimelapseItem[]>({
    queryKey: [timelapseEndpoint],
    enabled: !!projectId, // Only need projectId to be defined
  });

  // Process, filter, and sort items
  const processedItems = useMemo(() => {
    if (!timelapseItems) return [];
    
    // First apply search filter if enabled
    let filtered = timelapseItems;
    if (allowSearch && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => (
        (item.caption && item.caption.toLowerCase().includes(query)) ||
        item.mediaType.toLowerCase().includes(query)
      ));
    }
    
    // Then filter by media type
    if (activeTab !== 'all') {
      filtered = filtered.filter(item => item.mediaType === activeTab);
    }
    
    // Finally sort by date
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.captureDate).getTime();
      const dateB = new Date(b.captureDate).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [timelapseItems, activeTab, sortOrder, searchQuery, allowSearch]);
  
  const filteredItems = processedItems;

  // Set first item as selected when data loads
  useEffect(() => {
    if (timelapseItems?.length && !selectedItem) {
      setSelectedItem(timelapseItems[0]);
    }
  }, [timelapseItems, selectedItem]);

  // Handle file upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.url) {
      toast({
        title: 'Error',
        description: uploadMode === 'file' ? 'Please upload a file' : 'Please provide a URL',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const response = await apiRequest('POST', `/api/client-projects/${projectId}/tasks/${taskId}/timelapse`, {
        ...uploadData,
        captureDate: new Date().toISOString(),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Timelapse item added successfully',
        });
        setUploadData({
          url: '',
          caption: '',
          mediaType: 'image',
        });
        refetch();
      } else {
        throw new Error('Failed to upload');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add timelapse item',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle item deletion
  const handleDelete = async (itemId: number) => {
    if (!window.confirm('Are you sure you want to delete this timelapse item?')) return;

    try {
      const response = await apiRequest(
        'DELETE',
        `/api/client-projects/${projectId}/tasks/${taskId}/timelapse/${itemId}`
      );

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Timelapse item deleted successfully',
        });
        if (selectedItem?.id === itemId) {
          setSelectedItem(null);
        }
        refetch();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete timelapse item',
        variant: 'destructive',
      });
    }
  };

  // Render the appropriate media viewer for the selected item
  const renderMediaViewer = () => {
    if (!selectedItem) return null;

    // Use imported logo for all fallback displays

    // Function to handle image load errors
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      e.currentTarget.src = apolloLogo;
      e.currentTarget.alt = 'Apollo DroneWorks';
      e.currentTarget.className = 'max-h-full max-w-full object-contain p-4';
    };

    // Function to check if an URL is valid
    const isValidUrl = (url: string) => {
      try {
        new URL(url);
        return true;
      } catch (e) {
        return false;
      }
    };

    // Function to handle video errors
    const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
      // Replace broken video element with company logo
      const parent = e.currentTarget.parentElement;
      if (parent) {
        parent.innerHTML = `
          <div class="w-full h-full flex flex-col items-center justify-center bg-[#0b111f] text-center p-4">
            <img src="${apolloLogo}" alt="Apollo DroneWorks" class="max-w-[300px] mb-3" />
            <p class="text-gold text-sm mt-1">Media content unavailable</p>
          </div>
        `;
      }
    };

    const validUrl = isValidUrl(selectedItem.url);

    switch (selectedItem.mediaType) {
      case 'image':
        return (
          <div className="relative w-full h-64 md:h-80 bg-[#0b111f] flex items-center justify-center">
            {validUrl ? (
              <img
                src={selectedItem.url}
                alt={selectedItem.caption || 'Timelapse image'}
                className="max-h-full max-w-full object-contain"
                onError={handleImageError}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4">
                <img src={apolloLogo} alt="Apollo DroneWorks" className="max-w-[300px] mb-3" />
                <p className="text-gold text-sm">Image content unavailable</p>
              </div>
            )}
          </div>
        );
      case 'video':
        return (
          <div className="relative w-full h-64 md:h-80 bg-[#0b111f]">
            {validUrl ? (
              <video
                src={selectedItem.url}
                controls
                className="w-full h-full object-contain"
                onError={handleVideoError}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                <img src={apolloLogo} alt="Apollo DroneWorks" className="max-w-[300px] mb-3" />
                <p className="text-gold text-sm">Video content unavailable</p>
              </div>
            )}
          </div>
        );
      case 'orthomosaic':
        return (
          <div className="relative w-full h-64 md:h-80 bg-[#0b111f] flex items-center justify-center">
            {validUrl ? (
              <>
                <img
                  src={selectedItem.url}
                  alt={selectedItem.caption || 'Orthomosaic image'}
                  className="max-h-full max-w-full object-contain"
                  onError={handleImageError}
                />
                <Badge className="absolute top-2 right-2 bg-blue-600">Orthomosaic View</Badge>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4">
                <img src={apolloLogo} alt="Apollo DroneWorks" className="max-w-[300px] mb-3" />
                <p className="text-gold text-sm">3D model content unavailable</p>
                <Badge className="absolute top-2 right-2 bg-blue-600">Orthomosaic View</Badge>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="w-full h-64 md:h-80 bg-[#0b111f] flex items-center justify-center">
            <div className="flex flex-col items-center justify-center text-center p-4">
              <img src={apolloLogo} alt="Apollo DroneWorks" className="max-w-[300px] mb-3" />
              <p className="text-gold text-sm">Unsupported media type</p>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="timelapse-viewer">
      <div className="flex flex-col space-y-4 mb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">
            Timelapse Viewer
            {taskName && <span className="text-sm font-normal ml-2 text-slate-400">for {taskName}</span>}
          </h3>
          
          {/* Sort toggle button */}
          {timelapseItems && timelapseItems.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="bg-[#1d1d1d] text-offwhite border-gold-dark/30 hover:border-gold hover:bg-[#1d1d1d]/80 transition-all"
            >
              {sortOrder === 'asc' ? (
                <>
                  <SortAsc className="h-4 w-4 mr-1" /> Oldest First
                </>
              ) : (
                <>
                  <SortDesc className="h-4 w-4 mr-1" /> Newest First
                </>
              )}
            </Button>
          )}
        </div>
        
        {/* Search field */}
        {allowSearch && timelapseItems && timelapseItems.length > 0 && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-offwhite/50" />
            </div>
            <input
              type="text"
              className="bg-[#0b111f] border border-gold-dark/30 text-offwhite placeholder-offwhite/50 text-sm rounded-lg block w-full pl-10 p-2.5 focus:ring-1 focus:ring-gold-dark focus:border-gold-dark outline-none"
              placeholder="Search by caption or media type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {timelapseItems?.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-8 text-center">
            <p className="text-slate-400 mb-4">No timelapse items available for this task.</p>
            {user?.isAdmin && (
              <div className="mt-4">
                <h4 className="text-white mb-2">Add Timelapse Item</h4>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div className="grid gap-4 grid-cols-1">
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Media Type</label>
                      <select
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                        value={uploadData.mediaType}
                        onChange={(e) => setUploadData({ ...uploadData, mediaType: e.target.value })}
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="orthomosaic">Orthomosaic</option>
                      </select>
                    </div>
                    
                    {/* Upload mode selection */}
                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">Upload Method</label>
                      <div className="flex space-x-4">
                        <button
                          type="button"
                          className={`px-3 py-1 rounded text-sm ${uploadMode === 'file' ? 'bg-gold text-black' : 'bg-slate-700 text-white'}`}
                          onClick={() => setUploadMode('file')}
                        >
                          File Upload
                        </button>
                        <button
                          type="button"
                          className={`px-3 py-1 rounded text-sm ${uploadMode === 'url' ? 'bg-gold text-black' : 'bg-slate-700 text-white'}`}
                          onClick={() => setUploadMode('url')}
                        >
                          URL
                        </button>
                      </div>
                    </div>

                    {/* File upload or URL input */}
                    {uploadMode === 'file' ? (
                      <div>
                        <label className="text-sm text-slate-400 mb-1 block">Upload Media File</label>
                        <FileUpload
                          onFileUpload={(url) => setUploadData({ ...uploadData, url })}
                          acceptedFileTypes={uploadData.mediaType === 'video' ? 'video/*' : 'image/*'}
                          buttonText={`Upload ${uploadData.mediaType === 'video' ? 'Video' : 'Image'}`}
                          currentFile={uploadData.url}
                          maxSizeMB={50}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm text-slate-400 mb-1 block">Media URL</label>
                        <input
                          type="text"
                          className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                          value={uploadData.url}
                          onChange={(e) => setUploadData({ ...uploadData, url: e.target.value })}
                          placeholder="Enter media URL"
                        />
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Caption</label>
                      <input
                        type="text"
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                        value={uploadData.caption}
                        onChange={(e) => setUploadData({ ...uploadData, caption: e.target.value })}
                        placeholder="Optional caption for this media"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isUploading} className="w-full">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4 mr-2" /> Add Timelapse Item
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className="bg-[#0b111f] border border-slate-700">
              <TabsTrigger 
                value="all" 
                className="text-slate-300 data-[state=active]:bg-[#132642] data-[state=active]:text-white font-medium hover:text-white transition-colors"
              >
                All
              </TabsTrigger>
              <TabsTrigger 
                value="image" 
                className="text-slate-300 data-[state=active]:bg-[#132642] data-[state=active]:text-white font-medium hover:text-white transition-colors"
              >
                <Image className="h-4 w-4 mr-1" /> Images
              </TabsTrigger>
              <TabsTrigger 
                value="video" 
                className="text-slate-300 data-[state=active]:bg-[#132642] data-[state=active]:text-white font-medium hover:text-white transition-colors"
              >
                <Video className="h-4 w-4 mr-1" /> Videos
              </TabsTrigger>
              <TabsTrigger 
                value="orthomosaic" 
                className="text-slate-300 data-[state=active]:bg-[#132642] data-[state=active]:text-white font-medium hover:text-white transition-colors"
              >
                <Map className="h-4 w-4 mr-1" /> Orthomosaic
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 gap-4">
            {/* Main view */}
            {selectedItem && (
              <Card className="bg-slate-900 border-slate-800 overflow-hidden">
                <CardContent className="p-0">
                  {renderMediaViewer()}
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white text-lg font-medium">
                          {selectedItem.caption || `${selectedItem.mediaType.charAt(0).toUpperCase() + selectedItem.mediaType.slice(1)}`}
                        </h4>
                        <div className="flex items-center mt-1 text-slate-400 text-sm">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>
                            {selectedItem.captureDate
                              ? format(new Date(selectedItem.captureDate), 'MMM d, yyyy')
                              : 'Date not available'}
                          </span>
                          <Clock className="h-4 w-4 ml-3 mr-1" />
                          <span>
                            {selectedItem.captureDate
                              ? format(new Date(selectedItem.captureDate), 'h:mm a')
                              : 'Time not available'}
                          </span>
                        </div>
                      </div>
                      {user?.isAdmin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(selectedItem.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Thumbnails/timeline */}
            <div className="thumbnail-grid grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {filteredItems.map((item) => {
                // Function to check if an URL is valid
                const isValidUrl = (url: string) => {
                  try {
                    new URL(url);
                    return true;
                  } catch (e) {
                    return false;
                  }
                };
                
                // Handle image load errors
                const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
                  e.currentTarget.src = apolloLogo;
                  e.currentTarget.alt = 'Apollo DroneWorks';
                  e.currentTarget.className = 'w-full h-full object-contain p-2 bg-[#0b111f]';
                };
                
                const isValidThumb = isValidUrl(item.thumbnail || item.url);
                
                return (
                  <div
                    key={item.id}
                    className={`cursor-pointer relative overflow-hidden rounded border ${selectedItem?.id === item.id ? 'border-gold ring-1 ring-gold' : 'border-slate-700'}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="aspect-video bg-slate-800 relative">
                      {item.mediaType === 'image' || item.mediaType === 'orthomosaic' ? (
                        isValidThumb ? (
                          <img
                            src={item.thumbnail || item.url}
                            alt={item.caption || ''}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#0b111f]">
                            <img src={apolloLogo} alt="Apollo DroneWorks" className="w-full h-full object-contain p-2" />
                          </div>
                        )
                      ) : item.mediaType === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center bg-[#0b111f]">
                          <img src={apolloLogo} alt="Apollo DroneWorks" className="w-full h-full object-contain p-2" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#0b111f]">
                          <img src={apolloLogo} alt="Apollo DroneWorks" className="w-full h-full object-contain p-2" />
                        </div>
                      )}
                      <Badge className="absolute bottom-1 right-1 text-xs">
                        {item.mediaType === 'image' && <Image className="h-3 w-3" />}
                        {item.mediaType === 'video' && <Video className="h-3 w-3" />}
                        {item.mediaType === 'orthomosaic' && <Map className="h-3 w-3" />}
                      </Badge>
                    </div>
                    <div className="p-1 text-xs truncate bg-slate-900 text-white">
                      {item.captureDate ? format(new Date(item.captureDate), 'MM/dd/yy') : 'No date'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Upload new item (admin only) */}
            {user?.isAdmin && (
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-4">
                  <h4 className="text-white mb-2">Add Timelapse Item</h4>
                  <form onSubmit={handleUpload} className="space-y-4">
                    <div className="grid gap-4 grid-cols-1">
                      <div>
                        <label className="text-sm text-slate-400 mb-1 block">Media Type</label>
                        <select
                          className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                          value={uploadData.mediaType}
                          onChange={(e) => setUploadData({ ...uploadData, mediaType: e.target.value })}
                        >
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                          <option value="orthomosaic">Orthomosaic</option>
                        </select>
                      </div>
                      
                      {/* Upload mode selection */}
                      <div>
                        <label className="text-sm text-slate-400 mb-2 block">Upload Method</label>
                        <div className="flex space-x-4">
                          <button
                            type="button"
                            className={`px-3 py-1 rounded text-sm ${uploadMode === 'file' ? 'bg-gold text-black' : 'bg-slate-700 text-white'}`}
                            onClick={() => setUploadMode('file')}
                          >
                            File Upload
                          </button>
                          <button
                            type="button"
                            className={`px-3 py-1 rounded text-sm ${uploadMode === 'url' ? 'bg-gold text-black' : 'bg-slate-700 text-white'}`}
                            onClick={() => setUploadMode('url')}
                          >
                            URL
                          </button>
                        </div>
                      </div>

                      {/* File upload or URL input */}
                      {uploadMode === 'file' ? (
                        <div>
                          <label className="text-sm text-slate-400 mb-1 block">Upload Media File</label>
                          <FileUpload
                            onFileUpload={(url) => setUploadData({ ...uploadData, url })}
                            acceptedFileTypes={uploadData.mediaType === 'video' ? 'video/*' : 'image/*'}
                            buttonText={`Upload ${uploadData.mediaType === 'video' ? 'Video' : 'Image'}`}
                            currentFile={uploadData.url}
                            maxSizeMB={50}
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="text-sm text-slate-400 mb-1 block">Media URL</label>
                          <input
                            type="text"
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                            value={uploadData.url}
                            onChange={(e) => setUploadData({ ...uploadData, url: e.target.value })}
                            placeholder="Enter media URL"
                          />
                        </div>
                      )}
                      
                      <div>
                        <label className="text-sm text-slate-400 mb-1 block">Caption</label>
                        <input
                          type="text"
                          className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                          value={uploadData.caption}
                          onChange={(e) => setUploadData({ ...uploadData, caption: e.target.value })}
                          placeholder="Optional caption for this media"
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={isUploading} className="w-full">
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-4 w-4 mr-2" /> Add Timelapse Item
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TimelapseViewer;
