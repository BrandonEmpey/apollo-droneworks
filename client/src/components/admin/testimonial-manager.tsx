import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Testimonial } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Trash2, Loader2, Star, Calendar, Building2 } from "lucide-react";
import { format } from "date-fns";

interface TestimonialManagerProps {
  testimonials: Testimonial[];
}

export function TestimonialManager({ testimonials }: TestimonialManagerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState<Testimonial | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending">("all");
  
  // Testimonial Mutations
  const approveTestimonialMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/testimonials/${id}`, {
        isApproved: true
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials"] });
      toast({
        title: "Testimonial Approved",
        description: "The testimonial has been successfully approved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to approve testimonial: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const rejectTestimonialMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/testimonials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials"] });
      toast({
        title: "Testimonial Rejected",
        description: "The testimonial has been removed.",
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to reject testimonial: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Open confirmation dialog for deleting testimonial
  const openDeleteDialog = (testimonial: Testimonial) => {
    setCurrentTestimonial(testimonial);
    setIsDialogOpen(true);
  };

  // Filter testimonials by approval status
  const filteredTestimonials = 
    statusFilter === "all" ? testimonials :
    statusFilter === "approved" ? testimonials.filter(t => t.isApproved) :
    testimonials.filter(t => !t.isApproved);
  
  // Generate star rating display
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star 
          key={i} 
          className={`h-4 w-4 ${i < rating ? "text-amber-400 fill-amber-400" : "text-gray-400"}`} 
        />
      );
    }
    return <div className="flex space-x-0.5">{stars}</div>;
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-offwhite">Manage Testimonials</h2>
        <div className="flex space-x-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            className={statusFilter === "all" ? "bg-gold text-black" : "border-gold-dark/30 text-offwhite"}
          >
            All
          </Button>
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("pending")}
            className={statusFilter === "pending" ? "bg-gold text-black" : "border-gold-dark/30 text-offwhite"}
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === "approved" ? "default" : "outline"}
            onClick={() => setStatusFilter("approved")}
            className={statusFilter === "approved" ? "bg-gold text-black" : "border-gold-dark/30 text-offwhite"}
          >
            Approved
          </Button>
        </div>
      </div>
      
      {filteredTestimonials.length === 0 ? (
        <Card className="bg-[#132642] border-gold-dark/30">
          <CardContent className="pt-6">
            <p className="text-center text-offwhite">
              {statusFilter === "all" 
                ? "No testimonials found."
                : statusFilter === "approved"
                  ? "No approved testimonials found."
                  : "No pending testimonials for review."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table className="border border-gold-dark/30 rounded-md overflow-hidden">
            <TableHeader className="bg-[#080d17]">
              <TableRow>
                <TableHead className="text-offwhite">Client</TableHead>
                <TableHead className="text-offwhite">Rating</TableHead>
                <TableHead className="text-offwhite">Testimonial</TableHead>
                <TableHead className="text-offwhite">Date</TableHead>
                <TableHead className="text-offwhite text-center">Status</TableHead>
                <TableHead className="text-offwhite text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTestimonials.map((testimonial) => (
                <TableRow 
                  key={testimonial.id}
                  className="bg-[#132642] border-b border-gold-dark/10 hover:bg-[#1c304d]"
                >
                  <TableCell className="font-medium text-offwhite">
                    <div>
                      <div className="font-medium">{testimonial.name}</div>
                      {testimonial.company && (
                        <div className="text-xs text-offwhite/70 flex items-center mt-1">
                          <Building2 className="h-3 w-3 mr-1" />
                          {testimonial.company}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {renderStars(testimonial.rating)}
                  </TableCell>
                  <TableCell className="text-offwhite/80 max-w-md">
                    {testimonial.content.length > 100
                      ? `${testimonial.content.substring(0, 100)}...`
                      : testimonial.content}
                  </TableCell>
                  <TableCell className="text-offwhite/70 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1.5 text-offwhite/60" />
                      {format(new Date(testimonial.createdAt), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {testimonial.isApproved ? (
                      <Badge className="bg-green-600">Approved</Badge>
                    ) : (
                      <Badge className="bg-yellow-600">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      {!testimonial.isApproved && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => approveTestimonialMutation.mutate(testimonial.id)}
                          className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-transparent"
                          disabled={approveTestimonialMutation.isPending}
                        >
                          {approveTestimonialMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(testimonial)}
                        className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-transparent"
                      >
                        {testimonial.isApproved ? (
                          <Trash2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
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
        <DialogContent className="bg-[#0b111f] border-gold-dark/30 text-offwhite">
          <DialogHeader>
            <DialogTitle className="text-xl text-gold">
              {currentTestimonial?.isApproved ? "Delete Testimonial" : "Reject Testimonial"}
            </DialogTitle>
            <DialogDescription>
              {currentTestimonial?.isApproved 
                ? "Are you sure you want to delete this approved testimonial? This action cannot be undone."
                : "Are you sure you want to reject this testimonial? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          
          {currentTestimonial && (
            <div className="py-4">
              <div className="bg-[#080d17] p-4 rounded-md">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-offwhite">{currentTestimonial.name}</p>
                    {currentTestimonial.company && (
                      <p className="text-sm text-offwhite/70">{currentTestimonial.company}</p>
                    )}
                  </div>
                  <div>{renderStars(currentTestimonial.rating)}</div>
                </div>
                <p className="text-offwhite/80 text-sm mt-2">{currentTestimonial.content}</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-gold-dark/30 text-offwhite hover:bg-[#132642]"
            >
              Cancel
            </Button>
            <Button 
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={rejectTestimonialMutation.isPending}
              onClick={() => currentTestimonial && rejectTestimonialMutation.mutate(currentTestimonial.id)}
            >
              {rejectTestimonialMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {currentTestimonial?.isApproved ? "Delete Testimonial" : "Reject Testimonial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}