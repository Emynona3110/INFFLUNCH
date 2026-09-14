import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiImage } from "react-icons/fi";
import useRestaurantPhotos from "@/hooks/useRestaurantPhotos";
import PhotoUploadDialog, { PickedPhoto } from "@/components/PhotoUploadDialog";
import PhotoGallery from "@/components/PhotoGallery";
import { formatAuthorName } from "@/utils/authorName";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface Props {
  restaurantId: number;
  slug: string;
  userId?: string;
  isAdmin: boolean;
  /** false = restaurant verrouillé : plus de nouvelle photo (l'existant reste). */
  canContribute?: boolean;
  /** Classes de placement : portées par la section elle-même pour qu'elle ne
   *  laisse aucun vide dans la grille quand elle ne s'affiche pas. */
  className?: string;
}

/**
 * Galerie de photos d'un restaurant, uploadées par les collaborateurs.
 * Les fichiers sont compressés côté client puis stockés dans le bucket Storage.
 * Chacun peut supprimer ses propres photos ; un admin peut en supprimer
 * n'importe laquelle (modération).
 */
/** Photos qu'un non-admin peut ajouter sur une même fiche (miroir du trigger). */
export const MAX_PHOTOS_PER_USER = 3;

const RestaurantGallery = ({
  restaurantId,
  slug,
  userId,
  isAdmin,
  canContribute = true,
  className,
}: Props) => {
  const { data: photos = [], isPending, upload, remove, setCaption } =
    useRestaurantPhotos(restaurantId, slug);
  const [uploadOpen, setUploadOpen] = useState(false);
  const navigate = useNavigate();
  // MAX_PHOTOS_PER_USER photos par personne et par restaurant, sauf les admins
  // (aligné sur le trigger en base, cf. sql/2026-09-03_photos_limite_3.sql). Le
  // quota restant borne aussi la sélection dans le dialog d'envoi.
  const ownPhotos = photos.filter((p) => p.user_id === userId).length;
  const remaining = Math.max(0, MAX_PHOTOS_PER_USER - ownPhotos);
  const canUpload = canContribute && (isAdmin || remaining > 0);

  const handleUpload = async (items: PickedPhoto[], authorId?: string) => {
    let ok = 0;
    for (const { file, caption } of items) {
      try {
        await upload.mutateAsync({ file, authorId, caption });
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

  // Contributions bloquées et aucune photo : la section n'a plus rien à dire.
  if (!canContribute && !isPending && photos.length === 0) return null;

  return (
    <section
      className={cn("rounded-card border border-border bg-card p-5", className)}
    >
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
        ) : canContribute ? (
          <span className="text-xs text-foreground/45">
            Tu as déjà partagé {MAX_PHOTOS_PER_USER} photos ici.
          </span>
        ) : null}
      </div>

      {isPending ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-foreground/50">
          <FiImage className="h-8 w-8 text-foreground opacity-50" />
          <p className="text-sm">
            Aucune photo pour le moment. Partage la première !
          </p>
        </div>
      ) : (
        <PhotoGallery
          photos={photos}
          userId={userId}
          isAdmin={isAdmin}
          // Sous chaque photo : qui l'a prise, et un clic mène à son profil.
          labelOf={(photo) => (photo.email ? formatAuthorName(photo.email) : null)}
          onLabelClick={(photo) => navigate(`/profil/${photo.user_id}`)}
          onDelete={(photo) => remove.mutateAsync(photo)}
          onSetCaption={(photo, caption) =>
            setCaption.mutateAsync({ id: photo.id, caption })
          }
        />
      )}

      <PhotoUploadDialog
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        isAdmin={isAdmin}
        /* Admin non borné ; sinon ce qu'il reste du quota sur cette fiche. */
        maxFiles={isAdmin ? undefined : remaining}
        onSubmit={handleUpload}
      />
    </section>
  );
};

export default RestaurantGallery;
