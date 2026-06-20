import { cn } from "@/lib/utils";

/**
 * Petit spinner inline (hérite de la couleur du texte via border-current).
 * À placer dans les boutons pendant une attente réseau (Supabase).
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
    />
  );
}
