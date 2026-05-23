import React, { useState } from 'react';
import { useDismissibleBanner, BANNER_KEYS } from "@/hooks/use-dismissible-banner";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  MoreVertical,
  PlusCircle,
  Calendar,
  Facebook,
  Instagram,
  Twitter,
  Video,
  Link2,
  BookOpen,
  Send,
  Trash2,
  Edit,
  AlertCircle,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Bookmark,
  BarChart,
  Upload,
  Repeat2,
  X
} from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Types for our data
interface SocialMediaAccount {
  id: number;
  userId: number;
  platform: string;
  accountId: string;
  accountName: string;
  connected: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SocialPost {
  id: number;
  userId: number;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  scheduledFor: string | null;
  published: boolean;
  publishedTo: string[];
  createdAt: string;
  updatedAt: string;
}

// Define validation schemas
const createAccountSchema = z.object({
  platform: z.string().min(1, "Platform is required"),
  accountName: z.string().min(1, "Account name is required"),
  accountId: z.string().min(1, "Account ID is required"),
});

const createPostSchema = z.object({
  content: z.string().min(1, "Content is required"),
  mediaUrl: z.string().optional(),
  mediaType: z.string().optional(),
  scheduledFor: z.string().optional(),
});

export default function SocialMediaPortal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { dismissed: aiCampaignDismissed, dismiss: dismissAiCampaign } = useDismissibleBanner(BANNER_KEYS.AI_AD_CAMPAIGN);
  const [selectedTab, setSelectedTab] = useState("posts");
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [platformsToPublish, setPlatformsToPublish] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch social media accounts
  const {
    data: accounts = [],
    isLoading: accountsLoading,
    error: accountsError
  } = useQuery({
    queryKey: ['/api/social-accounts'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/social-accounts');
      if (!res.ok) throw new Error('Failed to fetch accounts');
      return res.json();
    }
  });

  // Fetch posts
  const {
    data: posts = [],
    isLoading: postsLoading,
    error: postsError
  } = useQuery({
    queryKey: ['/api/social-posts'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/social-posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      return res.json();
    }
  });

