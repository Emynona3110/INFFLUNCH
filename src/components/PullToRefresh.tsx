import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FiArrowDown } from "react-icons/fi";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface Props {
  /** Conteneur qui scrolle (le <main> du Layout) : le tirage n'est possible
   *  que lorsqu'il est tout en haut. */
  scrollRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

/** Déplacement (px) à partir duquel relâcher déclenche le rafraîchissement. */
const THRESHOLD = 64;
/** Déplacement maximal du contenu (px). */
const MAX_PULL = 96;

/**
 * « Tirer pour rafraîchir » (mobile). Sur relâchement au-delà du seuil, toutes
 * les requêtes TanStack actives sont invalidées et refetchées : la page se met
 * à jour sans rechargement complet. Le contenu suit le doigt (translateY) et
 * un indicateur (flèche → spinner) s'affiche au-dessus.
 */
const PullToRefresh = ({ scrollRef, children }: Props) => {
  const queryClient = useQueryClient();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const setPullBoth = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || el.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0 || el.scrollTop > 0) {
        if (pullRef.current) setPullBoth(0);
        return;
      }
      // Résistance : le contenu suit moins vite que le doigt.
      setPullBoth(Math.min(MAX_PULL, dy * 0.5));
      // Bloque le scroll/overscroll natif pendant le tirage.
      if (e.cancelable) e.preventDefault();
    };
    const onEnd = async () => {
      if (startY.current == null) return;
      startY.current = null;
      if (pullRef.current < THRESHOLD) {
        setPullBoth(0);
        return;
      }
      refreshingRef.current = true;
      setRefreshing(true);
      setPullBoth(THRESHOLD);
      try {
        await queryClient.invalidateQueries();
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
        setPullBoth(0);
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [scrollRef, queryClient]);

  const progress = Math.min(1, pull / THRESHOLD);
  const dragging = startY.current != null;

  return (
    <div className="relative">
      {/* Indicateur : centré au-dessus du contenu, apparaît avec le tirage. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
        style={{
          transform: `translateY(${pull - 44}px)`,
          opacity: progress,
          transition: dragging ? "none" : "transform 200ms, opacity 200ms",
        }}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-primary shadow-md ring-1 ring-border">
          {refreshing ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <FiArrowDown
              className={cn("h-4 w-4 transition-transform", progress >= 1 && "rotate-180")}
            />
          )}
        </span>
      </div>

      <div
        style={{
          transform: pull ? `translateY(${pull}px)` : undefined,
          transition: dragging ? "none" : "transform 200ms",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
