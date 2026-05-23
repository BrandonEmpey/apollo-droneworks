import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Settings, Image, FileText, Wrench, Package, Camera, Video, Play, Upload, Trash2, Plus, Link2, ChevronDown, GripVertical } from "lucide-react";
import { formatImageRejectionToast, parseAerialRejectionError } from "@/lib/upload-error";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { Service, Gallery, BlogPost, HeroSlide } from "@shared/schema";
import { queryClient as sharedQueryClient } from "@/lib/queryClient";

// Service Carousel Manager Component
function ServiceCarouselManager({ services }: { services?: Service[] }) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [serviceImageFile, setServiceImageFile] = useState<File | null>(null);
  const [serviceVideoFile, setServiceVideoFile] = useState<File | null>(null);
  const [imageUploadProgress, setImageUploadProgress] = useState<number>(0);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number>(0);
  const serviceImageInputRef = useRef<HTMLInputElement>(null);
  const serviceVideoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedService = services?.find(s => s.id.toString() === selectedServiceId);

  // Upload service image mutation with progress tracking
  const uploadServiceImageMutation = useMutation({
    mutationFn: async (file: File) => {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setImageUploadProgress(progress);
          }
        };
        
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (error) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const body = JSON.parse(xhr.responseText);
              reject(new Error(JSON.stringify({
                error: body?.error || `Upload failed (HTTP ${xhr.status})`,
                reason: body?.reason,
              })));
            } catch {
              reject(new Error(JSON.stringify({ error: `Upload failed (HTTP ${xhr.status})` })));
            }
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.onabort = () => reject(new Error('Upload was aborted'));
        
        xhr.open('POST', '/api/upload/image');
        xhr.send(formData);
      });
    },
    onMutate: () => {
      setImageUploadProgress(0);
    },
    onSuccess: async (data: any) => {
      if (selectedServiceId && data?.url) {
        // Add image to service carousel
        await apiRequest('POST', `/api/services/${selectedServiceId}/images`, {
          imageUrl: (data as any).url
        });
        queryClient.invalidateQueries({ queryKey: ['/api/services'] });
        toast({
          title: "Image Added",
          description: "Image has been added to the service carousel",
        });
      }
      setImageUploadProgress(0);
    },
    onError: (error: any) => {
      const parsed = parseAerialRejectionError(error.message);
      toast({
        title: parsed?.title ?? "Upload Failed",
        description: parsed?.description ?? (error.message || "Failed to upload image"),
        variant: "destructive"
      });
      setImageUploadProgress(0);
    }
  });

  // Upload service video mutation with progress tracking
  const uploadServiceVideoMutation = useMutation({
    mutationFn: async (file: File) => {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setVideoUploadProgress(progress);
          }
        };
        
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (error) {
              reject(new Error('Invalid response format'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.onabort = () => reject(new Error('Upload was aborted'));
        
        xhr.open('POST', '/api/upload/video');
        xhr.send(formData);
      });
    },
    onMutate: () => {
      setVideoUploadProgress(0);
    },
    onSuccess: async (data: any) => {
      if (selectedServiceId && data?.url) {
        // Add video to service carousel
        await apiRequest('POST', `/api/services/${selectedServiceId}/videos`, {
          videoUrl: (data as any).url
        });
        queryClient.invalidateQueries({ queryKey: ['/api/services'] });
        toast({
          title: "Video Added",
          description: "Video has been added to the service carousel",
        });
      }
      setVideoUploadProgress(0);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload video",
        variant: "destructive"
      });
      setVideoUploadProgress(0);
    }
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedServiceId) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file (JPG, PNG, WebP)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    uploadServiceImageMutation.mutate(file);
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedServiceId) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/mov'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a video file (MP4, WebM, MOV)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select a video smaller than 50MB",
        variant: "destructive"
      });
      return;
    }

    uploadServiceVideoMutation.mutate(file);
  };

  const removeServiceMedia = async (mediaType: 'image' | 'video', mediaUrl: string) => {
    if (!selectedServiceId) return;

    try {
      await apiRequest('DELETE', `/api/services/${selectedServiceId}/${mediaType === 'image' ? 'images' : 'videos'}`, {
        [mediaType === 'image' ? 'imageUrl' : 'videoUrl']: mediaUrl
      });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: "Media Removed",
        description: `${mediaType === 'image' ? 'Image' : 'Video'} has been removed from carousel`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to remove ${mediaType}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Service Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Service Selection
          </CardTitle>
          <CardDescription>
            Choose a service to manage its carousel media
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="service-select">Select Service</Label>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a service to edit..." />
                </SelectTrigger>
                <SelectContent>
                  {services?.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedService && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">{selectedService.name}</h4>
                <p className="text-sm text-muted-foreground mb-3">{selectedService.description}</p>
                <div className="flex items-center gap-3 text-sm">
                  {(selectedService.images?.length || 0) > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <Image className="w-4 h-4" />
                      {selectedService.images?.length} image{(selectedService.images?.length || 0) > 1 ? 's' : ''}
                    </span>
                  )}
                  {(selectedService.videos?.length || 0) > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <Video className="w-4 h-4" />
                      {selectedService.videos?.length} video{(selectedService.videos?.length || 0) > 1 ? 's' : ''}
                    </span>
                  )}
                  {(!selectedService.images?.length && !selectedService.videos?.length) && (
                    <span className="text-orange-500">No media configured</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Media Management */}
      {selectedService && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Service Image
              </CardTitle>
              <CardDescription>
                Main image for the service carousel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(selectedService.images?.length || 0) > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {selectedService.images?.map((imageUrl, index) => (
                      <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                        <img
                          src={imageUrl}
                          alt={`${selectedService.name} image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          onClick={() => removeServiceMedia('image', imageUrl)}
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Button
                      onClick={() => serviceImageInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      disabled={uploadServiceImageMutation.isPending}
                      className="w-full"
                    >
                      {uploadServiceImageMutation.isPending ? (
                        <>
                          <Upload className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Another Image
                        </>
                      )}
                    </Button>
                    {uploadServiceImageMutation.isPending && imageUploadProgress > 0 && (
                      <div className="space-y-1">
                        <Progress value={imageUploadProgress} className="w-full" />
                        <p className="text-xs text-muted-foreground text-center">
                          {imageUploadProgress}% uploaded
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <Image className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No images uploaded</p>
                  <div className="space-y-2">
                    <Button
                      onClick={() => serviceImageInputRef.current?.click()}
                      disabled={uploadServiceImageMutation.isPending}
                    >
                      {uploadServiceImageMutation.isPending ? (
                        <>
                          <Upload className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload First Image
                        </>
                      )}
                    </Button>
                    {uploadServiceImageMutation.isPending && imageUploadProgress > 0 && (
                      <div className="space-y-1 max-w-xs mx-auto">
                        <Progress value={imageUploadProgress} className="w-full" />
                        <p className="text-xs text-muted-foreground text-center">
                          {imageUploadProgress}% uploaded
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <input
                ref={serviceImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Video Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Service Video
              </CardTitle>
              <CardDescription>
                Optional video for the service carousel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(selectedService.videos?.length || 0) > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                    {selectedService.videos?.map((videoUrl, index) => (
                      <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                        <video
                          src={videoUrl}
                          controls
                          className="w-full h-full object-cover"
                          poster={selectedService.images?.[0] || undefined}
                        >
                          Your browser does not support the video tag.
                        </video>
                        <Button
                          onClick={() => removeServiceMedia('video', videoUrl)}
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Button
                      onClick={() => serviceVideoInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      disabled={uploadServiceVideoMutation.isPending}
                      className="w-full"
                    >
                      {uploadServiceVideoMutation.isPending ? (
                        <>
                          <Upload className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Another Video
                        </>
                      )}
                    </Button>
                    {uploadServiceVideoMutation.isPending && videoUploadProgress > 0 && (
                      <div className="space-y-1">
                        <Progress value={videoUploadProgress} className="w-full" />
                        <p className="text-xs text-muted-foreground text-center">
                          {videoUploadProgress}% uploaded
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No videos uploaded</p>
                  <div className="space-y-2">
                    <Button
                      onClick={() => serviceVideoInputRef.current?.click()}
                      disabled={uploadServiceVideoMutation.isPending}
                    >
                      {uploadServiceVideoMutation.isPending ? (
                        <>
                          <Upload className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload First Video
                        </>
                      )}
                    </Button>
                    {uploadServiceVideoMutation.isPending && videoUploadProgress > 0 && (
                      <div className="space-y-1 max-w-xs mx-auto">
                        <Progress value={videoUploadProgress} className="w-full" />
                        <p className="text-xs text-muted-foreground text-center">
                          {videoUploadProgress}% uploaded
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <input
                ref={serviceVideoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {!services?.length && (
        <Card>
          <CardContent className="text-center py-8">
            <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No services found</p>
            <p className="text-sm text-muted-foreground">Create services first to manage their carousel media</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ContentManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [slideToDelete, setSlideToDelete] = useState<HeroSlide | null>(null);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [urlType, setUrlType] = useState<"image" | "video">("image");

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: galleries } = useQuery<Gallery[]>({
    queryKey: ["/api/galleries"],
  });

  const { data: blogPosts } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });

  // Fetch hero slides from the database via the admin endpoint (includes inactive ones)
  const { data: heroSlides = [] } = useQuery<HeroSlide[]>({
    queryKey: ["/api/admin/hero-slides"],
  });

  const invalidateHeroQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-slides"] });
    queryClient.invalidateQueries({ queryKey: ["/api/hero-slides"] });
    sharedQueryClient.invalidateQueries({ queryKey: ["/api/hero-slides"] });
  };

  // Toggle a slide's active state on the homepage carousel
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/hero-slides/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      invalidateHeroQueries();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update hero slide",
        variant: "destructive",
      });
    },
  });

  // Batch reorder — submit the new id ordering to the server in a single round trip
  const reorderMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("PATCH", "/api/admin/hero-slides/reorder", { ids });
      return res.json();
    },
    onMutate: async (ids: number[]) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/hero-slides"] });
      const previous = queryClient.getQueryData<HeroSlide[]>(["/api/admin/hero-slides"]);
      if (previous) {
        const orderMap = new Map(ids.map((id, i) => [id, i + 1]));
        queryClient.setQueryData<HeroSlide[]>(
          ["/api/admin/hero-slides"],
          previous.map(s => (orderMap.has(s.id) ? { ...s, displayOrder: orderMap.get(s.id)! } : s)),
        );
      }
      return { previous };
    },
    onError: (error: any, _ids, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["/api/admin/hero-slides"], ctx.previous);
      }
      toast({
        title: "Reorder Failed",
        description: error?.message || "Could not save the new slide order",
        variant: "destructive",
      });
    },
    onSettled: () => {
      invalidateHeroQueries();
    },
  });

  const persistOrder = (sorted: HeroSlide[]) => {
    reorderMutation.mutate(sorted.map(s => s.id));
  };

  const moveSlide = (slide: HeroSlide, direction: "up" | "down") => {
    const sorted = [...heroSlides].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex(s => s.id === slide.id);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
    persistOrder(sorted);
  };

  // Drag-and-drop state for the hero slides list (mouse + touch)
  const [draggingSlideId, setDraggingSlideId] = useState<number | null>(null);
  const [dragOverSlideId, setDragOverSlideId] = useState<number | null>(null);

  // Refs used inside imperative touch listeners so they always see fresh data
  const touchDragRef = useRef<{ draggingId: number | null }>({ draggingId: null });
  const heroSlidesRef = useRef(heroSlides);
  useEffect(() => { heroSlidesRef.current = heroSlides; }, [heroSlides]);
  // Keep persistOrder callable from within stable listener closures
  const persistOrderRef = useRef(persistOrder);
  useEffect(() => { persistOrderRef.current = persistOrder; }, [persistOrder]);
  // Tracks listener cleanup so we can remove them when the list unmounts
  const slidesListCleanupRef = useRef<(() => void) | null>(null);

  // Ref callback — fires when the slides list element mounts/unmounts (even if the
  // carousel tab is not the default tab). This avoids the empty-deps useEffect bug
  // where slidesListRef.current was null on first render.
  const slidesListCallbackRef = useCallback((el: HTMLDivElement | null) => {
    if (slidesListCleanupRef.current) {
      slidesListCleanupRef.current();
      slidesListCleanupRef.current = null;
    }
    if (!el) return;

    const resetTouchState = () => {
      touchDragRef.current.draggingId = null;
      setDraggingSlideId(null);
      setDragOverSlideId(null);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchDragRef.current.draggingId == null) return;
      e.preventDefault();
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const row = target?.closest("[data-slide-id]") as HTMLElement | null;
      const targetId = row ? parseInt(row.dataset.slideId ?? "", 10) : NaN;
      setDragOverSlideId(
        !isNaN(targetId) && targetId !== touchDragRef.current.draggingId ? targetId : null,
      );
    };

    const onTouchEnd = (e: TouchEvent) => {
      const draggingId = touchDragRef.current.draggingId;
      if (draggingId == null) return;
      const touch = e.changedTouches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const row = target?.closest("[data-slide-id]") as HTMLElement | null;
      if (row) {
        const targetId = parseInt(row.dataset.slideId ?? "", 10);
        if (!isNaN(targetId) && targetId !== draggingId) {
          const slides = heroSlidesRef.current;
          const sorted = [...slides].sort((a, b) => a.displayOrder - b.displayOrder);
          const fromIdx = sorted.findIndex(s => s.id === draggingId);
          const toIdx = sorted.findIndex(s => s.id === targetId);
          if (fromIdx !== -1 && toIdx !== -1) {
            const [moved] = sorted.splice(fromIdx, 1);
            sorted.splice(toIdx, 0, moved);
            persistOrderRef.current(sorted);
          }
        }
      }
      resetTouchState();
    };

    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", resetTouchState);

    slidesListCleanupRef.current = () => {
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", resetTouchState);
    };
  }, []);

  const handleSlideDrop = (targetSlide: HeroSlide) => {
    if (draggingSlideId == null || draggingSlideId === targetSlide.id) {
      setDraggingSlideId(null);
      setDragOverSlideId(null);
      return;
    }
    const sorted = [...heroSlides].sort((a, b) => a.displayOrder - b.displayOrder);
    const fromIdx = sorted.findIndex(s => s.id === draggingSlideId);
    const toIdx = sorted.findIndex(s => s.id === targetSlide.id);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggingSlideId(null);
      setDragOverSlideId(null);
      return;
    }
    const [moved] = sorted.splice(fromIdx, 1);
    sorted.splice(toIdx, 0, moved);
    setDraggingSlideId(null);
    setDragOverSlideId(null);
    persistOrder(sorted);
  };

  // Create a new slide from an uploaded media file
  const createSlideMutation = useMutation({
    mutationFn: async (slide: { type: string; title: string; url: string; displayOrder: number }) => {
      const res = await apiRequest("POST", "/api/admin/hero-slides", slide);
      return res.json();
    },
    onSuccess: () => {
      invalidateHeroQueries();
    },
  });

  const handleUrlSubmit = async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) return;
    const nextOrder = heroSlides.length > 0
      ? Math.max(...heroSlides.map(s => s.displayOrder)) + 1
      : 1;
    try {
      await createSlideMutation.mutateAsync({
        type: urlType,
        title: urlTitle.trim() || trimmedUrl.split("/").pop() || "Custom Slide",
        url: trimmedUrl,
        displayOrder: nextOrder,
      });
      toast({
        title: "Slide Added",
        description: "New slide was added to the hero carousel",
      });
      setShowUrlDialog(false);
      setUrlInput("");
      setUrlTitle("");
      setUrlType("image");
    } catch (error: unknown) {
      toast({
        title: "Failed to Add Slide",
        description: error instanceof Error ? error.message : "Could not save the slide",
        variant: "destructive",
      });
    }
  };

  // Upload mutation for hero media
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const isVideo = file.type.startsWith('video/');
      const endpoint = isVideo ? '/api/upload/video' : '/api/upload/image';
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(JSON.stringify({
          error: err?.error || `Upload failed (HTTP ${response.status})`,
          reason: err?.reason,
        }));
      }

      return response.json();
    },
    onSuccess: async (data) => {
      const fileType = data.mimeType?.startsWith('video/') ? 'video' : 'image';
      const nextOrder = heroSlides.length > 0
        ? Math.max(...heroSlides.map(s => s.displayOrder)) + 1
        : 1;

      await createSlideMutation.mutateAsync({
        type: fileType,
        title: data.originalName || 'Custom Media',
        url: data.url,
        displayOrder: nextOrder,
      });

      toast({
        title: "Slide Added",
        description: `${data.originalName || 'New media'} was added to the hero carousel`,
      });
    },
    onError: (error: any) => {
      const parsed = parseAerialRejectionError(error.message);
      toast({
        title: parsed?.title ?? "Upload Failed",
        description: parsed?.description ?? (error.message || "Failed to upload media file"),
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image (JPG, PNG, WebP) or video (MP4, WebM) file",
        variant: "destructive"
      });
      event.target.value = "";
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 50MB",
        variant: "destructive"
      });
      event.target.value = "";
      return;
    }

    uploadMutation.mutate(file);
    event.target.value = "";
  };

  // Delete a slide from the database
  const deleteSlideMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/hero-slides/${id}`);
      return res.json();
    },
    onSuccess: () => {
      invalidateHeroQueries();
      toast({
        title: "Slide Removed",
        description: "Hero slide has been deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete hero slide",
        variant: "destructive",
      });
    },
  });

  const sortedSlides = [...heroSlides].sort((a, b) => a.displayOrder - b.displayOrder);
  const activeSlides = sortedSlides.filter(s => s.isActive);

  return (
    <>
      <Helmet>
        <title>Content Management - Apollo DroneWorks Admin</title>
      </Helmet>
      
      <Header />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="mb-6">
          <Link href="/admin">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin Control Center
            </Button>
          </Link>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Content Management System
          </h1>
          <p className="text-muted-foreground">
            Manage your services, galleries, blog content, and carousel media
          </p>
        </div>

        <Tabs defaultValue="services" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="services" className="flex items-center justify-center gap-2">
              <Wrench className="h-4 w-4 opacity-100" />
              <span>Services</span>
            </TabsTrigger>
            <TabsTrigger value="galleries" className="flex items-center justify-center gap-2">
              <Image className="h-4 w-4 opacity-100" />
              <span>Galleries</span>
            </TabsTrigger>
            <TabsTrigger value="blog" className="flex items-center justify-center gap-2">
              <FileText className="h-4 w-4 opacity-100" />
              <span>Blog Posts</span>
            </TabsTrigger>
            <TabsTrigger value="carousel" className="flex items-center justify-center gap-2">
              <Camera className="h-4 w-4 opacity-100" />
              <span>Carousel</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Services Management</h2>
              <div className="flex gap-3">
                <Link href="/admin/addons">
                  <Button variant="outline">
                    <Package className="h-4 w-4 mr-2" />
                    Manage Add-ons
                  </Button>
                </Link>
                <Link href="/admin/services">
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Services
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services?.map((service) => (
                <Card key={service.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <CardDescription>
                      ${(service.price / 100).toFixed(0)} - {service.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {service.features?.length || 0} features
                    </p>
                  </CardContent>
                </Card>
              )) || (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No services found. Create your first service to get started.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="galleries" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Gallery Management</h2>
              <Link href="/admin/galleries">
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Galleries
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {galleries?.map((gallery) => (
                <Card key={gallery.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{gallery.name}</CardTitle>
                    <CardDescription>{gallery.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {gallery.type} - {gallery.keywords?.length || 0} keywords
                    </p>
                  </CardContent>
                </Card>
              )) || (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No galleries found. Create your first gallery to showcase your work.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="blog" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Blog Management</h2>
              <Link href="/admin/blog">
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Blog
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogPosts?.map((post) => (
                <Card key={post.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                    <CardDescription>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {post.content?.substring(0, 100)}...
                    </p>
                  </CardContent>
                </Card>
              )) || (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No blog posts found. Create your first post to share insights and updates.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="carousel" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Carousel Media Manager</h2>
                <p className="text-muted-foreground mt-1">Manage carousel content for homepage and service pages</p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowUrlDialog(true)}
                  variant="outline"
                  className="border-border"
                  disabled={uploadMutation.isPending}
                  data-testid="button-add-hero-url"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Add via URL
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="border-gold text-gold hover:bg-gold/10"
                  disabled={uploadMutation.isPending}
                  data-testid="button-add-hero-media"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {uploadMutation.isPending ? "Uploading…" : "Upload File"}
                </Button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Carousel Sub-tabs */}
            <Tabs defaultValue="homepage" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="homepage">Homepage Hero Carousel</TabsTrigger>
                <TabsTrigger value="services">Service Page Carousels</TabsTrigger>
              </TabsList>

              <TabsContent value="homepage" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Saved Slides */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Image className="w-5 h-5" />
                        Saved Hero Slides
                      </CardTitle>
                      <CardDescription>
                        Toggle a slide off to hide it without deleting. Drag the handle to reorder, or use the arrows for keyboard access. Saved slides persist in the database and survive clearing your browser.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {sortedSlides.length === 0 ? (
                        <div className="h-32 border-2 border-dashed border-muted rounded-lg flex items-center justify-center text-center text-sm text-muted-foreground">
                          No slides saved yet. Upload a file or paste a URL above to replace the default Southern Utah hero images.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto" data-testid="hero-slides-list" ref={slidesListCallbackRef}>
                          {sortedSlides.map((slide, idx) => (
                            <div
                              key={slide.id}
                              data-slide-id={slide.id}
                              draggable
                              onDragStart={(e) => {
                                setDraggingSlideId(slide.id);
                                e.dataTransfer.effectAllowed = "move";
                                try {
                                  e.dataTransfer.setData("text/plain", String(slide.id));
                                } catch {}
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                if (dragOverSlideId !== slide.id) setDragOverSlideId(slide.id);
                              }}
                              onDragLeave={() => {
                                if (dragOverSlideId === slide.id) setDragOverSlideId(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                handleSlideDrop(slide);
                              }}
                              onDragEnd={() => {
                                setDraggingSlideId(null);
                                setDragOverSlideId(null);
                              }}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                slide.isActive ? "border-gold bg-gold/5" : "border-border opacity-60"
                              } ${draggingSlideId === slide.id ? "opacity-40" : ""} ${
                                dragOverSlideId === slide.id && draggingSlideId !== slide.id
                                  ? "ring-2 ring-gold"
                                  : ""
                              }`}
                              data-testid={`hero-slide-row-${slide.id}`}
                            >
                              <span
                                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
                                aria-label="Drag to reorder"
                                data-testid={`hero-slide-drag-handle-${slide.id}`}
                                onTouchStart={() => {
                                  touchDragRef.current.draggingId = slide.id;
                                  setDraggingSlideId(slide.id);
                                }}
                              >
                                <GripVertical className="h-4 w-4" />
                              </span>

                              <input
                                type="checkbox"
                                checked={slide.isActive}
                                onChange={(e) =>
                                  toggleActiveMutation.mutate({ id: slide.id, isActive: e.target.checked })
                                }
                                className="w-4 h-4"
                                aria-label={`Toggle slide ${slide.title}`}
                                data-testid={`hero-slide-toggle-${slide.id}`}
                              />

                              <div className="w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                                {slide.type === "image" ? (
                                  <img
                                    src={slide.url}
                                    alt={slide.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Video className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{slide.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {slide.type} • Order {slide.displayOrder}
                                </p>
                              </div>

                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveSlide(slide, "up")}
                                  disabled={idx === 0 || reorderMutation.isPending}
                                  className="h-8 w-8 p-0"
                                  aria-label="Move up"
                                >
                                  ▲
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveSlide(slide, "down")}
                                  disabled={idx === sortedSlides.length - 1 || reorderMutation.isPending}
                                  className="h-8 w-8 p-0"
                                  aria-label="Move down"
                                >
                                  ▼
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSlideToDelete(slide)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8 p-0"
                                  aria-label="Delete slide"
                                  data-testid={`hero-slide-delete-${slide.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Carousel Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        Live Carousel Preview
                      </CardTitle>
                      <CardDescription>
                        {activeSlides.length} active slide{activeSlides.length !== 1 ? "s" : ""} • These appear on the homepage right now
                        {activeSlides.length === 0 && sortedSlides.length === 0 ? " (defaults will show until you add slides)" : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {activeSlides.length === 0 ? (
                        <div className="h-48 border-2 border-dashed border-muted rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">No active slides</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              The homepage will fall back to the default Southern Utah images.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {activeSlides.map((slide) => (
                              <div key={slide.id} className="relative aspect-video rounded overflow-hidden bg-muted">
                                {slide.type === "image" ? (
                                  <img
                                    src={slide.url}
                                    alt={slide.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-black flex items-center justify-center">
                                    <Play className="w-6 h-6 text-white" />
                                  </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                                  {slide.title}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                            <span>{activeSlides.length} active slide{activeSlides.length !== 1 ? "s" : ""}</span>
                            <span>Auto-rotation enabled</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="services" className="space-y-4">
                <ServiceCarouselManager services={services} />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showUrlDialog} onOpenChange={(open) => { if (!open) { setShowUrlDialog(false); setUrlInput(""); setUrlTitle(""); setUrlType("image"); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Slide via URL</DialogTitle>
            <DialogDescription>
              Paste a URL to an image or video. The URL will be saved directly — no file is uploaded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="hero-url-input">Image / Video URL</Label>
              <Input
                id="hero-url-input"
                placeholder="https://example.com/photo.jpg or /uploads/my-image.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleUrlSubmit(); }}
                data-testid="hero-url-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-url-title">Title (optional)</Label>
              <Input
                id="hero-url-title"
                placeholder="Slide title — defaults to filename if blank"
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
                data-testid="hero-url-title-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-url-type">Media Type</Label>
              <Select value={urlType} onValueChange={(v) => setUrlType(v as "image" | "video")}>
                <SelectTrigger id="hero-url-type" data-testid="hero-url-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {urlInput.trim() && urlType === "image" && (
              <div className="space-y-1">
                <Label>Preview</Label>
                <div className="aspect-video rounded overflow-hidden bg-muted border">
                  <img
                    src={urlInput.trim()}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    onLoad={(e) => { (e.target as HTMLImageElement).style.display = ""; }}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUrlDialog(false); setUrlInput(""); setUrlTitle(""); setUrlType("image"); }}>
              Cancel
            </Button>
            <Button
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim() || createSlideMutation.isPending}
              data-testid="hero-url-submit"
            >
              {createSlideMutation.isPending ? "Saving…" : "Add Slide"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!slideToDelete} onOpenChange={(open) => { if (!open) setSlideToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hero Slide</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{slideToDelete?.title}"</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (slideToDelete) {
                  deleteSlideMutation.mutate(slideToDelete.id);
                  setSlideToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}