import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  src: string;
  className?: string;
}

const MIN = 1;
const MAX = 4;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Image zoomable pour la lightbox : molette et pincement pour zoomer autour du
 * doigt/curseur, double clic (ou double tap) pour basculer ×1 ↔ ×2.5, glisser
 * pour se déplacer une fois zoomé. Tout en pointer events, sans dépendance.
 *
 * Le zoom est un simple `transform` sur l'image : la boîte, elle, ne bouge
 * pas — l'overlay derrière reste cliquable pour fermer.
 */
const ZoomableImage = ({ src, className }: Props) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  // Points actifs (1 = glisser, 2 = pincer) et repère du dernier geste.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = useRef(0);
  const moved = useRef(false);

  // Nouvelle image : on repart à plat.
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [src]);

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
    setOffset({ x: cx - (cx - offset.x) * ratio, y: cy - (cy - offset.y) * ratio });
    setScale(s);
  };

  /** Coordonnées d'un pointeur relatives au centre de l'élément. */
  const rel = (e: { clientX: number; clientY: number }, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - (r.left + r.width / 2), y: e.clientY - (r.top + r.height / 2) };
  };

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        transition: pointers.current.size ? "none" : "transform 120ms ease-out",
        cursor: scale > 1 ? "grab" : "zoom-in",
        touchAction: "none",
      }}
      className={cn("select-none", className)}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => {
        e.preventDefault();
        const { x, y } = rel(e, e.currentTarget);
        zoomAt(scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2), x, y);
      }}
      onDoubleClick={(e) => {
        const { x, y } = rel(e, e.currentTarget);
        zoomAt(scale > 1 ? 1 : 2.5, x, y);
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
          const mid = rel({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }, e.currentTarget);
          zoomAt((gesture.current.scale * dist) / gesture.current.dist, mid.x, mid.y);
          moved.current = true;
        } else if (scale > 1) {
          setOffset((o) => ({ x: o.x + cur.x - prev.x, y: o.y + cur.y - prev.y }));
          if (Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y) > 2) moved.current = true;
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
            zoomAt(scale > 1 ? 1 : 2.5, x, y);
            lastTap.current = 0;
          } else lastTap.current = now;
        }
      }}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId);
        gesture.current = null;
      }}
    />
  );
};

export default ZoomableImage;
