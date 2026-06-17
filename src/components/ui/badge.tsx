import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Badge type shadcn/ui, variantes alignées sur design-system/MASTER.md. */
export function Badge({
  className,
  variant = "muted",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: "muted" | "primary" | "accent";
}) {
  const variants = {
    muted: "bg-muted text-foreground/70",
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
