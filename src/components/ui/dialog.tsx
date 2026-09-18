import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** Fermeture au clic sur l'overlay (défaut false : seuls Annuler/Échap ferment). */
  closeOnOverlayClick?: boolean;
}

/**
 * Modale Tailwind simple : overlay + carte centrée, fermeture Échap (pas au
 * clic extérieur, sauf `closeOnOverlayClick`).
 *
 * Rendue dans un portail sur `document.body` : un parent `sticky`/`fixed` avec
 * un z-index (la barre d'outils de l'accueil, par exemple) crée un contexte
 * d'empilement dont la modale ne peut plus sortir — elle passait sous la
 * navbar. Les variables de thème vivent sur `:root`, le portail n'y change rien.
 */
export function Dialog({
  open,
  onClose,
  children,
  className,
  closeOnOverlayClick = false,
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="tw-scope fixed inset-0 z-[1100] flex justify-center overflow-y-auto bg-black/50 p-2.5 sm:p-4"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "my-auto w-full max-w-md rounded-card border border-border bg-card p-4 shadow-xl sm:p-6",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/** Titre de modale (cohérent avec la DA). */
export function DialogTitle({ children }: { children: ReactNode }) {
  return (
    <div
      role="heading"
      aria-level={2}
      className="font-display text-lg font-bold text-card-foreground sm:text-xl"
    >
      {children}
    </div>
  );
}
