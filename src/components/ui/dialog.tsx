import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Modale Tailwind simple : overlay + carte centrée, fermeture Échap / clic
 * extérieur.
 *
 * Rendue dans un portail sur `document.body` : un parent `sticky`/`fixed` avec
 * un z-index (la barre d'outils de l'accueil, par exemple) crée un contexte
 * d'empilement dont la modale ne peut plus sortir — elle passait sous la
 * navbar. Les variables de thème vivent sur `:root`, le portail n'y change rien.
 */
export function Dialog({ open, onClose, children, className }: DialogProps) {
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
      className="tw-scope fixed inset-0 z-[1100] flex justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "my-auto w-full max-w-md rounded-card border border-border bg-card p-6 shadow-xl",
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
      className="font-display text-xl font-bold text-card-foreground"
    >
      {children}
    </div>
  );
}
