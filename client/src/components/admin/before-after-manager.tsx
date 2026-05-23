import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BeforeAfterImage } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BeforeAfterManagerProps {
  beforeAfterImages: BeforeAfterImage[];
}

export function BeforeAfterManager({ beforeAfterImages }: BeforeAfterManagerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<BeforeAfterImage | null>(null);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  
  // Form data for before/after image editing
  const [imageForm, setImageForm] = useState({
    title: "",
    description: "",
    beforeImageUrl: "",
    afterImageUrl: "",
    isPublic: true
  });
  
  // Before/After Image Mutations
  const createBeforeAfterMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/before-after", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/before-after"] });
      toast({
        title: "Before/After Image Created",
        description: "The before/after image has been successfully created.",
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create before/after image: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateBeforeAfterMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/before-after/${data.id}`, {
        title: data.title,
        description: data.description,
        beforeImageUrl: data.beforeImageUrl,
        afterImageUrl: data.afterImageUrl,
        isPublic: data.isPublic
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/before-after"] });
      toast({
        title: "Before/After Image Updated",
        description: "The before/after image has been successfully updated.",
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update before/after image: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const deleteBeforeAfterMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/before-after/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/before-after"] });
      toast({
        title: "Before/After Image Deleted",
        description: "The before/after image has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete before/after image: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentImage) {
      updateBeforeAfterMutation.mutate({
        id: currentImage.id,
        ...imageForm,
      });
    } else {
      createBeforeAfterMutation.mutate(imageForm);
    }
  };
  
  // Open dialog for adding new image
  const openAddDialog = () => {
    setCurrentImage(null);
    setImageForm({
      title: "",
      description: "",
      beforeImageUrl: "",
      afterImageUrl: "",
      isPublic: true
    });
    setIsDialogOpen(true);
  };
  
  // Open dialog for editing image
  const openEditDialog = (image: BeforeAfterImage) => {
    setCurrentImage(image);
    setImageForm({
      title: image.title,
      description: image.description || "",
      beforeImageUrl: image.beforeImageUrl,
      afterImageUrl: image.afterImageUrl,
      isPublic: image.isPublic
    });
    setIsDialogOpen(true);
  };

  // Preview component for before/after images
  const BeforeAfterPreview = ({ image }: { image: BeforeAfterImage }) => {
    const [showAfter, setShowAfter] = useState(false);
    
    return (
      <div className="relative h-full w-full flex flex-col gap-2">
        <div className="relative h-60 rounded-md overflow-hidden">
          <img 
            src={showAfter ? image.afterImageUrl : image.beforeImageUrl} 
            alt={showAfter ? "After" : "Before"} 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2">
            <Badge className={showAfter ? "bg-green-600" : "bg-blue-600"}>
              {showAfter ? "After" : "Before"}
            </Badge>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full border-gold-dark/30 text-offwhite"
          onClick={() => setShowAfter(!showAfter)}
        >
          {showAfter ? "Show Before" : "Show After"}
        </Button>
        <div className="mt-2">
          <h3 className="text-lg font-semibold text-offwhite">{image.title}</h3>
          {image.description && (
            <p className="text-sm text-offwhite/70 mt-1">{image.description}</p>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-offwhite">Manage Before/After Images</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="border-gold-dark/30 text-offwhite"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" /> List View
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" /> Gallery View
              </>
            )}
          </Button>
          <Button 
            className="bg-gold text-black hover:bg-gold-light"
            onClick={openAddDialog}
          >
            <PlusCircle className="h-4 w-4 mr-2" /> Add Before/After
          </Button>
        </div>
      </div>
      
      {beforeAfterImages.length === 0 ? (
        <Card className="bg-[#132642] border-gold-dark/30">
          <CardContent className="pt-6">
            <p className="text-center text-offwhite">No before/after images found. Add your first comparison to get started.</p>
          </CardContent>
        </Card>
      ) : previewMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {beforeAfterImages.map((image) => (
            <Card key={image.id} className="bg-[#132642] border-gold-dark/30 overflow-hidden">
              <CardContent className="p-3 relative">
                <BeforeAfterPreview image={image} />
                
                <div className="absolute top-4 right-4 flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(image)}
                    className="h-8 w-8 rounded-full bg-black/40 text-offwhite hover:bg-black/60"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteBeforeAfterMutation.mutate(image.id)}
                    className="h-8 w-8 rounded-full bg-black/40 text-red-400 hover:bg-black/60 hover:text-red-500"
                    disabled={deleteBeforeAfterMutation.isPending}
                  >
                    {deleteBeforeAfterMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {!image.isPublic && (
                  <Badge variant="outline" className="absolute bottom-4 right-4 bg-yellow-900/60 text-yellow-300 border-yellow-600/30">
                    Private
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="border border-gold-dark/30 rounded-md overflow-hidden">
            <TableHeader className="bg-[#080d17]">
              <TableRow>
                <TableHead className="text-offwhite">Title</TableHead>
                <TableHead className="text-offwhite">Before</TableHead>
                <TableHead className="text-offwhite">After</TableHead>
                <TableHead className="text-offwhite text-center">Status</TableHead>
                <TableHead className="text-offwhite text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {beforeAfterImages.map((image) => (
                <TableRow 
                  key={image.id}
                  className="bg-[#132642] border-b border-gold-dark/10 hover:bg-[#1c304d]"
                >
                  <TableCell className="font-medium text-offwhite">
                    <div>
                      <span className="block">{image.title}</span>
                      {image.description && (
                        <span className="block text-xs text-offwhite/70 mt-1">
                          {image.description.length > 60
                            ? `${image.description.substring(0, 60)}...`
                            : image.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {image.beforeImageUrl && (
                      <div className="h-12 w-16 rounded overflow-hidden">
                        <img 
                          src={image.beforeImageUrl} 
                          alt="Before" 
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {image.afterImageUrl && (
                      <div className="h-12 w-16 rounded overflow-hidden">
                        <img 
                          src={image.afterImageUrl} 
                          alt="After" 
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={image.isPublic ? "bg-green-600" : "bg-amber-600"}>
                      {image.isPublic ? "Public" : "Private"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(image)}
                        className="h-8 w-8 text-offwhite hover:text-gold hover:bg-transparent"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBeforeAfterMutation.mutate(image.id)}
                        className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-transparent"
                        disabled={deleteBeforeAfterMutation.isPending}
                      >
                        {deleteBeforeAfterMutation.isPending ? (
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
        <DialogContent className="bg-[#0b111f] border-gold-dark/30 text-offwhite max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-gold">
              {currentImage ? "Edit Before/After Image" : "Add New Before/After Image"}
            </DialogTitle>
            <DialogDescription>
              {currentImage 
                ? "Update the details of this before/after comparison." 
                : "Upload before and after images to create a new comparison."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Drone Edit of Beach Property"
                  value={imageForm.title}
                  onChange={(e) => setImageForm({ ...imageForm, title: e.target.value })}
                  className="bg-[#080d17] border-gold-dark/30"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the before/after transformation..."
                  value={imageForm.description}
                  onChange={(e) => setImageForm({ ...imageForm, description: e.target.value })}
                  className="min-h-[80px] bg-[#080d17] border-gold-dark/30"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Before Image</Label>
                  <FileUpload
                    onFileUpload={(url) => setImageForm({ ...imageForm, beforeImageUrl: url })}
                    acceptedFileTypes="image/*"
                    buttonText="Upload Before Image"
                    currentFile={imageForm.beforeImageUrl}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label>After Image</Label>
                  <FileUpload
                    onFileUpload={(url) => setImageForm({ ...imageForm, afterImageUrl: url })}
                    acceptedFileTypes="image/*"
                    buttonText="Upload After Image"
                    currentFile={imageForm.afterImageUrl}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="isPublic"
                  checked={imageForm.isPublic}
                  onCheckedChange={(checked) => setImageForm({ ...imageForm, isPublic: checked })}
                />
                <Label htmlFor="isPublic">Make this comparison public</Label>
              </div>
            </div>
            
            <DialogFooter className="flex-col items-end gap-2 sm:flex-col">
              {(!imageForm.beforeImageUrl || !imageForm.afterImageUrl) && (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Upload both before and after images before saving.
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
                            createBeforeAfterMutation.isPending || 
                            updateBeforeAfterMutation.isPending ||
                            !imageForm.beforeImageUrl ||
                            !imageForm.afterImageUrl
                          }
                          style={(!imageForm.beforeImageUrl || !imageForm.afterImageUrl) ? { pointerEvents: "none" } : undefined}
                        >
                          {(createBeforeAfterMutation.isPending || updateBeforeAfterMutation.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {currentImage ? "Update Image" : "Add Image"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {(!imageForm.beforeImageUrl || !imageForm.afterImageUrl) && (
                      <TooltipContent>
                        <p>Upload both before and after images before saving</p>
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