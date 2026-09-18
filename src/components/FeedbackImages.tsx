import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import ZoomableImage from "@/components/ZoomableImage";
import { feedbackImageUrl } from "@/services/uploadImage";
import { cn } from "@/lib/utils";

interface Props {
  /** Chemins dans le bucket `feedback-images`. */
  paths: string[];
  /** Vignettes plus petites (historique des versions). */
  compact?: boolean;
  className?: string;
}

/**
 * Images jointes à une demande : une rangée de vignettes, et une visionneuse
 * zoomable au clic — la même que celle des photos de restos, sans la carte
 * d'infos (une capture d'écran n'a ni auteur ni descriptif à montrer).
 *
 * La visionneuse est rendue dans un portail au-dessus de la popup de lecture
 * (z-index supérieur à celui du Dialog) ; Échap dézoome d'abord, puis ferme.
 */
const FeedbackImages = ({ paths, compact = false, className }: Props) => {
  const [index, setIndex] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  const close = () => {
    setIndex(null);
    setZoomed(false);
  };
  const step = (delta: number) =>
    setIndex((i) =>
      i === null ? null : (i + delta + paths.length) % paths.length
    );

  // Clavier : ←/→ pour passer d'une image à l'autre, Échap défait une chose à
  // la fois (zoom, puis visionneuse). `stopPropagation` pour que le Dialog en
  // dessous ne se ferme pas sur le même Échap.
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (zoomed) setResetToken((t) => t + 1);
        else close();
      } else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    // Capture : on passe AVANT l'écouteur du Dialog.
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, zoomed, paths.length]);

  if (paths.length === 0) return null;

  return (
    <>
      <ul
        className={cn("m-0 flex list-none flex-wrap gap-2 p-0", className)}
      >
        {paths.map((path, i) => (
          <li key={path}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Image ${i + 1} sur ${paths.length}`}
              className={cn(
                "block cursor-pointer overflow-hidden rounded-lg bg-muted ring-1 ring-border transition hover:ring-primary/60",
                compact ? "h-14 w-14" : "h-20 w-20"
              )}
            >
              <img
                src={feedbackImageUrl(path)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      {index !== null &&
        createPortal(
          <div
            className="tw-scope fixed inset-0 z-[1200] flex flex-col bg-black/85"
            onClick={close}
          >
            <div
              className={cn(
                "flex shrink-0 items-center justify-between px-4 py-3 transition-opacity duration-200",
                zoomed && "pointer-events-none opacity-0"
              )}
            >
              <span className="text-sm font-medium tabular-nums text-white/70">
                {index + 1} / {paths.length}
              </span>
              <button
                type="button"
                aria-label="Fermer"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
                onClick={close}
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4 sm:px-16">
              {paths.length > 1 && index > 0 && (
                <button
                  type="button"
                  aria-label="Image précédente"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(-1);
                  }}
                  className={cn(
                    "absolute left-1 z-[1] flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30 sm:left-4",
                    zoomed && "pointer-events-none opacity-0"
                  )}
                >
                  <FiChevronLeft className="h-6 w-6" />
                </button>
              )}
              <ZoomableImage
                key={paths[index]}
                src={feedbackImageUrl(paths[index])}
                resetToken={resetToken}
                onScaleChange={(s) => setZoomed(s > 1)}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
              {paths.length > 1 && index < paths.length - 1 && (
                <button
                  type="button"
                  aria-label="Image suivante"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(1);
                  }}
                  className={cn(
                    "absolute right-1 z-[1] flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30 sm:right-4",
                    zoomed && "pointer-events-none opacity-0"
                  )}
                >
                  <FiChevronRight className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default FeedbackImages;
