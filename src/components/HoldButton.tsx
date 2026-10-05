import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface HoldButtonProps {
  /** Déclenché une fois l'appui maintenu jusqu'au bout. */
  onConfirm: () => void;
  /** Durée de l'appui, en ms. */
  duration?: number;
  "aria-label": string;
  className?: string;
  children: React.ReactNode;
}

const R = 15;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * Bouton rond à appui long : un anneau se remplit pendant l'appui, l'action ne
 * part qu'une fois plein. Relâcher avant, glisser ou défiler annule — fini les
 * clics malheureux. Au clavier (Entrée / Espace), l'action est immédiate.
 *
 * L'appui ne remonte pas au parent : posé sur une tuile déplaçable à l'appui
 * long, il ne la saisit pas.
 */
const HoldButton = ({
  onConfirm,
  duration = 600,
  className,
  children,
  ...aria
}: HoldButtonProps) => {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const cancel = () => {
    clearTimeout(timer.current);
    setHolding(false);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      aria-label={`${aria["aria-label"]} (appui long)`}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        setHolding(true);
        timer.current = setTimeout(() => {
          setHolding(false);
          navigator.vibrate?.(15);
          onConfirm();
        }, duration);
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      // Clavier seulement (`detail` vaut 0) : un clic de souris ne valide pas.
      onClick={(e) => {
        if (e.detail === 0) onConfirm();
      }}
      onContextMenu={(e) => e.preventDefault()}
      // iOS : pas de bulle « copier / partager » pendant l'appui long.
      style={{ WebkitTouchCallout: "none" }}
      className={cn("relative select-none", className)}
    >
      <svg
        aria-hidden
        viewBox="0 0 32 32"
        className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
      >
        <circle
          cx="16"
          cy="16"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={holding ? 0 : CIRCUMFERENCE}
          className="text-primary"
          style={{
            // Remplissage linéaire sur toute la durée ; vidage rapide si on lâche.
            transition: `stroke-dashoffset ${holding ? duration : 150}ms linear`,
          }}
        />
      </svg>
      {children}
    </button>
  );
};

export default HoldButton;
