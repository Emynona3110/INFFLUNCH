import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-card text-card-foreground shadow-[0_10px_30px_-12px_rgba(2,8,40,0.18)]",
        className
      )}
      {...props}
    />
  );
}
