import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

interface AnimatedToastProps {
  variant?: "default" | "success" | "warning" | "error" | "info";
}

const toastVariants = {
  default: "border-gold bg-background text-foreground",
  success: "border-green-600 bg-green-50 text-green-900 dark:bg-green-900/30 dark:text-green-50",
  warning: "border-yellow-600 bg-yellow-50 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-50",
  error: "border-red-600 bg-red-50 text-red-900 dark:bg-red-900/30 dark:text-red-50",
  info: "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-50",
};

const AnimatedToast = React.forwardRef<
  React.ElementRef<typeof Toast>,
  React.ComponentPropsWithoutRef<typeof Toast> & AnimatedToastProps
>(({ className, variant = "default", ...props }, ref) => {
  // Generate entry animation class
  const animationClass = "toast-enter toast-enter-active";
  
  return (
    <Toast
      ref={ref}
      className={cn(
        toastVariants[variant],
        "min-h-16 group relative flex w-full items-start justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all animate-in fade-in slide-in-from-bottom-5",
        animationClass,
        className
      )}
      {...props}
    />
  );
});
AnimatedToast.displayName = "AnimatedToast";

const AnimatedToastProvider = ToastProvider;

const AnimatedToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastViewport>,
  React.ComponentPropsWithoutRef<typeof ToastViewport>
>(({ className, ...props }, ref) => (
  <ToastViewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
));
AnimatedToastViewport.displayName = "AnimatedToastViewport";

const AnimatedToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastTitle>,
  React.ComponentPropsWithoutRef<typeof ToastTitle>
>(({ className, ...props }, ref) => (
  <ToastTitle
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));
AnimatedToastTitle.displayName = "AnimatedToastTitle";

const AnimatedToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastDescription>,
  React.ComponentPropsWithoutRef<typeof ToastDescription>
>(({ className, ...props }, ref) => (
  <ToastDescription
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));
AnimatedToastDescription.displayName = "AnimatedToastDescription";

const AnimatedToastClose = React.forwardRef<
  React.ElementRef<typeof ToastClose>,
  React.ComponentPropsWithoutRef<typeof ToastClose>
>(({ className, ...props }, ref) => (
  <ToastClose
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastClose>
));
AnimatedToastClose.displayName = "AnimatedToastClose";

function useAnimatedToast() {
  const { toast } = useToast();
  
  return {
    toast: ({
      variant = "default",
      ...props
    }: React.ComponentPropsWithoutRef<typeof Toast> & AnimatedToastProps) =>
      toast({
        ...props,
        className: cn(
          toastVariants[variant], 
          props.className
        ),
      }),
  };
}

export {
  useAnimatedToast,
  AnimatedToast,
  AnimatedToastProvider,
  AnimatedToastViewport,
  AnimatedToastTitle,
  AnimatedToastDescription,
  AnimatedToastClose,
};