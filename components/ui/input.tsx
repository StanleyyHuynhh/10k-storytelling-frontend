import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "block w-full rounded-md bg-white border border-gray-300 px-4 py-2 text-sm placeholder-gray-400",
          // file input button styling with black color
          "file:mr-4 file:py-1 file:px-3 file:border-0 file:bg-black file:text-white file:rounded-full file:font-medium hover:file:bg-black/90",
          // subtle focus and hover
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-gray-400",
          "transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
