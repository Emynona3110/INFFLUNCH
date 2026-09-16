import { useEffect, useRef, useState } from "react";
import { FiMinus, FiPlus, FiRotateCcw } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface Props {
  src: string;
  /** Classes de l'image elle-même (le conteneur, lui, remplit la place). */
  className?: string;
  /** Facteur courant, pour que l'appelant s'efface pendant le zoom. */
  onScaleChange?: (scale: number) => void;
  /** Toute nouvelle valeur remet l'image à plat (Échap, changement de photo). */
  resetToken?: number;
}

const MIN = 1;
const MAX = 5;
/** Les boutons vont de cent en cent : 100 % → 200 % → 300 %… */
const STEP = 1;
/** Douceur de la molette : facteur = exp(-deltaY × ce coefficient). Un cran de
 *  souris (≈100) donne ainsi ~30 %, un pavé tactile suit le doigt. */
const WHEEL = 0.0026;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Image zoomable : molette et pincement pour zoomer autour du doigt/curseur,
 * double clic (ou double tap) pour basculer ×1 ↔ ×2, glisser pour se déplacer
 * une fois zoomée, et trois boutons pour ceux qui ne devinent pas les gestes.
 *
 * Le déplacement est borné aux bords de l'image : on ne peut pas la traîner
 * hors de l'écran et la perdre. Le zoom n'est qu'un `transform` sur l'image —
 * la boîte ne bouge pas, l'arrière-plan reste cliquable pour fermer.
 */
const ZoomableImage = ({ src, className, onScaleChange, resetToken }: Props) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // Points actifs (1 = glisser, 2 = pincer) et repère du dernier geste.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = useRef(0);
  const moved = useRef(false);

  // Nouvelle image, ou remise à plat demandée par l'appelant.
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [src, resetToken]);

  // L'appelant suit le facteur pour libérer l'écran pendant le zoom. La
  // callback passe par une ref : une fonction recréée à chaque rendu du parent
  // ne doit pas relancer l'effet.
  const notify = useRef(onScaleChange);
  notify.current = onScaleChange;
  useEffect(() => {
    notify.current?.(scale);
  }, [scale]);

  /** Déplacement admissible : au plus ce qui dépasse du cadre, de chaque côté.
   *  À ×1 (ou tant que l'image tient dans le cadre) tout reste centré. */
  const clampOffset = (next: { x: number; y: number }, s: number) => {
    const img = imgRef.current;
    const box = boxRef.current;
    if (!img || !box) return next;
    const maxX = Math.max(0, (img.clientWidth * s - box.clientWidth) / 2);
    const maxY = Math.max(0, (img.clientHeight * s - box.clientHeight) / 2);
    return { x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
  };

  /** Applique un nouveau facteur en gardant le point (cx, cy) — relatif au
   *  centre de l'image — sous le curseur. */
  const zoomAt = (next: number, cx: number, cy: number) => {
    const s = clamp(next, MIN, MAX);
    if (s === MIN) {
      setScale(MIN);
      setOffset({ x: 0, y: 0 });
      return;
    }
    const ratio = s / scale;
    setOffset(
      clampOffset(
        { x: cx - (cx - offset.x) * ratio, y: cy - (cy - offset.y) * ratio },
        s
      )
    );
    setScale(s);
  };

  /** Zoom par les boutons : centré, sans point de visée, par pas de 100 %. */
  const zoomBy = (delta: number) => zoomAt(scale + delta, 0, 0);

  /** Coordonnées d'un pointeur relatives au centre de l'élément. */
  const rel = (e: { clientX: number; clientY: number }, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return {
      x: e.clientX - (r.left + r.width / 2),
      y: e.clientY - (r.top + r.height / 2),
    };
  };

  // La molette doit pouvoir annuler le défilement : React pose ses écouteurs
  // `wheel` en passif, où preventDefault est ignoré — d'où l'écouteur natif.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = rel(e, img);
      // deltaMode 1 = défilement par lignes (Firefox) : ramené en pixels.
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      zoomAt(scale * Math.exp(-delta * WHEEL), x, y);
    };
    img.addEventListener("wheel", onWheel, { passive: false });
    return () => img.removeEventListener("wheel", onWheel);
  });

  const zoomed = scale > 1.001;

  return (
    <div
      ref={boxRef}
      className="relative flex h-full w-full items-center justify-center"
      onClick={(e) => {
        // Cliquer à côté de l'image ferme la visionneuse (clic de l'appelant),
        // sauf tant qu'on est zoomé : on y vise la photo, pas la sortie.
        if (zoomed) e.stopPropagation();
      }}
    >
      <img
        ref={imgRef}
        src={src}
        alt=""
        draggable={false}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transition: pointers.current.size ? "none" : "transform 120ms ease-out",
          // Curseur ordinaire au repos : la loupe promettait un clic qui ne
          // zoome pas (il faut la molette, le double clic ou les boutons).
          cursor: zoomed ? "grab" : "default",
          touchAction: "none",
        }}
        className={cn("select-none", className)}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          const { x, y } = rel(e, e.currentTarget);
          zoomAt(zoomed ? 1 : 2, x, y);
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          moved.current = false;
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
          }
        }}
        onPointerMove={(e) => {
          const prev = pointers.current.get(e.pointerId);
          if (!prev) return;
          const cur = { x: e.clientX, y: e.clientY };
          pointers.current.set(e.pointerId, cur);
          if (pointers.current.size === 2 && gesture.current) {
            const [a, b] = [...pointers.current.values()];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            const mid = rel(
              { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 },
              e.currentTarget
            );
            zoomAt((gesture.current.scale * dist) / gesture.current.dist, mid.x, mid.y);
            moved.current = true;
          } else if (zoomed) {
            setOffset((o) =>
              clampOffset(
                { x: o.x + cur.x - prev.x, y: o.y + cur.y - prev.y },
                scale
              )
            );
            if (Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y) > 2) {
              moved.current = true;
            }
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          gesture.current = null;
          // Double tap tactile : le double clic natif n'est pas fiable au doigt.
          if (e.pointerType === "touch" && !moved.current) {
            const now = Date.now();
            if (now - lastTap.current < 300) {
              const { x, y } = rel(e, e.currentTarget);
              zoomAt(zoomed ? 1 : 2, x, y);
              lastTap.current = 0;
            } else lastTap.current = now;
          }
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          gesture.current = null;
        }}
      />

      {/* Commandes : l'affordance qui manque aux gestes. Discrètes au repos,
          elles restent au même endroit une fois l'écran libéré. */}
      <div
        className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-1 text-white backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Dézoomer"
          disabled={!zoomed}
          onClick={() => zoomBy(-STEP)}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition hover:bg-white/20 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
        >
          <FiMinus className="h-4 w-4" />
        </button>
        <span className="min-w-[3rem] text-center text-xs font-medium tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          aria-label="Zoomer"
          disabled={scale >= MAX - 0.001}
          onClick={() => zoomBy(STEP)}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition hover:bg-white/20 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
        >
          <FiPlus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Taille d'origine"
          disabled={!zoomed}
          onClick={() => zoomAt(1, 0, 0)}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition hover:bg-white/20 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
        >
          <FiRotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default ZoomableImage;
