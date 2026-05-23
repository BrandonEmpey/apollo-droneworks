import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Loader2, Calendar, Tag, AlertCircle, Sparkles } from "lucide-react";
import { parseAerialRejectionError } from "@/lib/upload-error";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { KeywordInput } from "@/components/ui/keyword-input";

interface BlogManagerProps {
  blogPosts: BlogPost[];
}

export function BlogManager({ blogPosts }: BlogManagerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null);
  
  // Form data for blog post editing
  const [blogForm, setBlogForm] = useState({
    title: "",
    content: "",
    excerpt: "",
    category: "",
    imageUrl: "",
    keywords: [] as string[]
  });
  
  // Blog Post Mutations
  const createBlogPostMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/blog", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({
        title: "Blog Post Created",
        description: "The blog post has been successfully created.",
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      const parsed = parseAerialRejectionError(error.message);
      toast({
        title: parsed?.title ?? "Error",
        description: parsed?.description ?? `Failed to create blog post: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateBlogPostMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/blog/${data.id}`, {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        category: data.category,
        imageUrl: data.imageUrl,
        keywords: data.keywords
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({
        title: "Blog Post Updated",
        description: "The blog post has been successfully updated.",
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      const parsed = parseAerialRejectionError(error.message);
      toast({
        title: parsed?.title ?? "Error",
        description: parsed?.description ?? `Failed to update blog post: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const generateBlogPostMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/blog/generate");
      return await res.json();
    },
    onSuccess: (post: BlogPost) => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({
        title: "AI Blog Post Generated",
        description: `"${post.title}" was created with AI-generated content and image.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Could not generate blog post.",
        variant: "destructive",
      });
    },
  });

  const deleteBlogPostMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/blog/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({
        title: "Blog Post Deleted",
        description: "The blog post has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete blog post: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPost) {
      updateBlogPostMutation.mutate({
        id: currentPost.id,
        ...blogForm,
      });
    } else {
      createBlogPostMutation.mutate(blogForm);
    }
  };
  
  // Open dialog for adding new post
  const openAddDialog = () => {
    setCurrentPost(null);
    setBlogForm({
      title: "",
      content: "",
      excerpt: "",
      category: "drone-tips",
      imageUrl: "",
      keywords: []
    });
    setIsDialogOpen(true);
  };
  
  // Open dialog for editing post
  const openEditDialog = (post: BlogPost) => {
    setCurrentPost(post);
    setBlogForm({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      category: post.category,
      imageUrl: post.imageUrl,
      keywords: post.keywords || []
    });
    setIsDialogOpen(true);
  };

  // Format category for display
  const formatCategory = (category: string) => {
    const categories: Record<string, string> = {
      "drone-tips": "Drone Tips & Tricks",
      "real-estate": "Real Estate Photography",
      "photogrammetry": "Photogrammetry",
      "editing": "Photo Editing",
      "technology": "Technology",
      "industry-news": "Industry News"
    };
    
    return categories[category] || category.replace(/-/g, " ").replace(/\b\w/g, char => char.toUpperCase());
  };
  
  // Get badge color for category
  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      "drone-tips": "bg-blue-500",
      "real-estate": "bg-green-500",
      "photogrammetry": "bg-purple-500",
      "editing": "bg-amber-500",
      "technology": "bg-cyan-500",
      "industry-news": "bg-red-500"
    };
    
    return colors[category] || "bg-gray-500";
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-offwhite">Manage Blog Posts</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-gold text-gold hover:bg-gold/10"
            onClick={() => generateBlogPostMutation.mutate()}
            disabled={generateBlogPostMutation.isPending}
            data-testid="button-generate-blog-ai"
          >
            {generateBlogPostMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" /> Generate with AI
              </>
            )}
          </Button>
          <Button
            className="bg-gold text-black hover:bg-gold-light"
            onClick={openAddDialog}
          >
            <PlusCircle className="h-4 w-4 mr-2" /> Add Blog Post
          </Button>
        </div>
      </div>
      <p className="text-xs text-offwhite/60 mb-4">
        Auto-publishes one new AI-generated post every Saturday at 9:00 AM Mountain Time.
      </p>
      
      {blogPosts.length === 0 ? (
        <Card className="bg-[#132642] border-gold-dark/30">
          <CardContent className="pt-6">
            <p className="text-center text-offwhite">No blog posts found. Add your first post to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table className="border border-gold-dark/30 rounded-md overflow-hidden">
            <TableHeader className="bg-[#080d17]">
              <TableRow>
                <TableHead className="text-offwhite">Post Title</TableHead>
                <TableHead className="text-offwhite">Excerpt</TableHead>
                <TableHead className="text-offwhite text-center">Category</TableHead>
                <TableHead className="text-offwhite text-center">Date</TableHead>
                <TableHead className="text-offwhite text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blogPosts.map((post) => (
                <TableRow 
                  key={post.id}
                  className="bg-[#132642] border-b border-gold-dark/10 hover:bg-[#1c304d]"
                >
                  <TableCell className="font-medium text-offwhite">
                    <div className="flex items-center space-x-3">
                      {post.imageUrl && (
                        <img 
                          src={post.imageUrl} 
                          alt={post.title} 
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <span>{post.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-offwhite/80">
                    <div>
                      {post.excerpt.length > 80
                        ? `${post.excerpt.substring(0, 80)}...`
                        : post.excerpt}
                      
                      {post.keywords && post.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {post.keywords.slice(0, 3).map((keyword, idx) => (
                            <Badge 
                              key={idx}
                              variant="secondary" 
                              className="bg-[#080d17] text-[0.65rem] px-1.5 py-0.5 text-offwhite/60 border border-gold-dark/10 rounded-sm"
                            >
                              {keyword}
                            </Badge>
                          ))}
                          {post.keywords.length > 3 && (
                            <Badge 
                              variant="secondary" 
                              className="bg-[#132642] text-[0.65rem] px-1.5 py-0.5 text-offwhite/60"
                            >
                              +{post.keywords.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${getCategoryBadge(post.category)}`}>
                      {formatCategory(post.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-offwhite/80">
                    <div className="flex items-center justify-center">
                      <Calendar className="h-3 w-3 mr-1.5 text-offwhite/60" />
                      {format(new Date(post.createdAt), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(post)}
                        className="h-8 w-8 text-offwhite hover:text-gold hover:bg-transparent"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBlogPostMutation.mutate(post.id)}
                        className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-transparent"
                        disabled={deleteBlogPostMutation.isPending}
                      >
                        {deleteBlogPostMutation.isPending ? (
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
        <DialogContent className="bg-[#0b111f] border-gold-dark/30 text-offwhite max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-gold">
              {currentPost ? "Edit Blog Post" : "Add New Blog Post"}
            </DialogTitle>
            <DialogDescription>
              {currentPost 
                ? "Update the details of this blog post." 
                : "Fill out the form below to add a new blog post."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Post Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Top 10 Drone Photography Tips"
                  value={blogForm.title}
                  onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                  className="bg-[#080d17] border-gold-dark/30"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  placeholder="A short summary of your blog post (shown in previews)..."
                  value={blogForm.excerpt}
                  onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                  className="min-h-[80px] bg-[#080d17] border-gold-dark/30 resize-none"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={blogForm.category}
                  onValueChange={(value) => setBlogForm({ ...blogForm, category: value })}
                  required
                >
                  <SelectTrigger id="category" className="bg-[#080d17] border-gold-dark/30">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b111f] border-gold-dark/30">
                    <SelectItem value="drone-tips">Drone Tips & Tricks</SelectItem>
                    <SelectItem value="real-estate">Real Estate Photography</SelectItem>
                    <SelectItem value="photogrammetry">Photogrammetry</SelectItem>
                    <SelectItem value="editing">Photo Editing</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="industry-news">Industry News</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="content">Blog Content</Label>
                <Textarea
                  id="content"
                  placeholder="Write your blog post content here..."
                  value={blogForm.content}
                  onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                  className="min-h-[260px] bg-[#080d17] border-gold-dark/30 font-mono"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label>Featured Image</Label>
                <FileUpload
                  onFileUpload={(url) => setBlogForm({ ...blogForm, imageUrl: url })}
                  acceptedFileTypes="image/*"
                  buttonText="Upload Featured Image"
                  currentFile={blogForm.imageUrl}
                />
              </div>
              
              <div className="grid gap-2 mt-4">
                <Label htmlFor="keywords">SEO Keywords</Label>
                <KeywordInput
                  keywords={blogForm.keywords}
                  onChange={(keywords) => setBlogForm({ ...blogForm, keywords })}
                  placeholder="Add blog post keywords for SEO..."
                  maxKeywords={15}
                  className="bg-[#080d17] border-gold-dark/30"
                />
                <p className="text-xs text-offwhite/60">
                  Add relevant keywords to improve search engine visibility and enhance blog post discoverability
                </p>
              </div>
            </div>
            
            <DialogFooter className="flex-col items-end gap-2 sm:flex-col">
              {(!blogForm.title || !blogForm.content || !blogForm.excerpt || !blogForm.category || !blogForm.imageUrl) && (
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
                            createBlogPostMutation.isPending || 
                            updateBlogPostMutation.isPending ||
                            !blogForm.title ||
                            !blogForm.content ||
                            !blogForm.excerpt ||
                            !blogForm.category ||
                            !blogForm.imageUrl
                          }
                          style={(!blogForm.title || !blogForm.content || !blogForm.excerpt || !blogForm.category || !blogForm.imageUrl) ? { pointerEvents: "none" } : undefined}
                        >
                          {(createBlogPostMutation.isPending || updateBlogPostMutation.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {currentPost ? "Update Post" : "Publish Post"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {(!blogForm.title || !blogForm.content || !blogForm.excerpt || !blogForm.category || !blogForm.imageUrl) && (
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