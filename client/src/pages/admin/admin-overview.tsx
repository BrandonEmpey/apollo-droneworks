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
  LayoutGrid,
  Loader2,
  FolderKanban,
  Package,
  Megaphone,
} from "lucide-react";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/hooks/use-auth";

// Hub definitions — keep features array in sync with actual tab labels in each hub page
const adminSections = [
  {
    title: "Project Dashboard",
    description: "Client projects, deliverables, file uploads, and client portal",
    href: "/admin/projects",
    icon: FolderKanban,
    color: "bg-purple-600",
    features: ["Client Tiles", "Project Tracking", "File Uploads", "Deliverables", "Client Portal"],
  },
  {
    title: "Business Intelligence",
    description: "Analytics, AI recommendations, pricing optimization, and revenue insights",
    href: "/admin/analytics",
    icon: Brain,
    color: "bg-blue-600",
    features: ["AI Recommendations", "Project Analytics", "Financial Reports", "AI Pricing", "Competitor Analysis"],
  },
  {
    title: "Financial Management",
    description: "Income, expenses, asset registry, depreciation, and tax documents",
    href: "/admin/finance",
    icon: DollarSign,
    color: "bg-emerald-600",
    features: ["Income", "Expenses", "Asset Registry", "P&L Reports", "Tax Estimates"],
  },
  {
    title: "Client Operations",
    description: "CRM, bookings, and client communication",
    href: "/admin/clients",
    icon: Users,
    color: "bg-sky-600",
    features: ["CRM", "Bookings", "Communication"],
  },
  {
    title: "Content Management",
    description: "Services, galleries, blog posts, and homepage carousel",
    href: "/admin/content",
    icon: FileText,
    color: "bg-green-600",
    features: ["Services", "Galleries", "Blog Posts", "Carousel"],
  },
  {
    title: "Services & Pricing",
    description: "Service catalog, add-ons, pricing tiers, and the quote builder",
    href: "/admin/services",
    icon: Package,
    color: "bg-orange-600",
    features: ["Service Config", "Add-ons", "Pricing Tiers", "Quote Builder"],
  },
  {
    title: "Social & Marketing",
    description: "Social media posts, ad campaigns, referral program, and satisfaction surveys",
    href: "/social-media",
    icon: Megaphone,
    color: "bg-pink-600",
    features: ["Social Media", "Ad Campaigns", "Referral Program", "Satisfaction Surveys"],
  },
  {
    title: "Industry Tiles",
    description: "Homepage navigation tiles and service assignments per industry",
    href: "/admin/industry-tiles",
    icon: LayoutGrid,
    color: "bg-teal-600",
    features: ["Tile Management", "Service Assignments", "Display Order"],
  },
  {
    title: "System Settings",
    description: "User management, theme editor, and system configuration",
    href: "/admin/settings",
    icon: Settings,
    color: "bg-slate-500",
    features: ["User Management", "Theme Editor", "Security", "System Info"],
  },
];

export default function AdminOverview() {
  const { user, isLoading } = useAuth();

  const { data: stats, isLoading: isLoadingStats } = useQuery<{
    totalClients: number;
    activeProjects: number;
    monthlyRevenue: number;
    activeServices: number;
    upcomingBookings: number;
  }>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user?.isAdmin,
  });

  if (isLoading) return <div>Loading...</div>;
  if (!user?.isAdmin) return <div>Access denied. Admin privileges required.</div>;

  const statCards = [
    {
      label: "Upcoming Bookings",
      value: isLoadingStats ? null : (stats?.upcomingBookings ?? 0),
      icon: Calendar,
      href: "/admin/clients",
    },
    {
      label: "Active Projects",
      value: isLoadingStats ? null : (stats?.activeProjects ?? 0),
      icon: FolderKanban,
      href: "/admin/projects",
    },
    {
      label: "Monthly Revenue",
      value: isLoadingStats ? null : stats?.monthlyRevenue,
      icon: TrendingUp,
      href: "/admin/finance",
      isCurrency: true,
    },
    {
      label: "Total Clients",
      value: isLoadingStats ? null : (stats?.totalClients ?? 0),
      icon: Users,
      href: "/admin/clients",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Admin Control Center — Apollo DroneWorks</title>
      </Helmet>

      <Header />

      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">Admin Control Center</h1>
          <p className="text-muted-foreground">
            All management tools for Apollo DroneWorks
          </p>
        </div>

        {/* Hub grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-12">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.href} className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`p-2 rounded-lg ${section.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base leading-snug">{section.title}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{section.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1 mb-4">
                    {section.features.map((f) => (
                      <li key={f} className="text-xs text-muted-foreground flex items-center">
                        <div className="w-1 h-1 bg-primary rounded-full mr-2 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={section.href}>
                    <Button className="w-full h-8 text-xs">Open</Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Live stats strip */}
        <h2 className="text-lg font-semibold mb-4">At a Glance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((s) => {
            const Icon = s.icon;
            const displayValue =
              s.value === null
                ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                : s.isCurrency
                  ? `$${Number(s.value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                  : String(s.value);

            return (
              <Link key={s.label} href={s.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">{s.label}</p>
                        <p className="text-2xl font-bold">{displayValue}</p>
                      </div>
                      <Icon className="h-7 w-7 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
