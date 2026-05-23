import * as React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export interface AnimatedNavItemProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href: string;
  active?: boolean;
  icon?: React.ReactNode;
  underlineAnimation?: boolean;
  fullHoverEffect?: boolean;
}

const AnimatedNavItem = React.forwardRef<HTMLAnchorElement, AnimatedNavItemProps>(
  (
    {
      className,
      href,
      active,
      icon,
      underlineAnimation = true,
      fullHoverEffect = false,
      children,
      ...props
    },
    ref
  ) => {
    const [location] = useLocation();
    const isActive = active !== undefined ? active : location === href;
    
    return (
      <Link href={href}>
        <a
          ref={ref}
          className={cn(
            "nav-item inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
            fullHoverEffect && "relative overflow-hidden",
            isActive 
              ? "text-gold-gradient active" 
              : "text-foreground/70 hover:text-foreground",
            className
          )}
          {...props}
        >
          {icon && <span className="mr-2">{icon}</span>}
          <span>{children}</span>
          
          {/* Full hover effect gradient overlay */}
          {fullHoverEffect && (
            <span 
              className={cn(
                "absolute inset-0 z-0 bg-gold-gradient opacity-0 transition-opacity duration-300",
                isActive ? "opacity-10" : "group-hover:opacity-5"
              )}
            />
          )}
        </a>
      </Link>
    );
  }
);

AnimatedNavItem.displayName = "AnimatedNavItem";

export { AnimatedNavItem };