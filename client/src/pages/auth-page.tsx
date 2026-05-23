import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Helmet } from "react-helmet-async";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth, loginSchema, registerSchema } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AuthInput } from "@/components/ui/auth-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [location, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  
  // Get the redirect parameter from the URL if it exists
  const [, params] = useRoute("/auth");
  const searchParams = new URLSearchParams(window.location.search);
  const redirectPath = searchParams.get("redirect") || "/";

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate(redirectPath);
    }
  }, [user, navigate, redirectPath]);

  // Login form setup
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  // Register form setup
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      phone: ""
    }
  });

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(values);
  };

  return (
    <>
      <Helmet>
        <title>Sign In | Apollo DroneWorks</title>
        <meta name="description" content="Sign in to your Apollo DroneWorks account to manage your drone service bookings and view your custom galleries." />
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        
        <main className="flex-grow flex items-center justify-center py-16 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl bg-black shadow-xl rounded-lg overflow-hidden">
            {/* Left column: Auth forms */}
            <div className="p-8">
              <h1 className="text-3xl font-bold font-montserrat gold-text mb-6">Account Access</h1>
              <p className="text-sm text-gray-300 mb-4">
                <strong>Note:</strong> Looking for client portal access? <Button variant="link" className="text-gold-light p-0" onClick={() => navigate("/register")}>Register here</Button> instead.
              </p>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-2 mb-8">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="register">Create Account</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-offwhite">Username</FormLabel>
                            <FormControl>
                              <AuthInput placeholder="Enter your username" {...field} className="border-offwhite/20" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-offwhite">Password</FormLabel>
                            <FormControl>
                              <AuthInput type="password" placeholder="Enter your password" {...field} className="border-offwhite/20" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-gold text-black hover:bg-gold-light border border-gold"
                        disabled={loginMutation.isPending}
                        style={{ backgroundColor: "#C7AE6A", color: "#000000" }}
                      >
                        {loginMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Sign In
                      </Button>
                    </form>
                  </Form>
                  
                  <div className="mt-4 space-y-1">
                    <Button 
                      variant="link" 
                      className="text-gold-light p-0"
                      onClick={() => setActiveTab("register")}
                    >
                      Don't have an account? Sign up
                    </Button>
                    <div>
                      <Button 
                        variant="link" 
                        className="text-gold-light p-0"
                        onClick={() => navigate("/register")}
                      >
                        Create a client portal account
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-offwhite">First Name</FormLabel>
                              <FormControl>
                                <AuthInput placeholder="Enter your first name" {...field} className="border-offwhite/20" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-offwhite">Last Name</FormLabel>
                              <FormControl>
                                <AuthInput placeholder="Enter your last name" {...field} className="border-offwhite/20" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-offwhite">Username</FormLabel>
                            <FormControl>
                              <AuthInput placeholder="Choose a username" {...field} className="border-offwhite/20" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-offwhite">Email</FormLabel>
                            <FormControl>
                              <AuthInput type="email" placeholder="Enter your email" {...field} className="border-offwhite/20" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-offwhite">Phone Number</FormLabel>
                            <FormControl>
                              <AuthInput placeholder="Enter your phone number" {...field} className="border-offwhite/20" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-offwhite">Password</FormLabel>
                            <FormControl>
                              <AuthInput type="password" placeholder="Create a password" {...field} className="border-offwhite/20" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-offwhite">Confirm Password</FormLabel>
                            <FormControl>
                              <AuthInput type="password" placeholder="Confirm your password" {...field} className="border-offwhite/20" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-gold text-black hover:bg-gold-light border border-gold"
                        disabled={registerMutation.isPending}
                        style={{ backgroundColor: "#C7AE6A", color: "#000000" }}
                      >
                        {registerMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Create Account
                      </Button>
                    </form>
                  </Form>
                  
                  <div className="mt-4 space-y-1">
                    <Button 
                      variant="link" 
                      className="text-gold-light p-0"
                      onClick={() => setActiveTab("login")}
                    >
                      Already have an account? Sign in
                    </Button>
                    <div>
                      <Button 
                        variant="link" 
                        className="text-gold-light p-0"
                        onClick={() => navigate("/register")}
                      >
                        Create a client portal account
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Right column: Hero image and info */}
            <div className="hidden md:block relative">
              <div className="absolute inset-0 bg-gradient-to-r from-black to-transparent z-10"></div>
              <img
                src="/uploads/about/aerial-southern-utah.png"
                alt="Aerial drone-view of Southern Utah red rock landscape"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center z-20 p-8">
                <div>
                  <h2 className="text-3xl font-bold font-montserrat gold-text mb-4">
                    Elevate Your Experience
                  </h2>
                  <p className="text-offwhite mb-6">
                    Join Apollo DroneWorks to access your personalized dashboard, manage bookings, 
                    and view your custom galleries of drone photography and videography.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center mr-3">
                        <span className="text-gold-light">✓</span>
                      </div>
                      <p className="text-offwhite">Track your project status in real-time</p>
                    </div>
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center mr-3">
                        <span className="text-gold-light">✓</span>
                      </div>
                      <p className="text-offwhite">Access and download high-quality deliverables</p>
                    </div>
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center mr-3">
                        <span className="text-gold-light">✓</span>
                      </div>
                      <p className="text-offwhite">Book new services with just a few clicks</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
