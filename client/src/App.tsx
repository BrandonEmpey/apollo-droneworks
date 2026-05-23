import { useState, useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { HelmetProvider } from "react-helmet-async";
import { initializeColorShift } from "@/lib/colorShift";
import { ThemeProvider } from "@/contexts/theme-context";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ClientDashboard from "@/pages/client-dashboard";
import ClientRegistrationPage from "@/pages/client-registration-page";
import BookingPage from "@/pages/booking-page";
import CheckoutPage from "@/pages/checkout-page";
import GalleryPage from "@/pages/gallery-page";
import BlogPage from "@/pages/blog-page";
import BlogPostPage from "@/pages/blog-post-page";
import ServicePage from "@/pages/service-page-fixed";
import ServicesPage from "@/pages/services-page";
import ContactPage from "@/pages/contact-page";
import TestimonialsPage from "@/pages/testimonials-page";
import AboutPage from "@/pages/about-page";
import SocialMediaPage from "@/pages/social-media-page";
import SocialMediaAdPage from "@/pages/social-media-ad-page";
import FinancePage from "@/pages/finance-page";
import ServiceAnalytics from "@/pages/service-analytics";

import AnalyticsPage from "@/pages/analytics-page";
import ThemeEditor from "@/pages/theme-editor";
import AdminOverview from "@/pages/admin/admin-overview";
import AdminAnalytics from "@/pages/admin/analytics";
import ContentManagement from "@/pages/admin/content-management";
import ClientOperations from "@/pages/admin/client-operations";
import MarketingHub from "@/pages/admin/marketing-hub";
import SystemSettings from "@/pages/admin/system-settings";
import AdminThemeEditor from "@/pages/admin/theme-editor";
import ServicesManagement from "@/pages/admin/services-management";
import AddonsManagement from "@/pages/admin/addons-management";
import PricingOptimizationNew from "@/pages/admin/pricing-optimization-new";
import ReferralManagement from "@/pages/admin/referral-management";
import SatisfactionSurveys from "@/pages/admin/satisfaction-surveys";
import OperationalEfficiency from "@/pages/admin/operational-efficiency";
import CustomerExperience from "@/pages/admin/customer-experience";
import WorkflowManagement from "@/pages/admin/workflow-management";
import TrustAdministration from "@/pages/admin/trust-administration";
import IndustryTilesManagement from "@/pages/admin/industry-tiles-management";
import CustomerDetail from "@/pages/admin/customer-detail";
import QuoteBuilder from "@/pages/quote-builder";
import IndustryPage from "@/pages/industry-page";
import ExternalLinkPage from "@/pages/external-link";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={ClientRegistrationPage} />
      <Route path="/services" component={ServicesPage} />
      <Route path="/services/:id" component={ServicePage} />
      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/:id" component={BlogPostPage} />
      <Route path="/gallery" component={GalleryPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/testimonials" component={TestimonialsPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/category/:slug" component={IndustryPage} />
      <ProtectedRoute path="/external-link" component={ExternalLinkPage} />
      <ProtectedRoute path="/booking" component={BookingPage} />
      <ProtectedRoute path="/checkout/:bookingId" component={CheckoutPage} />
      <ProtectedRoute path="/dashboard" component={ClientDashboard} />
      <ProtectedRoute path="/client" component={ClientDashboard} />
      <Route path="/client-dashboard">
        {() => <Redirect to="/dashboard" />}
      </Route>
      <ProtectedRoute path="/admin" component={AdminOverview} adminOnly={true} />
      <ProtectedRoute path="/admin/analytics" component={AdminAnalytics} adminOnly={true} />
      <ProtectedRoute path="/admin/content" component={ContentManagement} adminOnly={true} />
      <ProtectedRoute path="/admin/clients" component={ClientOperations} adminOnly={true} />
      <ProtectedRoute path="/admin/finance" component={FinancePage} adminOnly={true} />
      <ProtectedRoute path="/admin/marketing" component={MarketingHub} adminOnly={true} />
      <ProtectedRoute path="/admin/settings" component={SystemSettings} adminOnly={true} />
      <ProtectedRoute path="/admin/services" component={ServicesManagement} adminOnly={true} />
      <ProtectedRoute path="/admin/addons" component={AddonsManagement} adminOnly={true} />
      <ProtectedRoute path="/admin/pricing" component={PricingOptimizationNew} adminOnly={true} />
      <ProtectedRoute path="/admin/referral-management" component={ReferralManagement} adminOnly={true} />
      <ProtectedRoute path="/admin/satisfaction-surveys" component={SatisfactionSurveys} adminOnly={true} />
      <ProtectedRoute path="/admin/operational-efficiency" component={OperationalEfficiency} adminOnly={true} />
      <ProtectedRoute path="/admin/customer-experience" component={CustomerExperience} adminOnly={true} />
      <ProtectedRoute path="/admin/workflows" component={WorkflowManagement} adminOnly={true} />
      <ProtectedRoute path="/admin/trust-administration" component={TrustAdministration} adminOnly={true} />
      <ProtectedRoute path="/admin/industry-tiles" component={IndustryTilesManagement} adminOnly={true} />
      <ProtectedRoute path="/admin/projects" component={ClientOperations} adminOnly={true} />
      <ProtectedRoute path="/admin/bookings" component={ClientOperations} adminOnly={true} />
      <ProtectedRoute path="/admin/communication" component={ClientOperations} adminOnly={true} />
      <ProtectedRoute path="/admin/client-portal" component={ClientOperations} adminOnly={true} />
      <ProtectedRoute path="/admin/crm/customers/:id" component={CustomerDetail} adminOnly={true} />
      <ProtectedRoute path="/admin/bookings/:id" component={ClientOperations} adminOnly={true} />
      <ProtectedRoute path="/admin/projects/:id" component={ClientOperations} adminOnly={true} />
      <ProtectedRoute path="/admin/theme" component={AdminThemeEditor} adminOnly={true} />
      <Route path="/quote" component={QuoteBuilder} />

      <ProtectedRoute path="/social-media" component={SocialMediaPage} adminOnly={true} />
      <ProtectedRoute path="/social-media-ads" component={SocialMediaAdPage} adminOnly={true} />
      <ProtectedRoute path="/finance" component={FinancePage} adminOnly={true} />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} adminOnly={true} />
      <ProtectedRoute path="/service-analytics" component={ServiceAnalytics} adminOnly={true} />
      <ProtectedRoute path="/theme-editor" component={ThemeEditor} adminOnly={true} />

      <Route component={NotFound} />
    </Switch>
    </>
  );
}

function App() {
  // Initialize time-based color shift
  useEffect(() => {
    initializeColorShift();
    
    // Add bg-apollo-gradient class to body for subtle background animation
    document.body.classList.add('bg-apollo-gradient');
    
    // Add subtle-bg-animation class to main content sections
    setTimeout(() => {
      document.querySelectorAll('main, section').forEach(section => {
        section.classList.add('subtle-bg-animation');
      });
    }, 100);
    
    return () => {
      // Clean up classes if needed
      document.body.classList.remove('bg-apollo-gradient', 'day-mode', 'night-mode', 'transition-mode');
    };
  }, []);
  
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
