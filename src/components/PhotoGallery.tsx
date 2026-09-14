import { useCallback, useEffect, useState } from "react";
import {
  FiTrash2,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiCheck,
} from "react-icons/fi";
import { RestaurantPhoto } from "@/hooks/useRestaurantPhotos";
import useReactions from "@/hooks/useReactions";
import EmojiReactions from "@/components/EmojiReactions";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import ZoomableImage from "@/components/ZoomableImage";
import { PHOTO_CAPTION_MAX } from "@/services/textLimits";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface Props {
  photos: RestaurantPhoto[];
  userId?: string;
  isAdmin: boolean;
  /** Libellé sous la vignette et dans la barre d'infos : l'auteur sur une
   *  fiche resto, le restaurant sur un profil. */
  labelOf: (photo: RestaurantPhoto) => string | null | undefined;
  /** Clic sur ce libellé (ouvrir le profil, ouvrir la fiche…). */
  onLabelClick?: (photo: RestaurantPhoto) => void;
  /** Suppression (auteur, ou admin). Absente = pas de corbeille. */
  onDelete?: (photo: RestaurantPhoto) => Promise<void>;
  /** Descriptif modifié par l'auteur. Absente = pas de crayon. */
  onSetCaption?: (photo: RestaurantPhoto, caption: string) => Promise<void>;
  /** `carousel` : une fenêtre de 3 photos qu'on fait défiler (fiche resto) ;
   *  `grid` : toutes les photos, 3 par ligne, façon Instagram (profil). */
  layout?: "carousel" | "grid";
}

/** Date d'une photo, en toutes lettres (barre d'infos de la visionneuse). */
const formatPhotoDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Carrousel de vignettes + visionneuse (zoom, navigation, descriptif,
 * réactions) : la même galerie sur une fiche restaurant et sur un profil. Ce
 * qui change d'un contexte à l'autre — d'où viennent les photos, ce qu'on
 * écrit dessous, ce qu'on peut y faire — arrive par les props.
 */
