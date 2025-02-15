import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:pointer-events-none disabled:opacity-50",
          variant === "default" && "bg-gray-900 text-white hover:bg-gray-800",
          variant === "outline" && "border border-gray-800 hover:bg-gray-900 hover:text-white",
          size === "default" && "h-11 px-4 py-2",
          size === "sm" && "h-9 px-3 text-xs",
          size === "lg" && "h-12 px-8",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };