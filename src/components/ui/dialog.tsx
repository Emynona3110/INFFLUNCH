import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/** Modale Tailwind simple : overlay + carte centrée, fermeture Échap / clic extérieur. */
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

  return (
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
    </div>
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
