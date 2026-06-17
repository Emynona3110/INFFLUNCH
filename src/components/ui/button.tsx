import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  primarySoft: "bg-primary/10 text-primary hover:bg-primary/20",
  outline: "border border-border bg-transparent text-foreground hover:bg-muted",
  destructive: "bg-destructive text-white hover:bg-destructive/90 shadow-sm",
  destructiveSoft: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  ghost: "bg-transparent text-foreground hover:bg-muted",
} as const;

const sizes = {
  default: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-sm",
  icon: "h-10 w-10",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
