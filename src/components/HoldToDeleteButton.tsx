import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import useMediaQuery from "@/hooks/useMediaQuery";

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
  /** Libellé accessible / title (défaut : « Maintenir pour supprimer »). */
  title?: string;
  /**
   * Mobile : question posée dans la popup de validation après l'appui long
   * (défaut « Supprimer cet élément ? »). `false` désactive la popup (quand
   * l'appelant enchaîne déjà sur sa propre confirmation).
   */
  mobileConfirm?: string | false;
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
  title = "Maintenir pour supprimer",
  mobileConfirm = "Supprimer cet élément ?",
}: Props) => {
  const [holding, setHolding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mobile : l'appui long est facile à déclencher par erreur (scroll, doigt
  // posé) → on demande une validation explicite en plus.
  const isMobile = useMediaQuery("(max-width: 639px)");

  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

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
      if (isMobile && mobileConfirm !== false) setAsking(true);
      else await run();
    }, holdMs);
  };

  // Nettoyage si démonté pendant un appui.
  useEffect(() => () => cancel(), []);

  return (
    <>
    <button
      type="button"
      disabled={disabled || busy}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={title}
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
      <span className="relative inline-flex items-center gap-1">
        {busy ? <Spinner /> : children}
      </span>
    </button>
    <Dialog
      open={asking}
      onClose={() => setAsking(false)}
    >
      <DialogTitle>{mobileConfirm || "Supprimer cet élément ?"}</DialogTitle>
      <p className="mt-2 text-sm text-foreground/70">Cette action est irréversible.</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => setAsking(false)}>
          Annuler
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            setAsking(false);
            run();
          }}
        >
          Confirmer
        </Button>
      </div>
    </Dialog>
    </>
  );
};

export default HoldToDeleteButton;
