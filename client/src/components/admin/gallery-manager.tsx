import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Gallery } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Edit, Trash2, Loader2, Image, Film, Eye, EyeOff, Grid, List, Tag, X, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { KeywordInput } from "@/components/ui/keyword-input";

interface GalleryManagerProps {
  galleries: Gallery[];
  userId: number;
}

export function GalleryManager({ galleries, userId }: GalleryManagerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentGallery, setCurrentGallery] = useState<Gallery | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [tagInput, setTagInput] = useState("");
  
  // Form data for gallery editing
  const [galleryForm, setGalleryForm] = useState({
    name: "",
    type: "image",
    url: "",
    isPublic: true,
    category: "uncategorized",
    tags: [] as string[],
    description: "",
    publicDescription: "",
    thumbnail: "",
    keywords: [] as string[]
  });
  
  // Get unique categories from galleries
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>(["all", "uncategorized"]);
    galleries.forEach(gallery => {
      if (gallery.category) {
        uniqueCategories.add(gallery.category);
      }
    });
    return Array.from(uniqueCategories);
  }, [galleries]);
  
  // Gallery Mutations
  const createGalleryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/galleries", {
        ...data,
        userId,
        bookingId: null // Set to an actual bookingId if needed
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      toast({
        title: "Gallery Item Created",
        description: "The gallery item has been successfully created.",
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create gallery item: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateGalleryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/galleries/${data.id}`, {
        name: data.name,
        type: data.type,
        url: data.url,
        isPublic: data.isPublic,
        category: data.category,
        tags: data.tags,
        description: data.description,
        publicDescription: data.publicDescription,
        thumbnail: data.thumbnail,
        keywords: data.keywords
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      toast({
        title: "Gallery Item Updated",
        description: "The gallery item has been successfully updated.",
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update gallery item: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const deleteGalleryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/galleries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      toast({
        title: "Gallery Item Deleted",
        description: "The gallery item has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete gallery item: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentGallery) {
      updateGalleryMutation.mutate({
        id: currentGallery.id,
        ...galleryForm,
      });
    } else {
      createGalleryMutation.mutate(galleryForm);
    }
  };
  
  // Open dialog for adding new gallery item
  const openAddDialog = () => {
    setCurrentGallery(null);
    setGalleryForm({
      name: "",
      type: "image",
      url: "",
      isPublic: true,
      category: "uncategorized",
      tags: [],
      description: "",
      publicDescription: "",
      thumbnail: "",
      keywords: []
    });
    setIsDialogOpen(true);
  };
  
  // Open dialog for editing gallery item
  const openEditDialog = (gallery: Gallery) => {
    setCurrentGallery(gallery);
    setGalleryForm({
      name: gallery.name,
      type: gallery.type,
      url: gallery.url,
      isPublic: gallery.isPublic,
      category: gallery.category || "uncategorized",
      tags: gallery.tags || [],
      description: gallery.description || "",
      publicDescription: gallery.publicDescription || "",
      thumbnail: gallery.thumbnail || "",
      keywords: gallery.keywords || []
    });
    setIsDialogOpen(true);
  };
  
  // Tag management functions
  const addTag = () => {
    if (tagInput.trim() && !galleryForm.tags.includes(tagInput.trim())) {
      setGalleryForm({
        ...galleryForm,
        tags: [...galleryForm.tags, tagInput.trim()]
      });
      setTagInput("");
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    setGalleryForm({
      ...galleryForm,
      tags: galleryForm.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Extract the actual URL from our special format if needed
  const getActualUrl = (url: string | undefined): string => {
    // Check for null/undefined URLs and return a placeholder if necessary
    if (!url) {
      return '';
    }
    
    // Check if it's our special format (mockUrl#objectUrl)
    if (url.includes('#') && url.startsWith('local-file://')) {
      const parts = url.split('#');
      return parts.length > 1 ? parts[1] : url;
    }
    return url;
  };

  // Filter galleries by type and category
  const filteredGalleries = galleries
    .filter(gallery => filterType === "all" || gallery.type === filterType)
    .filter(gallery => filterCategory === "all" || gallery.category === filterCategory);
  
  // Get appropriate icon for gallery type
  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "video":
        return <Film className="h-4 w-4" />;
      default:
        return <Image className="h-4 w-4" />;
    }
  };
  
  return (
    <div>
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-offwhite">Manage Gallery</h2>
          <div className="flex space-x-2">
            <div className="flex border border-gold-dark/30 rounded-md overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterType("all")}
                className={`rounded-none px-3 ${filterType === "all" ? "bg-gold text-black" : "text-offwhite"}`}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterType("image")}
                className={`rounded-none px-3 ${filterType === "image" ? "bg-gold text-black" : "text-offwhite"}`}
              >
                Images
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterType("video")}
                className={`rounded-none px-3 ${filterType === "video" ? "bg-gold text-black" : "text-offwhite"}`}
              >
                Videos
              </Button>
            </div>
            
            <div className="flex border border-gold-dark/30 rounded-md overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("grid")}
                className={`rounded-none ${viewMode === "grid" ? "bg-gold text-black" : "text-offwhite"}`}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("list")}
                className={`rounded-none ${viewMode === "list" ? "bg-gold text-black" : "text-offwhite"}`}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            <Button 
              className="bg-gold text-black hover:bg-gold-light"
              onClick={openAddDialog}
            >
              <PlusCircle className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm text-offwhite font-medium">Categories:</div>
          {categories.map(category => (
            <Badge 
              key={category}
              className={`cursor-pointer ${filterCategory === category 
                ? "bg-gold text-black" 
                : "bg-[#132642] hover:bg-[#1c304d] text-offwhite"}`}
              onClick={() => setFilterCategory(category)}
            >
              {category === "all" ? "All Categories" : category}
            </Badge>
          ))}
        </div>
      </div>
      
      {filteredGalleries.length === 0 ? (
        <Card className="bg-[#132642] border-gold-dark/30">
          <CardContent className="pt-6">
            <p className="text-center text-offwhite">
              {filterType === "all" 
                ? "No gallery items found."
                : `No ${filterType} items found in the gallery.`}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredGalleries.map((gallery) => (
            <Card key={gallery.id} className="bg-[#132642] border-gold-dark/30 overflow-hidden">
              <div className="relative h-48 bg-[#080d17]">
                {gallery.type === "image" ? (
                  <img 
                    src={getActualUrl(gallery.url)} 
                    alt={gallery.name} 
                    className="w-full h-full object-cover"
                  />
                ) : gallery.type === "video" ? (
                  <div className="relative w-full h-full">
                    <video 
                      src={getActualUrl(gallery.url)}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                      onMouseOver={(e) => e.currentTarget.play()}
                      onMouseOut={(e) => e.currentTarget.pause()}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Film className="h-12 w-12 text-white/50" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full bg-[#080d17]">
                    <Image className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                
                <div className="absolute top-2 left-2">
                  <Badge className={gallery.type === "video" ? "bg-purple-600" : "bg-blue-600"}>
                    {gallery.type}
                  </Badge>
                </div>
                
                <div className="absolute top-2 right-2 flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(gallery)}
                    className="h-8 w-8 rounded-full bg-black/40 text-offwhite hover:bg-black/60"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteGalleryMutation.mutate(gallery.id)}
                    className="h-8 w-8 rounded-full bg-black/40 text-red-400 hover:bg-black/60 hover:text-red-500"
                    disabled={deleteGalleryMutation.isPending}
                  >
                    {deleteGalleryMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <CardFooter className="flex flex-col pt-4 gap-2">
                <div className="flex justify-between items-center w-full">
                  <div>
                    <h3 className="font-medium text-offwhite">{gallery.name}</h3>
                    {gallery.category && gallery.category !== 'uncategorized' && (
                      <p className="text-xs text-muted-foreground capitalize">{gallery.category.replace('_', ' ')}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    {!gallery.isPublic && (
                      <Badge variant="outline" className="bg-yellow-900/60 text-yellow-300 border-yellow-600/30">
                        Private
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Display tags */}
                {gallery.tags && gallery.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {gallery.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="bg-[#0b111f]/80 text-gold text-xs px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Display SEO keywords */}
                {gallery.keywords && gallery.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {gallery.keywords.map(keyword => (
                      <Badge key={keyword} variant="outline" className="bg-[#0b111f]/80 text-emerald-400 text-xs px-1.5 py-0 border-emerald-400/30">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="border border-gold-dark/30 rounded-md overflow-hidden">
            <TableHeader className="bg-[#080d17]">
              <TableRow>
                <TableHead className="text-offwhite">Name</TableHead>
                <TableHead className="text-offwhite">Type</TableHead>
                <TableHead className="text-offwhite">Category</TableHead>
                <TableHead className="text-offwhite">Preview</TableHead>
                <TableHead className="text-offwhite text-center">Status</TableHead>
                <TableHead className="text-offwhite text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGalleries.map((gallery) => (
                <TableRow 
                  key={gallery.id}
                  className="bg-[#132642] border-b border-gold-dark/10 hover:bg-[#1c304d]"
                >
                  <TableCell className="font-medium text-offwhite">
                    {gallery.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {getTypeIcon(gallery.type)}
                      <span className="ml-2 text-offwhite capitalize">{gallery.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-offwhite capitalize">
                      {gallery.category 
                        ? gallery.category.replace('_', ' ') 
                        : "Uncategorized"}
                    </span>
                    {/* Display tags */}
                    {gallery.tags && gallery.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {gallery.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="bg-[#0b111f]/80 text-gold text-xs px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {gallery.tags.length > 2 && (
                          <Badge variant="secondary" className="bg-[#0b111f]/80 text-gold text-xs px-1.5 py-0">
                            +{gallery.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Display SEO keywords */}
                    {gallery.keywords && gallery.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {gallery.keywords.slice(0, 2).map(keyword => (
                          <Badge key={keyword} variant="outline" className="bg-[#0b111f]/80 text-emerald-400 text-xs px-1.5 py-0 border-emerald-400/30">
                            {keyword}
                          </Badge>
                        ))}
                        {gallery.keywords.length > 2 && (
                          <Badge variant="outline" className="bg-[#0b111f]/80 text-emerald-400 text-xs px-1.5 py-0 border-emerald-400/30">
                            +{gallery.keywords.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="h-12 w-20 rounded overflow-hidden bg-[#080d17]">
                      {gallery.type === "image" ? (
                        <img 
                          src={getActualUrl(gallery.url)} 
                          alt={gallery.name} 
                          className="h-full w-full object-cover"
                        />
                      ) : gallery.type === "video" ? (
                        <div className="relative h-full w-full">
                          <video 
                            src={getActualUrl(gallery.url)}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Film className="h-5 w-5 text-white/70" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Image className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={gallery.isPublic ? "bg-green-600" : "bg-amber-600"}>
                      {gallery.isPublic ? "Public" : "Private"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(gallery)}
                        className="h-8 w-8 text-offwhite hover:text-gold hover:bg-transparent"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteGalleryMutation.mutate(gallery.id)}
                        className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-transparent"
                        disabled={deleteGalleryMutation.isPending}
                      >
                        {deleteGalleryMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#0b111f] border-gold-dark/30 text-offwhite max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-gold">
              {currentGallery ? "Edit Gallery Item" : "Add Gallery Item"}
            </DialogTitle>
            <DialogDescription>
              {currentGallery 
                ? "Update the details of this gallery item." 
                : "Upload an image or video to the gallery."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Beachfront Property Aerial View"
                  value={galleryForm.name}
                  onChange={(e) => setGalleryForm({ ...galleryForm, name: e.target.value })}
                  className="bg-[#080d17] border-gold-dark/30"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select 
                  value={galleryForm.type} 
                  onValueChange={(value) => setGalleryForm({ ...galleryForm, type: value })}
                >
                  <SelectTrigger id="type" className="bg-[#080d17] border-gold-dark/30">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b111f] border-gold-dark/30">
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="url">
                  {galleryForm.type === "image" ? "Image" : "Video"}
                </Label>
                <FileUpload
                  onFileUpload={(url) => setGalleryForm({ ...galleryForm, url })}
                  acceptedFileTypes={galleryForm.type === "image" ? "image/*" : "video/*"}
                  buttonText={`Upload ${galleryForm.type === "image" ? "Image" : "Video"}`}
                  currentFile={galleryForm.url}
                  maxSizeMB={100} // Increased from the default 10MB to 100MB
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={galleryForm.category} 
                  onValueChange={(value) => setGalleryForm({ ...galleryForm, category: value })}
                >
                  <SelectTrigger id="category" className="bg-[#080d17] border-gold-dark/30">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b111f] border-gold-dark/30">
                    <SelectItem value="uncategorized">Uncategorized</SelectItem>
                    <SelectItem value="real_estate">Real Estate</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="photogrammetry">Photogrammetry</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add a brief description of this gallery item (for internal use)..."
                  value={galleryForm.description}
                  onChange={(e) => setGalleryForm({ ...galleryForm, description: e.target.value })}
                  className="bg-[#080d17] border-gold-dark/30" 
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="publicDescription">Public Description</Label>
                <Textarea
                  id="publicDescription"
                  placeholder="Add a customer-facing description for this gallery item..."
                  value={galleryForm.publicDescription}
                  onChange={(e) => setGalleryForm({ ...galleryForm, publicDescription: e.target.value })}
                  className="bg-[#080d17] border-gold-dark/30" 
                  rows={3}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="keywords">SEO Keywords</Label>
                <KeywordInput 
                  keywords={galleryForm.keywords} 
                  onChange={(keywords) => setGalleryForm({ ...galleryForm, keywords })}
                  placeholder="Add SEO keywords..."
                  className="bg-[#080d17] border-gold-dark/30"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Add keywords to improve search visibility (press Enter or comma after each)
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {galleryForm.tags.map(tag => (
                    <Badge key={tag} className="bg-[#132642] text-offwhite flex items-center gap-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-400" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tags..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="bg-[#080d17] border-gold-dark/30"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    onClick={addTag}
                    className="bg-gold text-black hover:bg-gold-light"
                  >
                    <Tag className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="thumbnail">Thumbnail URL (Optional)</Label>
                <Input
                  id="thumbnail"
                  placeholder="Leave blank to use the main image"
                  value={galleryForm.thumbnail}
                  onChange={(e) => setGalleryForm({ ...galleryForm, thumbnail: e.target.value })}
                  className="bg-[#080d17] border-gold-dark/30"
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="isPublic"
                  checked={galleryForm.isPublic}
                  onCheckedChange={(checked) => setGalleryForm({ ...galleryForm, isPublic: checked })}
                />
                <Label htmlFor="isPublic">Make this item public</Label>
              </div>
            </div>
            
            <DialogFooter className="flex-col items-end gap-2 sm:flex-col">
              {(!galleryForm.name || !galleryForm.url) && (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Fill in all required fields before saving.
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="border-gold-dark/30 text-offwhite hover:bg-[#132642]"
                >
                  Cancel
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block">
                        <Button 
                          type="submit"
                          className="bg-gold text-black hover:bg-gold-light"
                          disabled={
                            createGalleryMutation.isPending || 
                            updateGalleryMutation.isPending ||
                            !galleryForm.name ||
                            !galleryForm.url
                          }
                          style={(!galleryForm.name || !galleryForm.url) ? { pointerEvents: "none" } : undefined}
                        >
                          {(createGalleryMutation.isPending || updateGalleryMutation.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {currentGallery ? "Update Item" : "Add Item"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {(!galleryForm.name || !galleryForm.url) && (
                      <TooltipContent>
                        <p>Fill in all required fields before saving</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}