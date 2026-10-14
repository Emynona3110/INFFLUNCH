import { useEffect, useRef, useState } from "react";
import { FiZoomIn, FiZoomOut } from "react-icons/fi";
import { cropSquare } from "@/utils/imageCompress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const MAX_ZOOM = 4;

interface Props {
  /** Image déjà chargée (décodée) et son URL d'affichage. */
  img: HTMLImageElement;
  src: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

/**
 * Cadrage : position du centre de l'image par rapport au centre du cadre, en
 * unités de CADRE (1 = côté du cadre), indépendantes de sa taille à l'écran.
 * À zoom 1, le petit côté de l'image remplit exactement le cadre.
 */
interface View {
  zoom: number;
  x: number;
  y: number;
}

/**
 * Recadrage de la photo de profil avant envoi : on glisse l'image (souris ou
 * doigt) et on zoome (curseur, molette, pincement). Le cadre est carré, le
 * masque rond montre ce qu'affichera l'avatar ; l'image couvre toujours tout
 * le cadre (pas de bord vide).
 */
const AvatarCropDialog = ({ img, src, busy, onCancel, onConfirm }: Props) => {
  const minSide = Math.min(img.naturalWidth, img.naturalHeight);
  // Taille de l'image en unités de cadre à zoom 1.
  const baseW = img.naturalWidth / minSide;
  const baseH = img.naturalHeight / minSide;

  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  /** Borne le décalage pour que l'image couvre toujours le cadre. */
  const clamp = (v: View): View => {
    const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom));
    const mx = (baseW * zoom - 1) / 2;
    const my = (baseH * zoom - 1) / 2;
    return {
      zoom,
      x: Math.min(mx, Math.max(-mx, v.x)),
      y: Math.min(my, Math.max(-my, v.y)),
    };
  };

  /** Zoom autour du centre du cadre : le point visé reste au centre. */
  const zoomTo = (z: (prev: number) => number) =>
    setView((v) => {
      const zoom = Math.min(MAX_ZOOM, Math.max(1, z(v.zoom)));
      const k = zoom / v.zoom;
      return clamp({ zoom, x: v.x * k, y: v.y * k });
    });

  const panBy = (dx: number, dy: number) =>
    setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }));

  // Molette : écouteur non passif, sinon impossible d'empêcher le défilement
  // de la page (React attache `wheel` en passif).
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomTo((z) => z * Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // zoomTo ne dépend que de l'image, fixe pendant la vie du composant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const map = pointers.current;
    const prev = map.get(e.pointerId);
    if (!prev || !frameRef.current) return;
    const side = frameRef.current.getBoundingClientRect().width;
    const next = { x: e.clientX, y: e.clientY };

    if (map.size >= 2) {
      // Pincement : rapport des écarts entre les deux doigts, et déplacement
      // de leur milieu (la moitié du mouvement de ce doigt).
      const other = [...map.entries()].find(([id]) => id !== e.pointerId)?.[1];
      if (other) {
        const before = Math.hypot(prev.x - other.x, prev.y - other.y);
        const after = Math.hypot(next.x - other.x, next.y - other.y);
        if (before > 0) zoomTo((z) => (z * after) / before);
        panBy((next.x - prev.x) / 2 / side, (next.y - prev.y) / 2 / side);
      }
    } else {
      panBy((next.x - prev.x) / side, (next.y - prev.y) / side);
    }
    map.set(e.pointerId, next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 0.03;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    panBy(m[0], m[1]);
  };

  const handleConfirm = async () => {
    // 1 unité de cadre = minSide / zoom px natifs. Le centre du cadre est à
    // (centre de l'image − décalage).
    const size = minSide / view.zoom;
    const cx = img.naturalWidth / 2 - view.x * size;
    const cy = img.naturalHeight / 2 - view.y * size;
    const blob = await cropSquare(img, {
      x: cx - size / 2,
      y: cy - size / 2,
      size,
    });
    onConfirm(blob);
  };

  const w = baseW * view.zoom;
  const h = baseH * view.zoom;

  return (
    <Dialog open onClose={onCancel} busy={busy} className="max-w-sm">
      <DialogTitle>Recadrer la photo</DialogTitle>

      <div className="mt-4 flex flex-col items-center gap-4 sm:mt-5">
        <div
          ref={frameRef}
          tabIndex={0}
          role="application"
          aria-label="Zone de recadrage : glisse pour déplacer la photo"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className="relative aspect-square w-full max-w-[280px] cursor-grab touch-none select-none overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:cursor-grabbing"
        >
          <img
            src={src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{
              width: `${w * 100}%`,
              height: `${h * 100}%`,
              left: `${(0.5 + view.x - w / 2) * 100}%`,
              top: `${(0.5 + view.y - h / 2) * 100}%`,
            }}
          />
          {/* Masque rond : l'extérieur est assombri, comme hors de l'avatar. */}
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] ring-2 ring-inset ring-white/70" />
        </div>

        <div className="flex w-full max-w-[280px] items-center gap-3">
          <FiZoomOut className="h-4 w-4 shrink-0 text-foreground opacity-50" />
          <Slider
            value={view.zoom}
            onChange={(z) => zoomTo(() => z)}
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            label="Zoom"
          />
          <FiZoomIn className="h-4 w-4 shrink-0 text-foreground opacity-50" />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 sm:mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="button" onClick={handleConfirm} disabled={busy}>
          Appliquer
        </Button>
      </div>
    </Dialog>
  );
};

export default AvatarCropDialog;
