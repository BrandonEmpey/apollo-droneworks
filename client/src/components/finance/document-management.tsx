import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Upload, File, FileText, Trash, MoreHorizontal, Download, Eye, Image, FileArchive, FilePlus, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Define document types
interface Document {
  id: number;
  name: string;
  type: string;
  category: string;
  size: number;
  date: string;
  tags: string[];
  relatedTo?: {
    type: string;
    id: number;
    name: string;
  } | null;
  fileUrl: string;
  thumbnailUrl?: string | null;
  summary?: string;
  downloadUrl?: string;
  status?: 'active' | 'archived' | 'pending';
  createdBy?: number;
  lastModified?: string;
}

const DocumentManagement = () => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewDocument, setViewDocument] = useState<Document | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFormData, setUploadFormData] = useState({
    name: "",
    category: "receipt",
    tags: "",
    relatedToType: "",
    relatedToId: "",
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch documents
  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/financial-documents", { search: searchQuery, category: selectedCategory }],
    // This is a temporary mock implementation until the backend API is connected
    queryFn: async () => {
      // In production, this would fetch from the actual API
      return [
        {
          id: 1,
          name: "Q1 Tax Report",
          type: "application/pdf",
          category: "tax",
          size: 2540000,
          date: "2025-03-15",
          tags: ["tax", "quarterly"],
          fileUrl: "/documents/tax-report-q1.pdf",
          thumbnailUrl: "/documents/thumbnails/tax-report-q1.jpg"
        },
        {
          id: 2,
          name: "Drone Equipment Invoice",
          type: "application/pdf",
          category: "invoice",
          size: 1240000,
          date: "2025-02-22",
          tags: ["equipment", "drone", "invoice"],
          fileUrl: "/documents/drone-invoice.pdf",
          thumbnailUrl: null
        },
        {
          id: 3,
          name: "Insurance Policy",
          type: "application/pdf",
          category: "contract",
          size: 4800000,
          date: "2025-01-10",
          tags: ["insurance", "legal", "annual"],
          fileUrl: "/documents/insurance-policy.pdf",
          thumbnailUrl: null
        },
        {
          id: 4,
          name: "Office Rent Receipt",
          type: "image/jpeg",
          category: "receipt",
          size: 780000,
          date: "2025-04-01",
          tags: ["rent", "office", "monthly"],
          fileUrl: "/documents/rent-receipt-april.jpg",
          thumbnailUrl: "/documents/thumbnails/rent-receipt-april.jpg"
        }
      ].filter(doc => {
        // Apply search filtering
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            doc.name.toLowerCase().includes(query) ||
            doc.category.toLowerCase().includes(query) ||
            doc.tags.some(tag => tag.toLowerCase().includes(query))
          );
        }
        return true;
      }).filter(doc => {
        // Apply category filtering
        if (selectedCategory && selectedCategory !== 'all') {
          return doc.category === selectedCategory;
        }
        return true;
      });
    }
  });
  
  // Document categories for filtering
  const categories = [
    { value: "receipt", label: "Receipts" },
    { value: "invoice", label: "Invoices" },
    { value: "tax", label: "Tax Documents" },
    { value: "contract", label: "Contracts" },
    { value: "report", label: "Reports" },
    { value: "other", label: "Other Documents" },
  ];
  
  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/financial-documents", formData, true);
      if (!response.ok) {
        throw new Error("Failed to upload document");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial-documents"] });
      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded successfully.",
      });
      setUploadDialogOpen(false);
      resetUploadForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/financial-documents/${id}`);
      if (!response.ok) {
        throw new Error("Failed to delete document");
      }
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial-documents"] });
      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadFormData({
      name: "",
      category: "receipt",
      tags: "",
      relatedToType: "",
      relatedToId: "",
    });
  };
  
  const handleUpload = () => {
    if (!uploadFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("name", uploadFormData.name || uploadFile.name);
    formData.append("category", uploadFormData.category);
    formData.append("tags", uploadFormData.tags);
    
    if (uploadFormData.relatedToType && uploadFormData.relatedToId) {
      formData.append("relatedToType", uploadFormData.relatedToType);
      formData.append("relatedToId", uploadFormData.relatedToId);
    }
    
    uploadMutation.mutate(formData);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      setUploadFormData({
        ...uploadFormData,
        name: file.name,
      });
    }
  };
  
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      deleteMutation.mutate(id);
    }
  };
  
  const getFileIcon = (document: Document) => {
    const type = document.type.toLowerCase();
    if (type.includes('image')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    } else if (type.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (type.includes('zip') || type.includes('archive')) {
      return <FileArchive className="h-5 w-5 text-amber-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Process and filter documents with type safety
  const safeDocuments: Document[] = Array.isArray(documents) ? documents : [];
  const filteredDocuments = safeDocuments.filter(doc => 
    doc && doc.id && doc.name && doc.category && doc.date && doc.size && doc.fileUrl);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Document Management</h2>
          <p className="text-muted-foreground">
            Store and organize financial documents, receipts, and invoices
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" /> Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload financial documents such as receipts, invoices, or tax forms.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="file">File</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                    />
                  </div>
                  {uploadFile && (
                    <p className="text-sm text-muted-foreground">
                      {uploadFile.name} ({formatFileSize(uploadFile.size)})
                    </p>
                  )}
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="name">Document Name</Label>
                  <Input
                    id="name"
                    value={uploadFormData.name}
                    onChange={(e) => setUploadFormData({
                      ...uploadFormData,
                      name: e.target.value
                    })}
                    placeholder="Enter document name"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={uploadFormData.category}
                    onValueChange={(value) => setUploadFormData({
                      ...uploadFormData,
                      category: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Categories</SelectLabel>
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    value={uploadFormData.tags}
                    onChange={(e) => setUploadFormData({
                      ...uploadFormData,
                      tags: e.target.value
                    })}
                    placeholder="e.g. office supplies, tax deductible"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label>Link to Transaction (Optional)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={uploadFormData.relatedToType}
                      onValueChange={(value) => setUploadFormData({
                        ...uploadFormData,
                        relatedToType: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="invoice">Invoice</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Input
                      placeholder="ID"
                      value={uploadFormData.relatedToId}
                      onChange={(e) => setUploadFormData({
                        ...uploadFormData,
                        relatedToId: e.target.value
                      })}
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUploadDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending || !uploadFile}
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-3/4">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={selectedCategory || ""}
              onValueChange={(value) => setSelectedCategory(value || null)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                {filteredDocuments.length} {filteredDocuments.length === 1 ? 'document' : 'documents'} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center space-x-4 p-2">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No documents found</h3>
                  <p className="text-muted-foreground mt-2 mb-6">
                    {searchQuery || selectedCategory
                      ? "Try adjusting your search or filter criteria"
                      : "Upload your first document to get started"}
                  </p>
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" /> Upload Document
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.map((document) => (
                        <TableRow key={document.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-accent rounded">
                                {getFileIcon(document)}
                              </div>
                              <div>
                                <div className="font-medium">{document.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {document.tags.join(', ')}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {document.category}
                            </span>
                          </TableCell>
                          <TableCell>
                            {format(new Date(document.date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            {formatFileSize(document.size)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem 
                                  onClick={() => setViewDocument(document)}
                                >
                                  <Eye className="mr-2 h-4 w-4" /> View
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="mr-2 h-4 w-4" /> Download
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDelete(document.id)}
                                >
                                  <Trash className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="w-full md:w-1/4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Usage</CardTitle>
              <CardDescription>
                Documents storage overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Used Storage</span>
                    <span>2.4 GB / 5 GB</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: '48%' }}></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Categories</h4>
                  {categories.slice(0, 4).map((category) => (
                    <div key={category.value} className="flex justify-between items-center text-sm">
                      <span className="flex items-center">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          category.value === 'receipt' ? 'bg-blue-500' :
                          category.value === 'invoice' ? 'bg-green-500' :
                          category.value === 'tax' ? 'bg-amber-500' :
                          'bg-purple-500'
                        }`}></span>
                        {category.label}
                      </span>
                      <span className="text-muted-foreground">
                        {category.value === 'receipt' ? '1.2 GB' :
                         category.value === 'invoice' ? '0.5 GB' :
                         category.value === 'tax' ? '0.4 GB' :
                         '0.3 GB'
                        }
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="pt-2">
                  <Button variant="outline" className="w-full" onClick={() => setUploadDialogOpen(true)}>
                    <FilePlus className="mr-2 h-4 w-4" /> Upload New Document
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start space-x-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-3 w-[120px]" />
                        </div>
                      </div>
                    ))}
                  </>
                ) : filteredDocuments.length > 0 ? (
                  <>
                    {filteredDocuments.slice(0, 3).map((doc: Document) => (
                      <div key={doc.id} className="flex items-start space-x-3">
                        <div className="p-2 bg-accent rounded">
                          {getFileIcon(doc)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded on {format(new Date(doc.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-2">
                    No recent activity
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Document Viewer Dialog */}
      {viewDocument && (
        <Dialog open={!!viewDocument} onOpenChange={(open) => !open && setViewDocument(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{viewDocument.name}</DialogTitle>
              <DialogDescription>
                Uploaded on {format(new Date(viewDocument.date), 'MMMM d, yyyy')}
                {viewDocument.lastModified && ` • Last modified on ${format(new Date(viewDocument.lastModified), 'MMMM d, yyyy')}`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-2 mb-4">
              <div className="overflow-hidden rounded-md border">
                {viewDocument.type.includes('image') ? (
                  <img 
                    src={viewDocument.thumbnailUrl || viewDocument.fileUrl} 
                    alt={viewDocument.name}
                    className="w-full object-cover"
                    onError={(e) => {
                      // Fallback to fileUrl if thumbnailUrl fails
                      const target = e.target as HTMLImageElement;
                      if (target.src !== viewDocument.fileUrl) {
                        target.src = viewDocument.fileUrl;
                      } else {
                        // If fileUrl also fails, show a placeholder background
                        target.style.display = 'none';
                        target.parentElement!.style.backgroundColor = '#f0f0f0';
                        target.parentElement!.style.minHeight = '200px';
                      }
                    }}
                  />
                ) : viewDocument.type.includes('pdf') ? (
                  <div className="bg-muted p-12 flex flex-col items-center justify-center">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-center text-muted-foreground">
                      PDF preview not available
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted p-12 flex flex-col items-center justify-center">
                    <File className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-center text-muted-foreground">
                      Preview not available for this file type
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Category</h4>
                <p className="text-sm text-muted-foreground">{viewDocument.category}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Size</h4>
                <p className="text-sm text-muted-foreground">{formatFileSize(viewDocument.size)}</p>
              </div>
              
              {viewDocument.status && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Status</h4>
                  <p className="text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      viewDocument.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : viewDocument.status === 'archived'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {viewDocument.status.charAt(0).toUpperCase() + viewDocument.status.slice(1)}
                    </span>
                  </p>
                </div>
              )}
              
              {viewDocument.tags && viewDocument.tags.length > 0 && (
                <div className="col-span-2">
                  <h4 className="text-sm font-medium mb-1">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {viewDocument.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-accent"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {viewDocument.summary && (
                <div className="col-span-2">
                  <h4 className="text-sm font-medium mb-1">Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    {viewDocument.summary}
                  </p>
                </div>
              )}
              
              {viewDocument.relatedTo && (
                <div className="col-span-2">
                  <h4 className="text-sm font-medium mb-1">Related to</h4>
                  <p className="text-sm text-muted-foreground">
                    {viewDocument.relatedTo.type}: {viewDocument.relatedTo.name}
                  </p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline"
                onClick={() => {
                  if (viewDocument.downloadUrl) {
                    window.open(viewDocument.downloadUrl, '_blank');
                  } else {
                    window.open(viewDocument.fileUrl, '_blank');
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DocumentManagement;