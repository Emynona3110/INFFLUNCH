import { useEffect, useState } from "react";
import {
  FiPlus,
  FiTrash2,
  FiX,
  FiImage,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import useRestaurantPhotos, {
  RestaurantPhoto,
} from "@/hooks/useRestaurantPhotos";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import PhotoUploadDialog from "@/components/PhotoUploadDialog";
import { toast } from "@/lib/toast";
import { formatAuthorName } from "@/utils/authorName";
import { cn } from "@/lib/utils";

interface Props {
  restaurantId: number;
  slug: string;
  userId?: string;
  isAdmin: boolean;
}

/**
 * Galerie de photos d'un restaurant, uploadées par les collaborateurs.
 * Les fichiers sont compressés côté client puis stockés dans le bucket Storage.
 * Chacun peut supprimer ses propres photos ; un admin peut en supprimer
 * n'importe laquelle (modération).
 */
const RestaurantGallery = ({ restaurantId, slug, userId, isAdmin }: Props) => {
  const { data: photos = [], isPending, upload, remove } =
    useRestaurantPhotos(restaurantId, slug);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightbox, setLightbox] = useState<RestaurantPhoto | null>(null);

  // Carrousel : fenêtre de 3 photos, sauts de 3 (clampés pour rester pleine et
  // atteindre le bord). Flèches masquées aux extrémités.
  const PAGE = 3;
  const [start, setStart] = useState(0);
  const maxStart = Math.max(0, photos.length - PAGE);
  const safeStart = Math.min(start, maxStart);
  // Recale si la liste a rétréci (suppression) ou changé de resto.
  useEffect(() => {
    if (start !== safeStart) setStart(safeStart);
  }, [start, safeStart]);
  const showLeft = safeStart > 0;
  const showRight = safeStart < maxStart;

  // 1 photo par personne et par restaurant, sauf les admins (aligné sur le
  // trigger en base). On masque alors le bouton et on guide l'utilisateur.
  const hasOwnPhoto = photos.some((p) => p.user_id === userId);
  const canUpload = isAdmin || !hasOwnPhoto;

  const handleUpload = async (files: File[], authorId?: string) => {
    let ok = 0;
    for (const file of files) {
      try {
        await upload.mutateAsync({ file, authorId });
        ok++;
      } catch (e: any) {
        toast({
          title: "Échec de l'envoi",
          description: e?.message ?? "Erreur inconnue",
          status: "error",
          duration: 5000,
        });
      }
    }
    if (ok > 0) {
      toast({
        title: ok > 1 ? `${ok} photos ajoutées` : "Photo ajoutée",
        status: "success",
        duration: 2500,
      });
    }
  };

  const deletePhoto = async (photo: RestaurantPhoto) => {
    try {
      await remove.mutateAsync(photo);
      setLightbox(null);
      toast({ title: "Photo supprimée", status: "success", duration: 2500 });
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Suppression impossible",
        status: "error",
        duration: 5000,
      });
    }
  };

  return (
    <section className="rounded-card border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="heading"
          aria-level={2}
          className="font-display text-lg font-bold text-card-foreground"
        >
          Photos
          {photos.length > 0 && (
            <span className="ml-2 text-sm font-medium text-foreground/45">
              ({photos.length})
            </span>
          )}
        </div>

        {canUpload ? (
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            <FiPlus className="h-4 w-4" />
            Ajouter une photo
          </button>
        ) : (
          <span className="text-xs text-foreground/45">
            Tu as déjà partagé une photo ici.
          </span>
        )}
      </div>

      {isPending ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-foreground/50">
          <FiImage className="h-8 w-8" />
          <p className="text-sm">
            Aucune photo pour le moment. Partage la première !
          </p>
        </div>
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
          {photos.map((photo) => {
            const canDelete = isAdmin || photo.user_id === userId;
            return (
              <div
                key={photo.id}
                style={{ flexBasis: "calc((100% - 16px) / 3)" }}
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
                {/* Auteur au survol */}
                {photo.email && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-1.5 pt-6 opacity-0 transition group-hover:opacity-100">
                    <span className="text-xs font-medium text-white drop-shadow">
                      {formatAuthorName(photo.email)}
                    </span>
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
          })}
          </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Fermer"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
            onClick={() => setLightbox(null)}
          >
            <FiX className="h-5 w-5" />
          </button>
          <img
            src={lightbox.url}
            alt=""
            className={cn(
              "max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
            )}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <PhotoUploadDialog
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        isAdmin={isAdmin}
        onSubmit={handleUpload}
      />
    </section>
  );
};

export default RestaurantGallery;