  // Add account mutation
  const addAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/social-accounts', data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to add account');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-accounts'] });
      setIsAddingAccount(false);
      toast({
        title: "Account added",
        description: "The social media account has been added successfully",
      });
      accountForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/social-accounts/${id}`);
      if (!res.ok) throw new Error('Failed to delete account');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-accounts'] });
      toast({
        title: "Account deleted",
        description: "The social media account has been deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add post mutation
  const addPostMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/social-posts', data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create post');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-posts'] });
      setIsAddingPost(false);
      toast({
        title: "Post created",
        description: "Your social media post has been created",
      });
      postForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update post mutation
  const updatePostMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest('PUT', `/api/social-posts/${id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update post');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-posts'] });
      setIsEditingPost(false);
      setSelectedPost(null);
      toast({
        title: "Post updated",
        description: "Your social media post has been updated",
      });
      postForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/social-posts/${id}`);
      if (!res.ok) throw new Error('Failed to delete post');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-posts'] });
      toast({
        title: "Post deleted",
        description: "The social media post has been deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Publish post mutation
  const publishPostMutation = useMutation({
    mutationFn: async ({ id, platforms }: { id: number; platforms: string[] }) => {
      const res = await apiRequest('POST', `/api/social-posts/${id}/publish`, { platforms });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to publish post');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-posts'] });
      setPublishDialogOpen(false);
      setPlatformsToPublish([]);
      toast({
        title: "Post published",
        description: data.message || "Your post has been published successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error publishing post",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Account form
  const accountForm = useForm<z.infer<typeof createAccountSchema>>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      platform: "",
      accountName: "",
      accountId: "",
    },
  });

  // Post form
  const postForm = useForm<z.infer<typeof createPostSchema>>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      content: "",
      mediaUrl: "",
      mediaType: "",
      scheduledFor: "",
    },
  });

  // Handle adding a new account
  const onSubmitAccount = (values: z.infer<typeof createAccountSchema>) => {
    addAccountMutation.mutate(values);
  };

  // Handle adding a new post
  const onSubmitPost = (values: z.infer<typeof createPostSchema>) => {
    if (isEditingPost && selectedPost) {
      updatePostMutation.mutate({
        id: selectedPost.id,
        data: values
      });
    } else {
      addPostMutation.mutate(values);
    }
  };

  // Setup post editing
  const handleEditPost = (post: SocialPost) => {
    setSelectedPost(post);
    setIsEditingPost(true);
    postForm.reset({
      content: post.content,
      mediaUrl: post.mediaUrl || "",
      mediaType: post.mediaType || "",
      scheduledFor: post.scheduledFor ? new Date(post.scheduledFor).toISOString().split('T')[0] : "",
    });
  };

  // Handle toggling a platform for publishing
  const togglePlatform = (platform: string) => {
    setPlatformsToPublish(current => 
      current.includes(platform)
        ? current.filter(p => p !== platform)
        : [...current, platform]
    );
  };

  // Initialize publish dialog
  const handlePublishClick = (post: SocialPost) => {
    setSelectedPost(post);
    setPlatformsToPublish([]);
    setPublishDialogOpen(true);
  };

  // Submit publish request
  const handlePublish = () => {
    if (selectedPost && platformsToPublish.length > 0) {
      publishPostMutation.mutate({
        id: selectedPost.id,
        platforms: platformsToPublish
      });
    } else {
      toast({
        title: "Selection required",
        description: "Please select at least one platform to publish to",
        variant: "destructive",
      });
    }
  };

  // Helper to get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return <Facebook className="h-5 w-5 text-blue-600" />;
      case 'instagram':
        return <Instagram className="h-5 w-5 text-pink-600" />;
      case 'twitter':
      case 'x':
        return <Twitter className="h-5 w-5 text-blue-400" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* AI Ad Campaign Feature Banner */}
      {!aiCampaignDismissed && (
        <div className="w-full p-4 mb-6 bg-gradient-to-r from-[#132642] to-[#080d17] rounded-lg border border-gold shadow-lg relative">
          <button
            onClick={dismissAiCampaign}
            aria-label="Dismiss banner"
            className="absolute top-3 right-3 p-1 rounded-md text-gold/50 hover:text-gold hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-col md:flex-row items-center justify-between pr-6">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold text-gold-light">AI-Powered Ad Campaign Manager</h3>
              <p className="text-sm text-offwhite mt-1">Create AI-generated ad content for multiple platforms</p>
            </div>
            <a href="/social-media-ads">
              <Button className="bg-gold hover:bg-gold-light text-black">
                <span className="mr-2">Launch Ad Campaign Tool</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" /></svg>
              </Button>
            </a>
          </div>
        </div>
      )}
      
      <Tabs defaultValue="posts" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm md:text-base">
          <TabsTrigger value="posts">
            <span className="hidden sm:inline">Content Creation</span>
            <span className="sm:hidden">Content</span>
          </TabsTrigger>
          <TabsTrigger value="preview">
            <span className="hidden sm:inline">Post Preview</span>
            <span className="sm:hidden">Preview</span>
          </TabsTrigger>
          <TabsTrigger value="accounts">
            <span className="hidden sm:inline">Account Setup</span>
            <span className="sm:hidden">Accounts</span>
          </TabsTrigger>
        </TabsList>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setIsAddingAccount(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>

          {accountsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : accountsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load social media accounts. Please try again later.
              </AlertDescription>
            </Alert>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-muted/50">
              <p className="text-muted-foreground">No social media accounts connected yet.</p>
              <Button variant="outline" onClick={() => setIsAddingAccount(true)} className="mt-4">
                Connect an Account
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {accounts.map((account: SocialMediaAccount) => (
                <Card key={account.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center space-x-2">
                      {getPlatformIcon(account.platform)}
                      <CardTitle className="text-lg font-medium">
                        {account.platform}
                      </CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => deleteAccountMutation.mutate(account.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Account Name:</strong> {account.accountName}</p>
                      <p><strong>Status:</strong> {account.connected ? 'Connected' : 'Disconnected'}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add Account Dialog */}
          <Dialog open={isAddingAccount} onOpenChange={setIsAddingAccount}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Social Media Account</DialogTitle>
                <DialogDescription>
                  Enter your social media account details below.
                </DialogDescription>
              </DialogHeader>
              <Form {...accountForm}>
                <form onSubmit={accountForm.handleSubmit(onSubmitAccount)} className="space-y-4">
                  <FormField
                    control={accountForm.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="facebook">Facebook</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="x">X (Twitter)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the social media platform
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={accountForm.control}
                    name="accountName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Apollo Drones" {...field} />
                        </FormControl>
                        <FormDescription>
                          The display name of your social media account
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={accountForm.control}
                    name="accountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. @apollodrones" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your username or account ID
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="submit" disabled={addAccountMutation.isPending}>
                      {addAccountMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Account
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div>
              <h3 className="text-lg font-medium">Content Creation</h3>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Create and schedule posts for your social media accounts.
              </p>
            </div>
            <Button onClick={() => setIsAddingPost(true)} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Draft
            </Button>
          </div>

          {postsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : postsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load social media posts. Please try again later.
              </AlertDescription>
            </Alert>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-muted/50">
              <p className="text-muted-foreground">No posts created yet.</p>
              <Button variant="outline" onClick={() => setIsAddingPost(true)} className="mt-4">
                Create Your First Post
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post: SocialPost) => (
                <Card key={post.id} className="hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-3 px-3 sm:px-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                          {post.published && (
                            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Published
                            </span>
                          )}
                          {post.scheduledFor && !post.published && (
                            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Scheduled
                            </span>
                          )}
                        </div>
                        {post.publishedTo && post.publishedTo.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {post.publishedTo.map((platform) => (
                              <span key={platform} title={platform} className="inline-flex">
                                {getPlatformIcon(platform)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEditPost(post)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {!post.published && (
                            <DropdownMenuItem onClick={() => handlePublishClick(post)}>
                              <Send className="mr-2 h-4 w-4" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deletePostMutation.mutate(post.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 py-3">
                    <p className="text-sm sm:text-base whitespace-pre-wrap break-words">{post.content}</p>
                    {post.mediaUrl && (
                      <div className="mt-3">
                        {post.mediaType === 'image' ? (
                          <div className="relative aspect-video rounded-md overflow-hidden bg-muted border">
                            <img 
                              src={post.mediaUrl} 
                              alt="Post media" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : post.mediaType === 'video' ? (
                          <div className="flex items-center text-xs sm:text-sm text-muted-foreground p-2 border rounded-md">
                            <Video className="mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{post.mediaUrl}</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-xs sm:text-sm text-muted-foreground p-2 border rounded-md">
                            <Link2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <a 
                              href={post.mediaUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="truncate hover:underline text-blue-600"
                            >
                              {post.mediaUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    {post.scheduledFor && !post.published && (
                      <div className="mt-3 flex items-center text-xs sm:text-sm text-muted-foreground p-2 border rounded-md bg-muted/30">
                        <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">
                          Scheduled for: {new Date(post.scheduledFor).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create Post Dialog */}
          <Dialog open={isAddingPost || isEditingPost} onOpenChange={(open) => {
            if (!open) {
              setIsAddingPost(false);
              setIsEditingPost(false);
              setSelectedPost(null);
              postForm.reset();
            }
          }}>
            <DialogContent className="max-w-[95%] sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>{isEditingPost ? "Edit Post" : "Create Post"}</DialogTitle>
                <DialogDescription>
                  {isEditingPost 
                    ? "Make changes to your social media post."
                    : "Create a new post to share on your social media accounts."
                  }
                </DialogDescription>
              </DialogHeader>
              <Form {...postForm}>
                <form onSubmit={postForm.handleSubmit(onSubmitPost)} className="space-y-4">
                  <FormField
                    control={postForm.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            value={field.value}
                            onChange={field.onChange}
                            className="min-h-[200px] resize-y"
                            placeholder="Write your post content here..."
                          />
                        </FormControl>
                        <FormDescription>
                          Write the content of your post
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField
                      control={postForm.control}
                      name="mediaUrl"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Image Upload (Optional)</FormLabel>
                          <div className="flex flex-col space-y-3">
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="Enter image URL or upload below"
                                {...field}
                                onChange={e => {
                                  field.onChange(e);
                                  if (e.target.value && e.target.value.startsWith('http')) {
                                    setImagePreview(e.target.value);
                                    postForm.setValue('mediaType', 'image');
                                  }
                                }}
                              />
                            </FormControl>
                            
                            {/* Image Upload Button */}
                            <div className="grid w-full gap-2">
                              <Input
                                id="image-upload"
                                type="file"
                                accept="image/*"
                                className="cursor-pointer"
                                onChange={(e) => {
                                  const file = e.target.files && e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                      const dataUrl = e.target?.result as string;
                                      field.onChange(dataUrl);
                                      setImagePreview(dataUrl);
                                      postForm.setValue('mediaType', 'image');
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </div>
                            
                            {/* Image Preview */}
                            {(field.value || imagePreview) && (
                              <div className="relative mt-2 rounded-md overflow-hidden border w-full h-40">
                                <img 
                                  src={field.value || imagePreview || ''}
                                  alt="Image preview" 
                                  className="w-full h-full object-cover"
                                  onError={() => setImagePreview(null)}
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
                                  onClick={() => {
                                    field.onChange('');
                                    setImagePreview(null);
                                    postForm.setValue('mediaType', 'none');
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <FormDescription>
                            Add an image to your post - upload directly or enter a URL
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={postForm.control}
                      name="mediaType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Media Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select media type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="link">Link</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Type of media being added
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={postForm.control}
                    name="scheduledFor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule Post (Optional)</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormDescription>
                          When to publish this post (leave empty for immediate publishing)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsAddingPost(false);
                        setIsEditingPost(false);
                        setSelectedPost(null);
                        postForm.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={addPostMutation.isPending || updatePostMutation.isPending}
                    >
                      {(addPostMutation.isPending || updatePostMutation.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isEditingPost ? "Update Post" : "Create Post"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Publish Dialog */}
          <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
            <DialogContent className="max-w-[95%] sm:max-w-[425px] p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>Publish Post</DialogTitle>
                <DialogDescription>
                  Select which platforms to publish this post to.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {accounts.length > 0 ? (
                  <div className="space-y-2">
                    {accounts.map((account: SocialMediaAccount) => (
                      <div key={account.id} className="flex items-center space-x-3 py-2">
                        <input
                          type="checkbox"
                          id={`platform-${account.id}`}
                          className="rounded text-primary focus:ring-primary w-4 h-4 sm:w-5 sm:h-5"
                          checked={platformsToPublish.includes(account.platform)}
                          onChange={() => togglePlatform(account.platform)}
                        />
                        <label
                          htmlFor={`platform-${account.id}`}
                          className="flex items-center text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-grow"
                        >
                          {getPlatformIcon(account.platform)}
                          <span className="ml-2">{account.accountName} ({account.platform})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">No social media accounts connected.</p>
                    <Button 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => {
                        setPublishDialogOpen(false);
                        setSelectedTab("accounts");
                        setIsAddingAccount(true);
                      }}
                    >
                      Connect an Account
                    </Button>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPublishDialogOpen(false);
                    setPlatformsToPublish([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={publishPostMutation.isPending || platformsToPublish.length === 0}
                >
                  {publishPostMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Publish Now
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <div className="flex flex-col items-start mb-4">
            <h3 className="text-lg font-medium">Post Preview</h3>
            <p className="text-sm text-muted-foreground">
              See how your posts will look on different social media platforms.
            </p>
            {posts.length === 0 ? (
              <div className="w-full text-center py-8 border rounded-lg bg-muted/50 mt-4">
                <p className="text-muted-foreground">Create a post first to see previews.</p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedTab("posts");
                    setIsAddingPost(true);
                  }} 
                  className="mt-4"
                >
                  Create Your First Post
                </Button>
              </div>
            ) : (
              <div className="w-full mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {/* Select a post for preview */}
                <div className="lg:col-span-1 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Select a Post</CardTitle>
                      <CardDescription>
                        Choose a post to preview
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Select onValueChange={(value) => {
                        const post = posts.find((p: SocialPost) => p.id === parseInt(value));
                        setSelectedPost(post || null);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a post" />
                        </SelectTrigger>
                        <SelectContent>
                          {posts.map((post: SocialPost) => (
                            <SelectItem key={post.id} value={post.id.toString()}>
                              {post.content.substring(0, 30)}...
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  {selectedPost && (
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleEditPost(selectedPost)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit This Post
                      </Button>
                      {!selectedPost.published && (
                        <Button 
                          className="w-full"
                          onClick={() => handlePublishClick(selectedPost)}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Publish Now
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Preview panes */}
                <div className="lg:col-span-2 space-y-4">
                  {!selectedPost ? (
                    <div className="text-center py-8 border rounded-lg bg-muted/50">
                      <p className="text-muted-foreground">Select a post to preview</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Content Consistency Checker */}
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            <CardTitle className="text-base">Cross-Platform Content Checker</CardTitle>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Platform-specific recommendations for optimizing your content
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Character Limit Warnings */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <h4 className="text-sm font-medium">Character Limits</h4>
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                  {selectedPost.content.length} characters
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <Twitter className="h-4 w-4 text-blue-400 mr-1.5" />
                                    <span className="text-xs">X (Twitter)</span>
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${selectedPost.content.length > 280 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                    {selectedPost.content.length > 280 ? `${selectedPost.content.length - 280} over limit` : 'Within limit'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <Facebook className="h-4 w-4 text-blue-600 mr-1.5" />
                                    <span className="text-xs">Facebook</span>
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${selectedPost.content.length > 63206 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                    {selectedPost.content.length > 63206 ? `${selectedPost.content.length - 63206} over limit` : 'Within limit'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <Instagram className="h-4 w-4 text-pink-600 mr-1.5" />
                                    <span className="text-xs">Instagram</span>
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${selectedPost.content.length > 2200 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                    {selectedPost.content.length > 2200 ? `${selectedPost.content.length - 2200} over limit` : 'Within limit'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Hashtag Checker */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Hashtag Analysis</h4>
                              <div className="space-y-1.5">
                                {(() => {
                                  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
                                  const hashtags = selectedPost.content.match(hashtagRegex) || [];
                                  const hashtagCount = hashtags.length;
                                  
                                  let instagramMessage = 'Good';
                                  let instagramClass = 'bg-green-100 text-green-800';
                                  if (hashtagCount === 0) {
                                    instagramMessage = 'Consider adding hashtags';
                                    instagramClass = 'bg-amber-100 text-amber-800';
                                  } else if (hashtagCount > 30) {
                                    instagramMessage = 'Too many (max 30)';
                                    instagramClass = 'bg-red-100 text-red-800';
                                  }
                                  
                                  let twitterMessage = 'Good';
                                  let twitterClass = 'bg-green-100 text-green-800';
                                  if (hashtagCount > 5) {
                                    twitterMessage = 'Consider fewer hashtags';
                                    twitterClass = 'bg-amber-100 text-amber-800';
                                  }
                                  
                                  return (
                                    <>
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium">Found {hashtagCount} hashtags</span>
                                        <div className="flex space-x-1">
                                          {hashtags.slice(0, 3).map((tag, i) => (
                                            <span key={i} className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                                              {tag}
                                            </span>
                                          ))}
                                          {hashtags.length > 3 && (
                                            <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                                              +{hashtags.length - 3} more
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                          <Instagram className="h-4 w-4 text-pink-600 mr-1.5" />
                                          <span className="text-xs">Instagram</span>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${instagramClass}`}>
                                          {instagramMessage}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                          <Twitter className="h-4 w-4 text-blue-400 mr-1.5" />
                                          <span className="text-xs">X (Twitter)</span>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${twitterClass}`}>
                                          {twitterMessage}
                                        </span>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Media Check */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Media Check</h4>
                              <div className="space-y-1.5">
                                {!selectedPost.mediaUrl || selectedPost.mediaType !== 'image' ? (
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs">No media attached</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                      Posts with media get more engagement
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs">Image attached</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                                      Great! Images increase engagement
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Interactive Previews */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                          {/* Facebook Preview */}
                          <Card className="hover:shadow-md transition-shadow h-full">
                            <CardHeader className="pb-2 px-3 sm:px-6">
                              <div className="flex items-center space-x-2">
                                <Facebook className="h-5 w-5 text-blue-600" />
                                <CardTitle className="text-base">Facebook</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="h-[350px] sm:h-[400px] overflow-auto">
                              <div className="border rounded-md p-3 sm:p-4 space-y-3 bg-white">
                                <div className="flex items-center space-x-2 sm:space-x-3">
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <img 
                                      src="/apollo-logo-small.png" 
                                      alt="Apollo DroneWorks"
                                      className="w-8 h-8 rounded-full"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = "https://via.placeholder.com/40";
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm">Apollo DroneWorks</p>
                                    <p className="text-xs text-gray-500">Just now · 🌎</p>
                                  </div>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{selectedPost.content}</p>
                                {selectedPost.mediaUrl && selectedPost.mediaType === 'image' && (
                                  <div className="rounded-md overflow-hidden border">
                                    <img 
                                      src={selectedPost.mediaUrl} 
                                      alt="Post content" 
                                      className="w-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = "https://via.placeholder.com/600x400?text=Image+Preview";
                                      }}
                                    />
                                  </div>
                                )}
                                <div className="flex justify-between text-gray-500 text-xs sm:text-sm pt-2 border-t">
                                  <span className="cursor-pointer hover:text-blue-500 transition-colors">👍 <span className="hidden xs:inline">Like</span></span>
                                  <span className="cursor-pointer hover:text-blue-500 transition-colors">💬 <span className="hidden xs:inline">Comment</span></span>
                                  <span className="cursor-pointer hover:text-blue-500 transition-colors">↗️ <span className="hidden xs:inline">Share</span></span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <div>
                          {/* Instagram Preview */}
                          <Card className="hover:shadow-md transition-shadow h-full">
                            <CardHeader className="pb-2 px-3 sm:px-6">
                              <div className="flex items-center space-x-2">
                                <Instagram className="h-5 w-5 text-pink-500" />
                                <CardTitle className="text-base">Instagram</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="h-[350px] sm:h-[400px] overflow-auto">
                              <div className="border rounded-md p-3 sm:p-4 space-y-3 bg-white">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                      <img 
                                        src="/apollo-logo-small.png" 
                                        alt="Apollo DroneWorks"
                                        className="w-7 h-7 rounded-full"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = "https://via.placeholder.com/40";
                                        }}
                                      />
                                    </div>
                                    <span className="font-semibold text-sm">apollo_droneworks</span>
                                  </div>
                                  <MoreHorizontal className="h-5 w-5 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors" />
                                </div>
                                
                                {selectedPost.mediaUrl && selectedPost.mediaType === 'image' ? (
                                  <div className="rounded-md overflow-hidden border">
                                    <img 
                                      src={selectedPost.mediaUrl} 
                                      alt="Post content" 
                                      className="w-full aspect-square object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = "https://via.placeholder.com/600x600?text=Instagram+Post";
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="rounded-md overflow-hidden border bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 aspect-square flex items-center justify-center p-8 text-white text-center font-medium">
                                    {selectedPost.content.substring(0, 80)}{selectedPost.content.length > 80 ? '...' : ''}
                                  </div>
                                )}
                                
                                <div className="flex space-x-3 sm:space-x-4 text-gray-500">
                                  <Heart className="h-4 w-4 sm:h-5 sm:w-5 cursor-pointer hover:text-pink-500 transition-colors" />
                                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 cursor-pointer hover:text-blue-500 transition-colors" />
                                  <Send className="h-4 w-4 sm:h-5 sm:w-5 cursor-pointer hover:text-blue-500 transition-colors" />
                                  <div className="flex-grow"></div>
                                  <Bookmark className="h-4 w-4 sm:h-5 sm:w-5 cursor-pointer hover:text-yellow-500 transition-colors" />
                                </div>
                                
                                <div>
                                  <p className="text-sm font-semibold">apollo_droneworks</p>
                                  <p className="text-sm whitespace-pre-wrap">{selectedPost.content}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        <div>
                          {/* Twitter/X Preview */}
                          <Card className="hover:shadow-md transition-shadow h-full">
                            <CardHeader className="pb-2 px-3 sm:px-6">
                              <div className="flex items-center space-x-2">
                                <Twitter className="h-5 w-5 text-blue-400" />
                                <CardTitle className="text-base">X (Twitter)</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="h-[350px] sm:h-[400px] overflow-auto">
                              <div className="border rounded-md p-3 sm:p-4 space-y-3 bg-white">
                                <div className="flex items-start space-x-2 sm:space-x-3">
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <img 
                                      src="/apollo-logo-small.png" 
                                      alt="Apollo DroneWorks"
                                      className="w-8 h-8 rounded-full"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = "https://via.placeholder.com/40";
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <div className="flex flex-col sm:flex-row sm:items-center">
                                      <p className="font-semibold text-sm">Apollo DroneWorks</p>
                                      <p className="text-xs text-gray-500 sm:ml-2">@ApolloDrones · Just now</p>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{selectedPost.content}</p>
                                    {selectedPost.mediaUrl && selectedPost.mediaType === 'image' && (
                                      <div className="mt-3 rounded-md overflow-hidden border">
                                        <img 
                                          src={selectedPost.mediaUrl} 
                                          alt="Post media"
                                          className="w-full" 
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = "https://via.placeholder.com/600x400?text=Tweet+Image";
                                          }}
                                        />
                                      </div>
                                    )}
                                    <div className="flex justify-between items-center pt-3 text-gray-500 text-[10px] sm:text-xs max-w-md">
                                      <div className="flex items-center space-x-1 cursor-pointer hover:text-blue-400 transition-colors">
                                        <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span>0</span>
                                      </div>
                                      <div className="flex items-center space-x-1 cursor-pointer hover:text-green-500 transition-colors">
                                        <Repeat2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span>0</span>
                                      </div>
                                      <div className="flex items-center space-x-1 cursor-pointer hover:text-red-500 transition-colors">
                                        <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span>0</span>
                                      </div>
                                      <div className="flex items-center space-x-1 cursor-pointer hover:text-blue-400 transition-colors">
                                        <BarChart className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span>0</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* End of interactive previews section */}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}