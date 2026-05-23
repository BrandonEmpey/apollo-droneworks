import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Dialog } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Pencil, Plus, Save, Trash, Upload, Eye, EyeOff, Image as ImageIcon, MoveUp, MoveDown } from "lucide-react";

// Define the About page content type
interface AboutPageContent {
  id: number;
  section: string;
  title: string;
  content: string;
  imageUrl: string | null;
  displayOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

// Group content by section
type GroupedContent = Record<string, AboutPageContent[]>;

// Schema for editing content
const editContentSchema = z.object({
  section: z.string().min(1, { message: "Section is required" }),
  title: z.string().min(1, { message: "Title is required" }),
  content: z.string().min(1, { message: "Content is required" }),
  imageUrl: z.string().nullable().optional(),
  displayOrder: z.number().int().positive().default(0),
  isVisible: z.boolean().default(true),
});

type EditContentFormValues = z.infer<typeof editContentSchema>;

export default function AdminAboutPageEditor() {
  const [activeTab, setActiveTab] = useState("mission");
  const [editContent, setEditContent] = useState<AboutPageContent | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<AboutPageContent | null>(null);
  
  const { toast } = useToast();
  
  // Fetch about page content
  const { data: aboutContent, isLoading, error } = useQuery<GroupedContent>({
    queryKey: ["/api/about-content"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Form for adding/editing content
  const form = useForm<EditContentFormValues>({
    resolver: zodResolver(editContentSchema),
    defaultValues: {
      section: "mission",
      title: "",
      content: "",
      imageUrl: "",
      displayOrder: 0,
      isVisible: true,
    }
  });
  
  // Reset form when editContent changes
  useEffect(() => {
    if (editContent) {
      form.reset({
        section: editContent.section,
        title: editContent.title,
        content: editContent.content,
        imageUrl: editContent.imageUrl || "",
        displayOrder: editContent.displayOrder,
        isVisible: editContent.isVisible,
      });
    } else {
      form.reset({
        section: activeTab,
        title: "",
        content: "",
        imageUrl: "",
        displayOrder: getNextDisplayOrder(activeTab),
        isVisible: true,
      });
    }
  }, [editContent, activeTab, form, aboutContent]);
  
  // Get next display order for new content
  const getNextDisplayOrder = (section: string): number => {
    if (!aboutContent || !aboutContent[section]) return 1;
    
    const sectionItems = aboutContent[section];
    if (sectionItems.length === 0) return 1;
    
    return Math.max(...sectionItems.map(item => item.displayOrder)) + 1;
  };
  
  // Add content mutation
  const addContentMutation = useMutation({
    mutationFn: async (data: EditContentFormValues) => {
      const response = await apiRequest("POST", "/api/about-content", data);
      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/about-content"] });
      toast({
        title: "Content added",
        description: "The about page content has been added successfully.",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error adding content",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update content mutation
  const updateContentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EditContentFormValues }) => {
      const response = await apiRequest("PUT", `/api/about-content/${id}`, data);
      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/about-content"] });
      toast({
        title: "Content updated",
        description: "The about page content has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditContent(null);
    },
    onError: (error) => {
      toast({
        title: "Error updating content",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete content mutation
  const deleteContentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/about-content/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/about-content"] });
      toast({
        title: "Content deleted",
        description: "The about page content has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setContentToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error deleting content",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update visibility mutation
  const updateVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: number; isVisible: boolean }) => {
      const response = await apiRequest("PUT", `/api/about-content/${id}`, { isVisible });
      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/about-content"] });
    },
    onError: (error) => {
      toast({
        title: "Error updating visibility",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update display order mutation
  const updateDisplayOrderMutation = useMutation({
    mutationFn: async ({ id, displayOrder }: { id: number; displayOrder: number }) => {
      const response = await apiRequest("PUT", `/api/about-content/${id}`, { displayOrder });
      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/about-content"] });
    },
    onError: (error) => {
      toast({
        title: "Error updating display order",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handlers
  const onAddContent = (data: EditContentFormValues) => {
    addContentMutation.mutate(data);
  };
  
  const onEditContent = (data: EditContentFormValues) => {
    if (editContent) {
      updateContentMutation.mutate({ id: editContent.id, data });
    }
  };
  
  const onDeleteContent = () => {
    if (contentToDelete) {
      deleteContentMutation.mutate(contentToDelete.id);
    }
  };
  
  const toggleVisibility = (content: AboutPageContent) => {
    updateVisibilityMutation.mutate({
      id: content.id,
      isVisible: !content.isVisible
    });
  };
  
  const moveContentUp = (content: AboutPageContent, index: number) => {
    if (index === 0) return; // Already at the top
    
    const sectionContents = aboutContent?.[content.section] || [];
    const previousContent = sectionContents[index - 1];
    
    updateDisplayOrderMutation.mutate({
      id: content.id,
      displayOrder: previousContent.displayOrder
    });
    
    updateDisplayOrderMutation.mutate({
      id: previousContent.id,
      displayOrder: content.displayOrder
    });
  };
  
  const moveContentDown = (content: AboutPageContent, index: number) => {
    const sectionContents = aboutContent?.[content.section] || [];
    if (index === sectionContents.length - 1) return; // Already at the bottom
    
    const nextContent = sectionContents[index + 1];
    
    updateDisplayOrderMutation.mutate({
      id: content.id,
      displayOrder: nextContent.displayOrder
    });
    
    updateDisplayOrderMutation.mutate({
      id: nextContent.id,
      displayOrder: content.displayOrder
    });
  };
  
  // Define section labels for the tabs
  const sectionLabels: Record<string, string> = {
    mission: "Mission",
    values: "Values",
    certifications: "Certifications"
  };
  
  // Get available sections from the content
  const availableSections = aboutContent ? Object.keys(aboutContent) : ["mission", "values", "certifications"];
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <span>Loading about page content...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">Error loading about page content.</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/about-content"] })}>
          Try Again
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">About Page Content</h2>
        <Button 
          onClick={() => {
            setEditContent(null);
            form.reset({
              section: activeTab,
              title: "",
              content: "",
              imageUrl: "",
              displayOrder: getNextDisplayOrder(activeTab),
              isVisible: true,
            });
            setIsAddDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Content
        </Button>
      </div>
      
      <p className="text-muted-foreground">
        Manage the content that appears on the About page. You can add, edit, or remove sections and content.
      </p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          {availableSections.map(section => (
            <TabsTrigger key={section} value={section}>
              {sectionLabels[section] || section.charAt(0).toUpperCase() + section.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {availableSections.map(section => (
          <TabsContent key={section} value={section} className="space-y-4">
            {aboutContent && aboutContent[section] && aboutContent[section].length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aboutContent[section]
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((content, index) => (
                    <Card key={content.id} className={content.isVisible ? "" : "opacity-60"}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                          <CardTitle className="text-xl">{content.title}</CardTitle>
                          <CardDescription>Order: {content.displayOrder}</CardDescription>
                        </div>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => moveContentUp(content, index)}
                            disabled={index === 0}
                          >
                            <MoveUp className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => moveContentDown(content, index)}
                            disabled={index === aboutContent[section].length - 1}
                          >
                            <MoveDown className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => toggleVisibility(content)}
                          >
                            {content.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground line-clamp-3 mb-2">
                          {content.content}
                        </div>
                        {content.imageUrl && (
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <ImageIcon className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[200px]">{content.imageUrl}</span>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-between pt-2">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setContentToDelete(content);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash className="h-4 w-4 mr-2" /> Delete
                        </Button>
                        <Button
                          onClick={() => {
                            setEditContent(content);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="text-center p-8 bg-muted rounded-lg">
                <p className="text-muted-foreground mb-4">No content found for this section.</p>
                <Button 
                  onClick={() => {
                    setEditContent(null);
                    form.reset({
                      section,
                      title: "",
                      content: "",
                      imageUrl: "",
                      displayOrder: 1,
                      isVisible: true,
                    });
                    setIsAddDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Content
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
      
      {/* Add Content Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add About Page Content</DialogTitle>
            <DialogDescription>
              Add new content to the About page. This will be visible to all users.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAddContent)} className="space-y-4">
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a section" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mission">Mission</SelectItem>
                        <SelectItem value="values">Values</SelectItem>
                        <SelectItem value="certifications">Certifications</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter content" 
                        className="min-h-[150px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter image URL" 
                        {...field} 
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormDescription>
                      For best results, use images sized at 800x600 pixels or larger
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        placeholder="Enter display order" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        value={field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      Lower numbers will appear first in their section
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isVisible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Visible</FormLabel>
                      <FormDescription>
                        Make this content visible on the About page
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addContentMutation.isPending}>
                  {addContentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Content
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Content Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit About Page Content</DialogTitle>
            <DialogDescription>
              Update the content for the About page.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditContent)} className="space-y-4">
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a section" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mission">Mission</SelectItem>
                        <SelectItem value="values">Values</SelectItem>
                        <SelectItem value="certifications">Certifications</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter content" 
                        className="min-h-[150px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter image URL" 
                        {...field} 
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormDescription>
                      For best results, use images sized at 800x600 pixels or larger
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        placeholder="Enter display order" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        value={field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      Lower numbers will appear first in their section
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isVisible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Visible</FormLabel>
                      <FormDescription>
                        Make this content visible on the About page
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateContentMutation.isPending}>
                  {updateContentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Content Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete Content</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this content? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {contentToDelete && (
            <div className="border rounded-md p-4 mb-4">
              <h3 className="font-medium">{contentToDelete.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {contentToDelete.content}
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={onDeleteContent}
              disabled={deleteContentMutation.isPending}
            >
              {deleteContentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}