const PhotoGallery = ({
  photos,
  userId,
  isAdmin,
  labelOf,
  onLabelClick,
  onDelete,
  onSetCaption,
  layout = "carousel",
}: Props) => {
  const [lightbox, setLightbox] = useState<RestaurantPhoto | null>(null);
  // Édition du descriptif dans la lightbox : null = lecture.
  const [captionDraft, setCaptionDraft] = useState<string | null>(null);
  // Zoom en cours : l'habillage (compteur, flèches, barre d'infos) s'efface
  // pour laisser tout l'écran à la photo. `zoomReset` la remet à plat.
  const [zoomed, setZoomed] = useState(false);
  const [zoomReset, setZoomReset] = useState(0);
  const handleScale = useCallback((s: number) => setZoomed(s > 1.001), []);

  /** Sortie de la visionneuse : on repart d'un état propre. */
  const closeLightbox = () => {
    setLightbox(null);
    setCaptionDraft(null);
    setZoomed(false);
  };

  // La lightbox garde une copie de la photo : après un refetch, on la
  // resynchronise pour afficher la légende fraîchement enregistrée.
  useEffect(() => {
    if (!lightbox) return;
    const fresh = photos.find((p) => p.id === lightbox.id);
    if (fresh && fresh !== lightbox) setLightbox(fresh);
  }, [photos, lightbox]);

  // Rang de la photo ouverte : sert au compteur « 3 / 12 » et aux flèches.
  const lightboxIndex = lightbox
    ? photos.findIndex((p) => p.id === lightbox.id)
    : -1;

  /** Photo précédente / suivante sans repasser par la galerie. */
  const step = (delta: number) => {
    const next = photos[lightboxIndex + delta];
    if (!next) return;
    setCaptionDraft(null);
    setLightbox(next);
  };

  // Clavier : ←/→ pour parcourir, Échap pour sortir. Pendant la saisie d'un
  // descriptif, les flèches appartiennent au champ et Échap annule la saisie.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Échap défait une chose à la fois : la saisie, puis le zoom, puis
        // la visionneuse.
        if (captionDraft !== null) setCaptionDraft(null);
        else if (zoomed) setZoomReset((t) => t + 1);
        else closeLightbox();
        return;
      }
      if (captionDraft !== null) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const i = photos.findIndex((p) => p.id === lightbox.id);
      const next = photos[i + (e.key === "ArrowRight" ? 1 : -1)];
      if (next) setLightbox(next);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox, captionDraft, photos, zoomed]);

  // Réactions emoji sur les photos (éventail sur la vignette, rangée dans la
  // visionneuse).
  const photoReactions = useReactions(
    "photo",
    photos.map((p) => p.id)
  );

  // Carrousel : fenêtre de 3 photos, sauts de 3 (clampés pour rester pleine et
  // atteindre le bord). Flèches masquées aux extrémités.
  const PAGE = 3;
  const [start, setStart] = useState(0);
  const maxStart = Math.max(0, photos.length - PAGE);
  const safeStart = Math.min(start, maxStart);
  // Recale si la liste a rétréci (suppression) ou changé de contexte.
  useEffect(() => {
    if (start !== safeStart) setStart(safeStart);
  }, [start, safeStart]);
  const showLeft = safeStart > 0;
  const showRight = safeStart < maxStart;

  const saveCaption = async (photo: RestaurantPhoto) => {
    if (captionDraft === null || !onSetCaption) return;
    const next = captionDraft.trim();
    setCaptionDraft(null);
    if (next === (photo.caption ?? "")) return;
    try {
      await onSetCaption(photo, next);
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Descriptif non enregistré",
        status: "error",
        duration: 5000,
      });
    }
  };

  const deletePhoto = async (photo: RestaurantPhoto) => {
    if (!onDelete) return;
    try {
      await onDelete(photo);
      setLightbox(null);
      toast({ title: "Photo supprimée", status: "success", duration: 2500 });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Suppression impossible",
        status: "error",
        duration: 5000,
      });
    }
  };

  // Les vignettes, identiques quel que soit l'agencement.
  const thumbnails = photos.map((photo) => {
      const canDelete = !!onDelete && (isAdmin || photo.user_id === userId);
      const reactCounts = photoReactions.summaryFor(photo.id).counts;
      // Emojis uniques présents sur la photo, du plus fréquent au moins fréquent.
      const reactEntries = Object.entries(reactCounts)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1]);
      const reactTotal = reactEntries.reduce((sum, [, n]) => sum + n, 0);
      return (
        <div
          key={photo.id}
          style={
            layout === "carousel"
              ? { flexBasis: "calc((100% - 16px) / 3)" }
              : undefined
          }
          className="group relative aspect-square shrink-0 overflow-hidden rounded-xl border border-border bg-muted"
        >
          <button
            type="button"
            onClick={() => setLightbox(photo)}
            className="absolute inset-0 h-full w-full"
          >
            <img
              src={photo.url}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          </button>
          {/* Éventail des emojis présents (plus fréquent en avant) + total */}
          {reactTotal > 0 && (
            <span className="pointer-events-none absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <span className="flex items-center">
                {reactEntries.map(([emoji], i) => (
                  <span
                    key={emoji}
                    className="relative inline-block text-base leading-none"
                    style={{
                      marginLeft: i === 0 ? 0 : "-4px",
                      zIndex: reactEntries.length - i,
                    }}
                  >
                    {emoji}
                  </span>
                ))}
              </span>
              {reactTotal}
            </span>
          )}
          {/* Voile, libellé (auteur ou resto) et descriptif : rien au
              repos, tout monte en fondu au survol — la photo reste
              seule à l'écran tant qu'on ne s'y intéresse pas. */}
          {(photo.caption || labelOf(photo)) && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-3 flex-col gap-0.5 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-2.5 pb-2 pt-8 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
              {labelOf(photo) && (
                <span className="truncate text-[11px] text-white/80 drop-shadow">
                  {labelOf(photo)}
                </span>
              )}
              {photo.caption && (
                <span className="truncate text-xs font-medium text-white drop-shadow">
                  {photo.caption}
                </span>
              )}
            </div>
          )}
          {canDelete && (
            <HoldToDeleteButton
              onConfirm={() => deletePhoto(photo)}
              className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
              progressClassName="bg-destructive/70"
            >
              <FiTrash2 className="h-4 w-4" />
            </HoldToDeleteButton>
          )}
        </div>
      );
  });

  return (
    <>
      {layout === "grid" ? (
        <div className="grid grid-cols-3 gap-2">{thumbnails}</div>
      ) : (
      <div className="relative">
        {showLeft && (
          <button
            type="button"
            aria-label="Photos précédentes"
            onClick={() => setStart(Math.max(0, safeStart - PAGE))}
            className="absolute left-0 top-1/2 z-10 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-foreground/70 shadow-md transition hover:text-primary"
          >
            <FiChevronLeft className="h-5 w-5" />
          </button>
        )}
        {showRight && (
          <button
            type="button"
            aria-label="Photos suivantes"
            onClick={() => setStart(Math.min(maxStart, safeStart + PAGE))}
            className="absolute right-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 translate-x-1/2 place-items-center rounded-full border border-border bg-card text-foreground/70 shadow-md transition hover:text-primary"
          >
            <FiChevronRight className="h-5 w-5" />
          </button>
        )}
        {/* Piste glissante : toutes les photos sont rendues côte à côte ;
            on translate la bande (transition CSS) d'une fenêtre de 3. Chaque
            item fait 1/3 de la largeur visible (2 gaps de 8px). */}
        <div className="overflow-hidden">
        <div
          className="flex gap-2 will-change-transform"
          style={{
            transform: `translateX(calc(${safeStart} * ((16px - 100%) / 3 - 8px)))`,
            transition: "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
        {thumbnails}
        </div>
        </div>
      </div>
      )}

      {/* Visionneuse : l'image au centre, tout le reste dans une barre en
          dessous — rien ne recouvre la photo. */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[1000] flex flex-col bg-black/85"
          onClick={closeLightbox}
        >
          {/* Barre du haut : rang de la photo et fermeture. */}
          <div
            className={cn(
              "flex shrink-0 items-center justify-between px-4 py-3 transition-opacity duration-200",
              zoomed && "pointer-events-none opacity-0"
            )}
          >
            <span className="text-sm font-medium tabular-nums text-white/70">
              {lightboxIndex + 1} / {photos.length}
            </span>
            <button
              type="button"
              aria-label="Fermer"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
              onClick={closeLightbox}
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Image + flèches de navigation. */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16">
            {lightboxIndex > 0 && (
              <button
                type="button"
                aria-label="Photo précédente"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className={cn(
                  "absolute left-1 z-[1] grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30 sm:left-4",
                  zoomed && "pointer-events-none opacity-0"
                )}
              >
                <FiChevronLeft className="h-6 w-6" />
              </button>
            )}
            {/* Molette / pincement / double clic pour zoomer. */}
            <ZoomableImage
              key={lightbox.id}
              src={lightbox.url}
              onScaleChange={handleScale}
              resetToken={zoomReset}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />
            {lightboxIndex < photos.length - 1 && (
              <button
                type="button"
                aria-label="Photo suivante"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className={cn(
                  "absolute right-1 z-[1] grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30 sm:right-4",
                  zoomed && "pointer-events-none opacity-0"
                )}
              >
                <FiChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Barre d'infos : libellé, date, descriptif, réactions. */}
          <div
            className={cn(
              "shrink-0 border-t border-white/10 bg-black/60 px-4 py-3 backdrop-blur-sm transition-opacity duration-200 sm:px-6",
              zoomed && "pointer-events-none opacity-0"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
              <div className="flex items-baseline gap-2 text-xs text-white/55">
                {labelOf(lightbox) &&
                  (onLabelClick ? (
                    <button
                      type="button"
                      onClick={() => onLabelClick(lightbox)}
                      className="cursor-pointer font-medium text-white/85 underline-offset-2 hover:text-white hover:underline"
                    >
                      {labelOf(lightbox)}
                    </button>
                  ) : (
                    <span className="font-medium text-white/85">
                      {labelOf(lightbox)}
                    </span>
                  ))}
                <span>{formatPhotoDate(lightbox.created_at)}</span>
              </div>

              {/* Descriptif en clair, sur toute la largeur. Le crayon
                  n'apparaît que pour l'auteur. */}
              {(() => {
                // Seul l'auteur retouche sa légende (un admin peut encore le
                // faire en base, pour la modération, mais pas d'ici).
                const canEdit = !!onSetCaption && lightbox.user_id === userId;
                if (captionDraft !== null) {
                  return (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={captionDraft}
                        maxLength={PHOTO_CAPTION_MAX}
                        placeholder="Nom du plat, contexte…"
                        onChange={(e) => setCaptionDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveCaption(lightbox);
                        }}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-white/25 bg-white/10 px-3 text-sm text-white outline-none transition placeholder:text-white/40 focus-visible:border-white/50"
                      />
                      <span className="shrink-0 text-xs tabular-nums text-white/40">
                        {captionDraft.length}/{PHOTO_CAPTION_MAX}
                      </span>
                      <button
                        type="button"
                        aria-label="Enregistrer"
                        onClick={() => saveCaption(lightbox)}
                        className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
                      >
                        <FiCheck className="h-4 w-4" />
                      </button>
                    </div>
                  );
                }
                if (!lightbox.caption && !canEdit) return null;
                return (
                  // Sans descriptif, rien à lire : l'auteur n'a que le crayon,
                  // les autres ne voient pas la ligne du tout.
                  <div className="flex items-start gap-2">
                    {lightbox.caption && (
                      <p className="m-0 min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-white">
                        {lightbox.caption}
                      </p>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        aria-label={
                          lightbox.caption
                            ? "Modifier le descriptif"
                            : "Ajouter un descriptif"
                        }
                        title={
                          lightbox.caption
                            ? "Modifier le descriptif"
                            : "Ajouter un descriptif"
                        }
                        onClick={() => setCaptionDraft(lightbox.caption ?? "")}
                        className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-white/70 transition hover:bg-white/15 hover:text-white"
                      >
                        <FiEdit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Réactions : chacun peut réagir à toutes les photos, la
                  sienne comprise. */}
              <EmojiReactions
                summary={photoReactions.summaryFor(lightbox.id)}
                onToggle={(emoji) => photoReactions.toggle(lightbox.id, emoji)}
                disabled={!photoReactions.canReact}
                onDark
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoGallery;
