import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Form schema
const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export function ContactForm() {
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);

  const getInitialMessage = () => {
    const params = new URLSearchParams(window.location.search);
    const packageName = params.get("package");
    const price = params.get("price");
    const category = params.get("category");
    
    if (packageName) {
      let message = `I'm interested in the "${packageName}" package`;
      if (price) {
        message += ` (${price})`;
      }
      if (category) {
        message += ` from your ${category} services`;
      }
      message += ".\n\nPlease provide more information about this service and availability.";
      return message;
    }
    return "";
  };

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: getInitialMessage(),
    },
  });

  // Create mutation for contact form submission
  const contactMutation = useMutation({
    mutationFn: async (formData: ContactFormValues) => {
      const response = await apiRequest("POST", "/api/contact", formData);
      return await response.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
      
      toast({
        title: "Message Sent",
        description: "Thank you for your message. We'll get back to you soon!",
      });
      
      // Reset form after 2 seconds to show success state
      setTimeout(() => {
        form.reset();
        setIsSuccess(false);
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = async (values: ContactFormValues) => {
    contactMutation.mutate(values);
  };

  return (
    <Card className="bg-[#132642] border-gold-dark/30 max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-offwhite">Contact Us</CardTitle>
        <CardDescription>
          Have questions about our drone services? Send us a message and we'll get back to you as soon as possible.
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-offwhite">Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="your.email@example.com" 
                        className="bg-[#080d17] border-gold-dark/30 text-offwhite" 
                        type="email"
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-offwhite">Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Your phone number" 
                      className="bg-[#080d17] border-gold-dark/30 text-offwhite" 
                      type="tel"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-offwhite">Message</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell us how we can help you..." 
                      className="bg-[#080d17] border-gold-dark/30 text-offwhite min-h-[120px]" 
                      {...field} 
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
                disabled={contactMutation.isPending || isSuccess}
              >
                {contactMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Sent!
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}