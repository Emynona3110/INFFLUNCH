import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

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
  /** Affiche un spinner et désactive le bouton (attente réseau). */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "default", loading, disabled, children, ...props },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
);

Button.displayName = "Button";
