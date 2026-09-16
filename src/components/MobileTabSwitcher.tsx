import { useLayoutEffect, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { cn } from "@/lib/utils";

export interface SwitcherTab<K extends string> {
  key: K;
  label: string;
  /** Pastille « à voir » sur ce sous-onglet. */
  dot?: boolean;
}

interface Props<K extends string> {
  tabs: SwitcherTab<K>[];
  active: K;
  onChange: (key: K) => void;
  className?: string;
}

/**
 * Sélecteur de sous-onglet mobile : directement dans le bandeau sous la navbar,
 * le nom de l'onglet courant au centre et un chevron de chaque côté. Le
 * libellé glisse dans le sens du changement.
 */
export function MobileTabSwitcher<K extends string>({
  tabs,
  active,
  onChange,
  className,
}: Props<K>) {
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.key === active)
  );
  const prev = index > 0 ? tabs[index - 1] : null;
  const next = index < tabs.length - 1 ? tabs[index + 1] : null;

  // Décalage de la piste pour centrer le libellé courant dans la fenêtre
  // (mesuré : les libellés ont leur largeur naturelle, jamais tronqués).
  const viewportRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const strip = stripRef.current;
    if (!viewport || !strip) return;
    const compute = () => {
      const el = strip.children[index] as HTMLElement | undefined;
      if (!el) return;
      const center = el.offsetLeft + el.offsetWidth / 2;
      setShift(viewport.clientWidth / 2 - center);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [index, tabs]);

  return (
    <div
      className={cn(
        "flex h-9 items-center",
        className
      )}
    >
      <button
        type="button"
        aria-label="Onglet précédent"
        disabled={!prev}
        onClick={() => prev && onChange(prev.key)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/60 disabled:text-foreground/20"
      >
        <FiChevronLeft className="h-5 w-5" />
      </button>

      {/* « Roue » horizontale : tous les libellés entiers sur une piste
          (largeur naturelle chacun) ; la piste glisse pour centrer l'onglet
          courant, ses voisins (2 de chaque côté) restant visibles, estompés. */}
      <div ref={viewportRef} className="relative min-w-0 flex-1 overflow-hidden">
        <div
          ref={stripRef}
          className="flex w-max items-center gap-4 transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${shift}px)` }}
        >
          {tabs.map((t, i) => {
            const d = Math.abs(i - index);
            return (
              <button
                key={t.key}
                type="button"
                tabIndex={d === 0 ? -1 : 0}
                onClick={() => d !== 0 && onChange(t.key)}
                className={cn(
                  "relative flex h-9 shrink-0 items-center whitespace-nowrap transition-all duration-300 ease-out",
                  "font-display text-sm",
                  d === 0
                    ? "font-bold text-primary"
                    : d === 1
                      ? "font-medium text-foreground/45"
                      : "font-medium text-foreground/25",
                  d > 2 && "opacity-0"
                )}
              >
                {t.label}
                {t.dot && d !== 0 && (
                  <span className="absolute -right-1.5 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        aria-label="Onglet suivant"
        disabled={!next}
        onClick={() => next && onChange(next.key)}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/60 disabled:text-foreground/20"
      >
        <FiChevronRight className="h-5 w-5" />
        {/* Pastille : un onglet hors champ à droite a quelque chose à voir. */}
        {tabs.slice(index + 3).some((t) => t.dot) && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
        )}
      </button>
    </div>
  );
}

/** Balayage horizontal (touch) → onSwipe(-1 | 1). À poser sur la zone de contenu. */
export function useSwipeTabs(onSwipe: (delta: number) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!start.current) return;
      const dx = e.changedTouches[0].clientX - start.current.x;
      const dy = e.changedTouches[0].clientY - start.current.y;
      start.current = null;
      // Geste franc et surtout horizontal (sinon c'est un scroll).
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        onSwipe(dx < 0 ? 1 : -1);
      }
    },
  };
}
