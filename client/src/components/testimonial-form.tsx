import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, CheckCircle2 } from "lucide-react";
import { Testimonial } from "@shared/schema";

// Form schema
const testimonialFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  company: z.string().optional(),
  content: z.string().min(10, "Testimonial must be at least 10 characters"),
  rating: z.number().min(1).max(5),
  captcha: z.number().min(1, "Please solve the captcha"),
  // isApproved is handled on the server side
});

type TestimonialFormValues = z.infer<typeof testimonialFormSchema>;

export function TestimonialForm() {
  const { toast } = useToast();
  const [selectedRating, setSelectedRating] = useState(5);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Simple math captcha
  const [captchaA] = useState(() => Math.floor(Math.random() * 10) + 1);
  const [captchaB] = useState(() => Math.floor(Math.random() * 10) + 1);
  const captchaAnswer = captchaA + captchaB;

  const form = useForm<TestimonialFormValues>({
    resolver: zodResolver(testimonialFormSchema),
    defaultValues: {
      name: "",
      company: "",
      content: "",
      rating: 5,
      captcha: 0,
    },
  });

  // Create testimonial mutation
  const createTestimonialMutation = useMutation({
    mutationFn: async (data: TestimonialFormValues) => {
      const response = await apiRequest("POST", "/api/testimonials", data);
      return await response.json() as Testimonial;
    },
    onSuccess: () => {
      toast({
        title: "Testimonial Submitted",
        description: "Thank you for your feedback! Your testimonial will be reviewed before publishing.",
      });
      setIsSuccess(true);
      
      // Reset form after 2 seconds to show success state
      setTimeout(() => {
        form.reset({
          name: "",
          company: "",
          content: "",
          rating: 5,
          captcha: 0,
        });
        setSelectedRating(5);
        setIsSuccess(false);
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error submitting your testimonial. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: TestimonialFormValues) => {
    // Verify captcha
    if (values.captcha !== captchaAnswer) {
      toast({
        title: "Captcha Error",
        description: "Please solve the math problem correctly.",
        variant: "destructive",
      });
      return;
    }
    
    createTestimonialMutation.mutate({
      ...values,
      rating: selectedRating
    });
  };

  // Render stars for rating input with outlined transparent design
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          fill={i <= selectedRating ? "currentColor" : "transparent"}
          stroke="currentColor"
          strokeWidth={1.5}
          className={`h-6 w-6 cursor-pointer transition-all ${
            i <= selectedRating ? "text-gold" : "text-gold/30"
          }`}
          onClick={() => {
            setSelectedRating(i);
            form.setValue("rating", i);
          }}
        />
      );
    }
    return stars;
  };

  return (
    <Card className="bg-[#132642] border-gold-dark/30 max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-offwhite">Share Your Experience</CardTitle>
        <CardDescription>
          We value your feedback! Please share your experience working with Apollo DroneWorks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-offwhite">Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Your name" 
                        className="bg-[#080d17] border-gold-dark/30 text-offwhite" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-offwhite">Company (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Your company name" 
                        className="bg-[#080d17] border-gold-dark/30 text-offwhite" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            
            <FormField
              control={form.control}
              name="rating"
              render={() => (
                <FormItem>
                  <FormLabel className="text-offwhite">Your Rating</FormLabel>
                  <div className="flex space-x-2 mt-2">
                    {renderStars()}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-offwhite">Your Testimonial</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Share your experience with our drone services..." 
                      className="bg-[#080d17] border-gold-dark/30 text-offwhite min-h-[120px] placeholder:text-offwhite/50" 
                      style={{ color: '#FFFFFF' }}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="captcha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-offwhite">
                    Security Check: What is {captchaA} + {captchaB}?
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      placeholder="Enter the answer" 
                      className="bg-[#080d17] border-gold-dark/30 text-offwhite" 
                      {...field} 
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end pt-4">
              <Button 
                type="submit"
                variant="gold"
                disabled={createTestimonialMutation.isPending || isSuccess}
              >
                {createTestimonialMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Submitted!
                  </>
                ) : (
                  "Submit Testimonial"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}