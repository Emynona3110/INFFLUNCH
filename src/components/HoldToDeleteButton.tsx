import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Action déclenchée après l'appui maintenu. */
  onConfirm: () => void | Promise<void>;
  holdMs?: number;
  /** Classes du bouton (style libre : solide, ghost…). */
  className?: string;
  /** Classes de la barre de progression (couleur de remplissage). */
  progressClassName?: string;
  children: ReactNode;
  disabled?: boolean;
}

/**
 * Bouton « maintenir pour supprimer » : appui prolongé (défaut 1s) avec barre
 * de progression à l'intérieur, puis exécution. Évite les suppressions
 * accidentelles. Style libre via className/progressClassName (solide ou ghost).
 */
const HoldToDeleteButton = ({
  onConfirm,
  holdMs = 1000,
  className,
  progressClassName = "bg-white/30",
  children,
  disabled,
}: Props) => {
  const [holding, setHolding] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setHolding(false);
  };

  const start = () => {
    if (disabled || busy || timer.current) return;
    setHolding(true);
    timer.current = setTimeout(async () => {
      timer.current = null;
      setHolding(false);
      setBusy(true);
      try {
        await onConfirm();
      } finally {
        setBusy(false);
      }
    }, holdMs);
  };

  // Nettoyage si démonté pendant un appui.
  useEffect(() => () => cancel(), []);

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Maintenir pour supprimer"
      title="Maintenir pour supprimer"
      className={cn(
        "relative cursor-pointer touch-none select-none overflow-hidden transition disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 ease-linear", progressClassName)}
        style={{
          width: holding ? "100%" : "0%",
          transitionProperty: "width",
          transitionDuration: holding ? `${holdMs}ms` : "150ms",
        }}
      />
      <span className="relative inline-flex items-center gap-1">{children}</span>
    </button>
  );
};

export default HoldToDeleteButton;
