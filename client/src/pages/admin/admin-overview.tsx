import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Users,
  FileText,
  Globe,
  TrendingUp,
  Brain,
  Calendar,
  DollarSign,
  Share2,
  Shield,
  LayoutGrid,
  Loader2,
} from "lucide-react";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/hooks/use-auth";
import { Booking } from "@shared/schema";

// SYNC REMINDER: Keep each hub's `features` array in sync with the actual tab
// labels rendered in its hub page. When you add, rename, or remove a tab in a
// hub page, update the matching entry below at the same time.
//
// Hub → source file mapping:
//   Business Intelligence  → client/src/pages/admin/analytics.tsx
//   Content Management     → client/src/pages/admin/content-management.tsx
//   Client Operations      → client/src/pages/admin/client-operations.tsx
//   Marketing Hub          → client/src/pages/admin/marketing-hub.tsx
//   Financial Management   → client/src/pages/finance-page.tsx
//   System Settings        → client/src/pages/admin/system-settings.tsx
//   Pricing Optimization   → client/src/pages/admin/pricing-optimization-new.tsx
const adminSections = [
  {
    title: "Business Intelligence",
    description: "Analytics, reports, and AI-powered insights",
    href: "/admin/analytics",
    icon: Brain,
    color: "bg-blue-500",
    // Tabs: AI Recommendations | Project Analytics | Financial Reports | Performance Metrics
    features: ["AI Recommendations", "Project Analytics", "Financial Reports", "Performance Metrics"]
  },
  {
    title: "Content Management",
    description: "Services, galleries, blog, and carousel media",
    href: "/admin/content",
    icon: FileText,
    color: "bg-green-500",
    features: ["Services", "Galleries", "Blog Posts", "Carousel"]
  },
  {
    title: "Client Operations",
    description: "CRM, bookings, projects, client communication, and client portal",
    href: "/admin/clients",
    icon: Users,
    color: "bg-purple-500",
    // Tabs: CRM | Bookings | Projects | Communication | Client Portal
    features: ["CRM", "Bookings", "Projects", "Communication", "Client Portal"]
  },
  {
    title: "Marketing Hub",
    description: "Social media, campaigns, analytics, audience, and testimonials",
    href: "/admin/marketing",
    icon: Share2,
    color: "bg-orange-500",
    // Tabs: Social Media | Campaigns | Analytics | Audience | Testimonials
    features: ["Social Media", "Campaigns", "Analytics", "Audience", "Testimonials"]
  },
  {
    title: "Financial Management",
    description: "Income, expenses, receipts, budgeting, payroll, tax, and analytics",
    href: "/admin/finance",
    icon: DollarSign,
    color: "bg-emerald-500",
    // Tabs: Overview | Income | Expenses | Categories | Reports | Documents | Budget | Tax | Payroll | Analytics | Export
    features: [
      "Overview",
      "Income",
      "Expenses",
      "Categories",
      "Reports",
      "Documents",
      "Budget",
      "Tax",
      "Payroll",
      "Analytics",
      "Export"
    ]
  },
  {
    title: "System Settings",
    description: "User management, permissions, and system configuration",
    href: "/admin/settings",
    icon: Settings,
    color: "bg-gray-500",
    // Tabs: User Management | Theme Editor | Security | System Info
    features: ["User Management", "Theme Editor", "Security", "System Info"]
  },
  {
    title: "Pricing Optimization",
    description: "AI-powered pricing insights and revenue optimization",
    href: "/admin/pricing",
    icon: TrendingUp,
    color: "bg-indigo-500",
    // Tabs: AI Pricing Suggestions | Competitor Analysis | Expedited Scheduling | Pricing Analytics
    features: ["AI Pricing Suggestions", "Competitor Analysis", "Expedited Scheduling", "Pricing Analytics"]
  },
  {
    title: "Trust Administration",
    description: "Comprehensive trust management with audit history and bidirectional sync",
    href: "/admin/trust-administration",
    icon: Shield,
    color: "bg-slate-500",
    features: ["Trust Entity Management", "Schedule of Assets", "Audit History", "Trustee & Beneficiary Management"]
  },
  {
    title: "Industry Tiles",
    description: "Manage homepage navigation tiles and service assignments for each industry",
    href: "/admin/industry-tiles",
    icon: LayoutGrid,
    color: "bg-teal-500",
    features: ["Industry Tile Management", "Service Assignments", "Image Uploads", "Display Order Control"]
  }
];

export default function AdminOverview() {
  const { user, isLoading } = useAuth();

  const { data: bookings, isLoading: isLoadingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user?.isAdmin,
  });

  const upcomingBookingCount = bookings
    ? bookings.filter(b => new Date(b.scheduledDate ?? b.date) > new Date()).length
    : null;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user?.isAdmin) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Admin Control Center - Apollo DroneWorks</title>
      </Helmet>
      
      <Header />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Admin Control Center
          </h1>
          <p className="text-muted-foreground">
            Manage all aspects of your drone services business from these specialized admin sections
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.href} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${section.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{section.title}</CardTitle>
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    {section.features.map((feature) => (
                      <li key={feature} className="text-sm text-muted-foreground flex items-center">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={section.href}>
                    <Button className="w-full">
                      Access {section.title}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats Overview */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Quick Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Upcoming Bookings</p>
                    <p className="text-2xl font-bold">
                      {isLoadingBookings ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : upcomingBookingCount !== null ? upcomingBookingCount : "—"}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                    <p className="text-2xl font-bold">48</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                    <p className="text-2xl font-bold">$24,500</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Services Active</p>
                    <p className="text-2xl font-bold">6</p>
                  </div>
                  <Globe className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}