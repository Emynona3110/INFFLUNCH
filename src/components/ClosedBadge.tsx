import { cn } from "@/lib/utils";

interface Props {
  /** Version réduite pour les vignettes (mode liste, tablées). */
  compact?: boolean;
  className?: string;
}

/**
 * Pastille « Fermé » des restaurants définitivement fermés. On les garde en
 * base pour l'historique (avis, photos, menus) : la pastille + l'image en noir
 * et blanc sont les seuls repères visuels.
 */
const ClosedBadge = ({ compact = false, className }: Props) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full bg-foreground/80 font-semibold uppercase tracking-wide text-background shadow backdrop-blur",
      compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
      className
    )}
  >
    Fermé
  </span>
);

export default ClosedBadge;
