import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Booking, Service } from "@shared/schema";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Video, 
  Image as ImageIcon, 
  FileType,
  FileType as File3d,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface FileCount {
  images: number;
  videos: number;
  documents: number;
  models3d: number;
}

interface ProjectCardProps {
  booking: Booking & { service?: Service };
  isClient?: boolean;
  fileCount?: FileCount;
  onViewFiles?: (bookingId: number) => void;
}

export function ProjectCard({ booking, isClient = false, fileCount, onViewFiles }: ProjectCardProps) {
  const { toast } = useToast();
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  
  // Calculate project progress
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "scheduled":
        return { 
          label: "Scheduled", 
          progress: 10, 
          color: "bg-blue-500", 
          textColor: "text-blue-500",
          badgeColor: "border-blue-200 bg-blue-100 text-blue-800" 
        };
      case "in_progress":
        return { 
          label: "In Progress", 
          progress: 50, 
          color: "bg-amber-500", 
          textColor: "text-amber-500",
          badgeColor: "border-amber-200 bg-amber-100 text-amber-800" 
        };
      case "processing":
        return { 
          label: "Processing", 
          progress: 75, 
          color: "bg-purple-500", 
          textColor: "text-purple-500",
          badgeColor: "border-purple-200 bg-purple-100 text-purple-800" 
        };
      case "completed":
        return { 
          label: "Completed", 
          progress: 100, 
          color: "bg-green-500", 
          textColor: "text-green-500",
          badgeColor: "border-green-200 bg-green-100 text-green-800" 
        };
      case "cancelled":
        return { 
          label: "Cancelled", 
          progress: 0, 
          color: "bg-red-500", 
          textColor: "text-red-500",
          badgeColor: "border-red-200 bg-red-100 text-red-800" 
        };
      default:
        return { 
          label: "Unknown", 
          progress: 0, 
          color: "bg-gray-500", 
          textColor: "text-gray-500",
          badgeColor: "border-gray-200 bg-gray-100 text-gray-800" 
        };
    }
  };

  const statusInfo = getStatusInfo(booking.status);

  // Submit feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async (data: { bookingId: number; rating: number; feedback: string }) => {
      const res = await apiRequest("POST", "/api/bookings/feedback", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      });
      setFeedbackDialogOpen(false);
      setFeedback("");
      setRating(0);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to submit feedback: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle feedback submission
  const handleSubmitFeedback = () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please provide a rating before submitting feedback.",
        variant: "destructive",
      });
      return;
    }

    feedbackMutation.mutate({
      bookingId: booking.id,
      rating,
      feedback
    });
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMMM d, yyyy");
  };
  
  // Get total file count
  const getTotalFileCount = () => {
    if (!fileCount) return 0;
    return fileCount.images + fileCount.videos + fileCount.documents + fileCount.models3d;
  };

  return (
    <>
      <Card className="bg-black-light/70 border-gold-dark/30 shadow-md overflow-hidden h-full flex flex-col">
        <CardHeader className="pb-3 relative">
          <div className="flex justify-between items-center mb-1">
            <CardTitle className="text-lg font-semibold text-offwhite">
              {booking.service?.name || "Drone Service"}
            </CardTitle>
            <Badge className={`px-2 py-1 text-xs font-medium ${statusInfo.badgeColor}`}>
              {statusInfo.label}
            </Badge>
          </div>
          <CardDescription className="text-offwhite/70 text-sm">
            Booking #{booking.id} • {formatDate(booking.scheduledDate ?? booking.date)}
          </CardDescription>
          
          <div className="mt-2">
            <Progress value={statusInfo.progress} className="h-2 bg-black-light/40" indicatorClassName={statusInfo.color} />
          </div>
        </CardHeader>
        
        <CardContent className="py-2 space-y-3 text-sm flex-grow">
          {booking.location && (
            <div className="flex items-start">
              <MapPin className="h-4 w-4 mr-2 mt-0.5 text-offwhite/60" />
              <span className="text-offwhite/80">{booking.location}</span>
            </div>
          )}
          
          {booking.time && (
            <div className="flex items-start">
              <Clock className="h-4 w-4 mr-2 mt-0.5 text-offwhite/60" />
              <span className="text-offwhite/80">{booking.time}</span>
            </div>
          )}
          
          {booking.notes && (
            <div className="text-offwhite/80 border-t border-gold-dark/20 pt-3 mt-3">
              <p className="line-clamp-3">{booking.notes}</p>
            </div>
          )}
          
          {fileCount && getTotalFileCount() > 0 && (
            <div className="border-t border-gold-dark/20 pt-3 mt-3">
              <h4 className="text-offwhite font-medium mb-2">Available Files</h4>
              <div className="flex flex-wrap gap-2">
                {fileCount.images > 0 && (
                  <div className="flex items-center bg-black-light/40 rounded-full px-3 py-1">
                    <ImageIcon className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                    <span className="text-offwhite/80 text-xs">{fileCount.images} Images</span>
                  </div>
                )}
                {fileCount.videos > 0 && (
                  <div className="flex items-center bg-black-light/40 rounded-full px-3 py-1">
                    <Video className="h-3.5 w-3.5 mr-1.5 text-red-400" />
                    <span className="text-offwhite/80 text-xs">{fileCount.videos} Videos</span>
                  </div>
                )}
                {fileCount.documents > 0 && (
                  <div className="flex items-center bg-black-light/40 rounded-full px-3 py-1">
                    <FileType className="h-3.5 w-3.5 mr-1.5 text-yellow-400" />
                    <span className="text-offwhite/80 text-xs">{fileCount.documents} Docs</span>
                  </div>
                )}
                {fileCount.models3d > 0 && (
                  <div className="flex items-center bg-black-light/40 rounded-full px-3 py-1">
                    <File3d className="h-3.5 w-3.5 mr-1.5 text-green-400" />
                    <span className="text-offwhite/80 text-xs">{fileCount.models3d} 3D Models</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-0 pb-4 flex flex-wrap gap-2">
          {isClient && booking.status === "completed" && !booking.feedbackSubmitted && (
            <Button 
              variant="outline" 
              size="sm"
              className="border-gold-dark/30 text-offwhite hover:bg-[#0b111f]"
              onClick={() => setFeedbackDialogOpen(true)}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Leave Feedback
            </Button>
          )}
          
          {onViewFiles && (
            <Button 
              variant="outline" 
              size="sm"
              className="border-gold-dark/30 text-offwhite hover:bg-[#0b111f]"
              onClick={() => onViewFiles(booking.id)}
            >
              <FileType className="h-3.5 w-3.5 mr-1.5" />
              View Files
            </Button>
          )}
          
          {isClient && booking.status === "scheduled" && (
            <Button 
              variant="outline" 
              size="sm"
              className="border-gold-dark/30 text-red-400 hover:bg-[#0b111f] hover:text-red-500"
            >
              <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
              Request Reschedule
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-[#080d17] border-gold-dark/40">
          <DialogHeader>
            <DialogTitle className="text-offwhite">Project Feedback</DialogTitle>
            <DialogDescription>
              How was your experience with this drone service? Your feedback helps us improve.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-offwhite mb-2">
                Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="text-2xl focus:outline-none"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                  >
                    <span className={`${
                      star <= (hoveredRating || rating) 
                        ? "text-yellow-400" 
                        : "text-gray-400"
                    }`}>
                      ★
                    </span>
                  </button>
                ))}
                <span className="ml-2 text-sm text-offwhite/80">
                  {rating > 0 ? `${rating} out of 5 stars` : "Select rating"}
                </span>
              </div>
            </div>
            
            <div>
              <label htmlFor="feedback" className="block text-sm font-medium text-offwhite mb-2">
                Comments (Optional)
              </label>
              <textarea
                id="feedback"
                rows={4}
                className="w-full rounded-md border-gold-dark/40 bg-black-light text-offwhite p-3 text-sm"
                placeholder="Share your experience with this service..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFeedbackDialogOpen(false)}
              className="text-offwhite border-gold-dark/40 hover:bg-black-light/70"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={feedbackMutation.isPending || rating === 0}
              className="bg-gold text-black hover:bg-gold-light"
            >
              {feedbackMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Feedback"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}