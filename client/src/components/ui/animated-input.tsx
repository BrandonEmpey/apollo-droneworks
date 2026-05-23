import * as React from "react";
import { cn } from "@/lib/utils";

export interface AnimatedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
  helperTextClassName?: string;
  errorClassName?: string;
}

const AnimatedInput = React.forwardRef<HTMLInputElement, AnimatedInputProps>(
  (
    {
      className,
      type,
      label,
      helperText,
      error,
      containerClassName,
      labelClassName,
      helperTextClassName,
      errorClassName,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = React.useState(false);
    const [filled, setFilled] = React.useState(false);
    
    // Track input field state
    React.useEffect(() => {
      setFilled(!!props.value);
    }, [props.value]);
    
    return (
      <div className={cn("relative space-y-1", containerClassName)}>
        {label && (
          <label
            className={cn(
              "block text-sm font-medium transition-all duration-200",
              focused ? "text-gold-gradient" : "text-gray-200",
              labelClassName
            )}
          >
            {label}
          </label>
        )}
        
        <div className="relative input-focus-effect">
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              "transition-all duration-200",
              focused && "border-primary",
              className
            )}
            ref={ref}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          
          {/* Animated underline */}
          <span 
            className={cn(
              "absolute bottom-0 left-0 h-[2px] bg-gold-gradient transition-all duration-300",
              focused ? "w-full" : "w-0"
            )}
          />
        </div>
        
        {error ? (
          <p className={cn("text-xs text-red-500", errorClassName)}>{error}</p>
        ) : helperText ? (
          <p className={cn("text-xs text-gray-400", helperTextClassName)}>
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

AnimatedInput.displayName = "AnimatedInput";

export { AnimatedInput };