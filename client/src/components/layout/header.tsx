import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, ChevronDown, User, LogOut, Lock, Share2, DollarSign, BarChart2 } from "lucide-react";
import Logo from "@/components/ui/logo";
import { NotificationBell } from "@/components/ui/notification-bell";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isMobile = useIsMobile();
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  // Check if the user has scrolled down
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const headerClass = isScrolled
    ? "bg-[#080d17]/95 shadow-lg"
    : "bg-[#080e19]/50";

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${headerClass}`}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <Logo size="lg" />
            </div>
          </Link>

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="hidden lg:flex items-center ml-12 space-x-8">
              <NavItem href="/" label="Home" currentPath={location} />
              <NavItem href="/about" label="About" currentPath={location} />
              <NavItem href="/gallery" label="Gallery" currentPath={location} />
              <NavItem href="/testimonials" label="Testimonials" currentPath={location} />
              <NavItem href="/blog" label="Blog" currentPath={location} />
              <NavItem href="/contact" label="Contact" currentPath={location} />
              <NavItem href="/services" label="Services" currentPath={location} />
            </nav>
          )}

          {/* Authentication & Action buttons */}
          <div className="hidden lg:flex items-center ml-8 space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-[#132642] text-offwhite hover:bg-[#132642]/80">
                      <User className="h-4 w-4 mr-2" />
                      {user.firstName || user.username}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <Link href="/dashboard">
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" /> My Dashboard
                      </DropdownMenuItem>
                    </Link>
                    {user.isAdmin && (
                      <Link href="/admin">
                        <DropdownMenuItem className="cursor-pointer">
                          <Lock className="h-4 w-4 mr-2" /> Admin Dashboard
                        </DropdownMenuItem>
                      </Link>
                    )}
                    {user.isAdmin && (
                      <Link href="/social-media">
                        <DropdownMenuItem className="cursor-pointer">
                          <Share2 className="h-4 w-4 mr-2" /> Social Media Portal
                        </DropdownMenuItem>
                      </Link>
                    )}
                    {user.isAdmin && (
                      <Link href="/finance">
                        <DropdownMenuItem className="cursor-pointer">
                          <DollarSign className="h-4 w-4 mr-2" /> Finance Management
                        </DropdownMenuItem>
                      </Link>
                    )}
                    {user.isAdmin && (
                      <Link href="/analytics">
                        <DropdownMenuItem className="cursor-pointer">
                          <BarChart2 className="h-4 w-4 mr-2" /> Analytics
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
              <div className="flex items-center space-x-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-[#132642] text-offwhite hover:bg-[#132642]/80">
                      <Lock className="h-4 w-4 mr-2" />
                      Client Portal
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <Link href="/auth">
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" /> Sign In
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/register">
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" /> Register
                      </DropdownMenuItem>
                    </Link>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-offwhite focus:outline-none"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobile && isOpen && (
        <div className="lg:hidden bg-[#0b111f]/95 shadow-xl">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col space-y-4">
              <MobileNavItem
                href="/"
                label="Home"
                currentPath={location}
                onClick={closeMenu}
              />
              <MobileNavItem
                href="/about"
                label="About"
                currentPath={location}
                onClick={closeMenu}
              />
              <MobileNavItem
                href="/gallery"
                label="Gallery"
                currentPath={location}
                onClick={closeMenu}
              />
              <MobileNavItem
                href="/testimonials"
                label="Testimonials"
                currentPath={location}
                onClick={closeMenu}
              />
              <MobileNavItem
                href="/blog"
                label="Blog"
                currentPath={location}
                onClick={closeMenu}
              />
              <MobileNavItem
                href="/contact"
                label="Contact"
                currentPath={location}
                onClick={closeMenu}
              />
              <MobileNavItem
                href="/services"
                label="Services"
                currentPath={location}
                onClick={closeMenu}
              />

              <div className="pt-4 flex flex-col space-y-3">
                {user ? (
                  <>
                    <div className="flex items-center pb-2">
                      <NotificationBell />
                      <span className="ml-2 text-offwhite">Notifications</span>
                    </div>
                    <MobileNavItem
                      href="/dashboard"
                      label="My Dashboard"
                      currentPath={location}
                      onClick={closeMenu}
                    />
                    {user.isAdmin && (
                      <MobileNavItem
                        href="/admin"
                        label="Admin Dashboard"
                        currentPath={location}
                        onClick={closeMenu}
                      />
                    )}
                    {user.isAdmin && (
                      <MobileNavItem
                        href="/social-media"
                        label="Social Media Portal"
                        currentPath={location}
                        onClick={closeMenu}
                      />
                    )}
                    {user.isAdmin && (
                      <MobileNavItem
                        href="/finance"
                        label="Finance Management"
                        currentPath={location}
                        onClick={closeMenu}
                      />
                    )}
                    {user.isAdmin && (
                      <MobileNavItem
                        href="/analytics"
                        label="Analytics"
                        currentPath={location}
                        onClick={closeMenu}
                      />
                    )}
                    {user.isAdmin && (
                      <MobileNavItem
                        href="/theme-editor"
                        label="Theme Editor"
                        currentPath={location}
                        onClick={closeMenu}
                      />
                    )}
                    <Button
                      variant="ghost"
                      className="justify-start text-offwhite hover:text-gold-light"
                      onClick={() => {
                        handleLogout();
                        closeMenu();
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" /> Logout
                    </Button>

                  </>
                ) : (
                  <>
                    <MobileNavItem
                      href="/auth"
                      label="Sign In"
                      currentPath={location}
                      onClick={closeMenu}
                    />
                    <MobileNavItem
                      href="/register"
                      label="Register for Client Portal"
                      currentPath={location}
                      onClick={closeMenu}
                    />
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

function NavItem({
  href,
  label,
  currentPath,
}: {
  href: string;
  label: string;
  currentPath: string;
}) {
  const isActive = currentPath === href;
  return (
    <Link href={href}>
      <div 
        className={`text-offwhite hover:text-gold-gradient transition-colors cursor-pointer ${
          isActive ? "text-gold-gradient" : ""
        }`}
      >
        {label}
      </div>
    </Link>
  );
}

function MobileNavItem({
  href,
  label,
  currentPath,
  onClick,
}: {
  href: string;
  label: string;
  currentPath: string;
  onClick: () => void;
}) {
  const isActive = currentPath === href;
  return (
    <Link href={href}>
      <div
        className={`text-offwhite hover:text-gold-gradient transition-colors cursor-pointer ${
          isActive ? "text-gold-gradient" : ""
        }`}
        onClick={onClick}
      >
        {label}
      </div>
    </Link>
  );
}