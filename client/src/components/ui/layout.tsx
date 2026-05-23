import { Link, useLocation } from "wouter";
import { User } from "@shared/schema";
import {
  AlignJustify,
  Columns,
  FileBarChart,
  UserIcon,
  Settings,
  LogOut,
  ChevronDown,
  Home,
  BookOpen,
  Image,
  Phone,
  MessageSquare,
  Calendar,
  DollarSign,
  Share2,
  BarChart2,
  Palette,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/ui/notification-bell";
import droneLogoPath from "@assets/noBgColor.png";

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Layout({ children, user, sidebarOpen, setSidebarOpen }: LayoutProps) {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  const isAdmin = user?.isAdmin === true;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const mainNavItems = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Services", icon: Columns, href: "/services/1" },
    { label: "Portfolio", icon: Image, href: "/gallery" },
    { label: "Blog", icon: BookOpen, href: "/blog" },
    { label: "Contact", icon: Phone, href: "/contact" },
    { label: "Testimonials", icon: MessageSquare, href: "/testimonials" },
  ];

  const adminNavItems = [
    { label: "Admin Panel", icon: Settings, href: "/admin" },
    { label: "Social Media", icon: Share2, href: "/social-media" },
    { label: "Finance", icon: DollarSign, href: "/finance" },
    { label: "Analytics", icon: BarChart2, href: "/analytics" },
    { label: "Theme Editor", icon: Palette, href: "/theme-editor" },
  ];

  const clientNavItems = [
    { label: "Dashboard", icon: UserIcon, href: "/dashboard" },
    { label: "Book Service", icon: Calendar, href: "/booking" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-[#080d17]/95">
        <div className="container flex h-16 items-center px-4">
          <Button
            variant="outline"
            size="icon"
            className="mr-4 md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <AlignJustify className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          <Link href="/" className="flex items-center">
            <img
              src={droneLogoPath}
              alt="Apollo DroneWorks Logo"
              className="h-8 w-auto"
            />
            <span className="ml-2 hidden text-lg font-semibold sm:inline-block">
              Apollo DroneWorks
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:flex-1 md:items-center md:justify-center">
            <ul className="flex space-x-4">
              {mainNavItems.map((item) => (
                <li key={item.href}>
                  <Link 
                    href={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium transition-colors hover:text-primary ${
                      location === item.href ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User Menu */}
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="dark" className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 mr-2" />
                      {user.firstName || user.username}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <Link href="/dashboard">
                      <DropdownMenuItem className="cursor-pointer">
                        <UserIcon className="h-4 w-4 mr-2" /> My Dashboard
                      </DropdownMenuItem>
                    </Link>
                    
                    {isAdmin && (
                      <Link href="/admin">
                        <DropdownMenuItem className="cursor-pointer">
                          <Settings className="h-4 w-4 mr-2" /> Admin Dashboard
                        </DropdownMenuItem>
                      </Link>
                    )}
                    
                    {isAdmin && (
                      <Link href="/social-media">
                        <DropdownMenuItem className="cursor-pointer">
                          <Share2 className="h-4 w-4 mr-2" /> Social Media Portal
                        </DropdownMenuItem>
                      </Link>
                    )}
                    
                    {isAdmin && (
                      <Link href="/finance">
                        <DropdownMenuItem className="cursor-pointer">
                          <DollarSign className="h-4 w-4 mr-2" /> Finance Management
                        </DropdownMenuItem>
                      </Link>
                    )}
                    
                    {isAdmin && (
                      <Link href="/analytics">
                        <DropdownMenuItem className="cursor-pointer">
                          <BarChart2 className="h-4 w-4 mr-2" /> Analytics
                        </DropdownMenuItem>
                      </Link>
                    )}
                    
                    {isAdmin && (
                      <Link href="/theme-editor">
                        <DropdownMenuItem className="cursor-pointer">
                          <Palette className="h-4 w-4 mr-2" /> Theme Editor
                        </DropdownMenuItem>
                      </Link>
                    )}
                    
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Link href="/auth">
                <Button>Log In</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="py-6 md:px-8 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} Apollo DroneWorks. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}