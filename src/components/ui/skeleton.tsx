import { cn } from "@/lib/utils";

/**
 * Bloc gris pulsé : la forme d'un élément pas encore chargé. À dimensionner
 * comme l'élément réel (mêmes hauteurs, arrondis, points de rupture), pour que
 * la page ne bouge pas quand les données arrivent.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded bg-foreground/10", className)}
    />
  );
}
