import * as React from "react"
import { cn } from "@/lib/utils"

export interface AuthInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'> {
    value?: string | number | readonly string[] | null;
  }

const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, type, value, ...props }, ref) => {
    // Convert null or undefined value to empty string to avoid DOM warnings
    const processedValue = value === null || value === undefined ? '' : value;
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm placeholder:text-gray-400 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        style={{ 
          color: "white", 
          WebkitTextFillColor: "white",
          caretColor: "#d5c28f",
          borderColor: "rgba(245, 245, 245, 0.2)",
          backgroundColor: "#111111"
        }}
        value={processedValue}
        {...props}
      />
    )
  }
)
AuthInput.displayName = "AuthInput"

export { AuthInput }