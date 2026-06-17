import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Fond "Aurora UI" : dégradés/blobs lumineux (sky + orange) animés lentement,
 * derrière le contenu. Dual-mode et respect de prefers-reduced-motion.
 */
export function AuroraBackground({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const blob =
    "absolute rounded-full blur-3xl will-change-transform motion-reduce:hidden";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border bg-background",
        className
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <motion.div
          className={cn(blob, "-left-24 -top-28 h-96 w-96 bg-primary/30 dark:bg-primary/25")}
          animate={{ x: [0, 30, -10, 0], y: [0, -20, 15, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className={cn(blob, "right-[-4rem] top-[-3rem] h-80 w-80 bg-accent/20 dark:bg-accent/25")}
          animate={{ x: [0, -25, 12, 0], y: [0, 22, -12, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className={cn(blob, "bottom-[-6rem] left-1/3 h-96 w-96 bg-secondary/30 dark:bg-secondary/20")}
          animate={{ x: [0, 18, -22, 0], y: [0, -12, 16, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
