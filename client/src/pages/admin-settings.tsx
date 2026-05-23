import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2, Calendar, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ExpiredFile {
  id: number;
  name: string;
  description?: string;
  fileType: string;
  size: number;
  uploadedAt: string;
  expiresAtDate: string;
  projectId?: number;
  clientId: number;
  keywords?: string[];
}

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingFileId, setDeletingFileId] = useState<number | null>(null);
  const [extendingFileId, setExtendingFileId] = useState<number | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState("");

  // Fetch expired files
  const { data: expiredFiles, isLoading } = useQuery({
    queryKey: ["/api/admin/expired-files"],
    queryFn: async () => {
      const response = await fetch("/api/admin/expired-files");
      if (!response.ok) {
        throw new Error("Failed to fetch expired files");
      }
      return response.json();
    }
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/files/${fileId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete file");
      }
      return fileId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/expired-files"] });
      toast({
        title: "File deleted",
        description: "The expired file has been permanently removed",
      });
      setDeletingFileId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete file",
        description: error.message,
        variant: "destructive",
      });
      setDeletingFileId(null);
    }
  });

  // Extend expiration mutation
  const extendExpirationMutation = useMutation({
    mutationFn: async ({ fileId, newDate }: { fileId: number; newDate: string }) => {
      const response = await apiRequest("PUT", `/api/admin/files/${fileId}/extend`, {
        expiresAtDate: newDate
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to extend file expiration");
      }
      return { fileId, newDate };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/expired-files"] });
      toast({
        title: "Expiration extended",
        description: "File expiration date has been updated",
      });
      setExtendingFileId(null);
      setNewExpirationDate("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to extend expiration",
        description: error.message,
        variant: "destructive",
      });
      setExtendingFileId(null);
    }
  });

  const handleDeleteFile = (fileId: number) => {
    setDeletingFileId(fileId);
    deleteFileMutation.mutate(fileId);
  };

  const handleExtendExpiration = (fileId: number) => {
    if (!newExpirationDate) {
      toast({
        title: "Date required",
        description: "Please select a new expiration date",
        variant: "destructive",
      });
      return;
    }
    
    setExtendingFileId(fileId);
    extendExpirationMutation.mutate({ fileId, newDate: newExpirationDate });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0f1c] to-[#1a1f2e] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1c] to-[#1a1f2e] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-offwhite mb-2">Admin Settings</h1>
          <p className="text-offwhite/70">Manage expired files and system settings</p>
        </div>

        <Card className="bg-[#132642] border-gold-dark/30">
          <CardHeader>
            <CardTitle className="text-xl text-offwhite flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Expired Files Management
            </CardTitle>
            <p className="text-offwhite/70">
              Files that have passed their expiration date. Review and decide whether to delete or extend their lifecycle.
            </p>
          </CardHeader>
          <CardContent>
            {!expiredFiles || expiredFiles.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gold/50" />
                <h3 className="text-lg font-medium text-offwhite mb-2">No Expired Files</h3>
                <p className="text-offwhite/60">All files are within their expiration period.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {expiredFiles.map((file: ExpiredFile) => {
                  const daysExpired = Math.floor((new Date().getTime() - new Date(file.expiresAtDate).getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <Card key={file.id} className="bg-[#080d17] border-red-900/30">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-offwhite">{file.name}</h4>
                              <Badge variant="destructive" className="text-xs">
                                Expired {daysExpired} day{daysExpired !== 1 ? 's' : ''} ago
                              </Badge>
                            </div>
                            
                            {file.description && (
                              <p className="text-sm text-offwhite/70 mb-2 line-clamp-2">{file.description}</p>
                            )}
                            
                            <div className="flex flex-wrap gap-4 text-xs text-offwhite/60">
                              <span><strong>Type:</strong> {file.fileType}</span>
                              <span><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</span>
                              <span><strong>Expired:</strong> {format(new Date(file.expiresAtDate), "MMM d, yyyy")}</span>
                              <span><strong>Uploaded:</strong> {format(new Date(file.uploadedAt), "MMM d, yyyy")}</span>
                            </div>
                            
                            {file.keywords && file.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {file.keywords.map((keyword, index) => (
                                  <Badge key={index} variant="outline" className="text-xs border-gold-dark/30 text-offwhite">
                                    {keyword}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-4">
                            <div className="flex items-center gap-2">
                              <Input
                                type="date"
                                value={extendingFileId === file.id ? newExpirationDate : ""}
                                onChange={(e) => {
                                  if (extendingFileId === file.id) {
                                    setNewExpirationDate(e.target.value);
                                  } else {
                                    setExtendingFileId(file.id);
                                    setNewExpirationDate(e.target.value);
                                  }
                                }}
                                className="w-40 bg-[#1d1d1d] border-gold-dark/30 text-offwhite text-xs"
                                min={new Date().toISOString().split('T')[0]}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExtendExpiration(file.id)}
                                disabled={extendingFileId === file.id && extendExpirationMutation.isPending}
                                className="bg-[#1d1d1d] text-offwhite border-gold-dark/30 hover:border-gold hover:bg-[#1d1d1d]/80"
                              >
                                {extendingFileId === file.id && extendExpirationMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Calendar className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={deletingFileId === file.id}
                                  className="w-full"
                                >
                                  {deletingFileId === file.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-[#0b111f] border-gold-dark/30">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-offwhite flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                    Delete Expired File
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-offwhite/70">
                                    Are you sure you want to permanently delete "{file.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-[#1d1d1d] text-offwhite border-gold-dark/30 hover:bg-[#1d1d1d]/80 hover:text-offwhite hover:border-gold">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 text-white hover:bg-red-700"
                                    onClick={() => handleDeleteFile(file.id)}
                                  >
                                    Delete File
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}