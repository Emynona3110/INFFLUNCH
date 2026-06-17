import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-foreground/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
