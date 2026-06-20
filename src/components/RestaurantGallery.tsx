import { useRef, useState } from "react";
import { FiPlus, FiTrash2, FiX, FiImage } from "react-icons/fi";
import useRestaurantPhotos, {
  RestaurantPhoto,
} from "@/hooks/useRestaurantPhotos";
import HoldToDeleteButton from "@/components/HoldToDeleteButton";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface Props {
  restaurantId: number;
  userId?: string;
  isAdmin: boolean;
}

/**
 * Galerie de photos d'un restaurant, uploadées par les collaborateurs.
 * Les fichiers sont compressés côté client puis stockés dans le bucket Storage.
 * Chacun peut supprimer ses propres photos ; un admin peut en supprimer
 * n'importe laquelle (modération).
 */
const RestaurantGallery = ({ restaurantId, userId, isAdmin }: Props) => {
  const { data: photos = [], isPending, upload, remove } =
    useRestaurantPhotos(restaurantId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<RestaurantPhoto | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        await upload.mutateAsync(file);
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
    if (inputRef.current) inputRef.current.value = "";
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

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          <FiPlus className="h-4 w-4" />
          {upload.isPending ? "Envoi…" : "Ajouter une photo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo) => {
            const canDelete = isAdmin || photo.user_id === userId;
            return (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
              >
                <button
                  type="button"
                  onClick={() => setLightbox(photo)}
                  className="h-full w-full"
                >
                  <img
                    src={photo.url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </button>
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
    </section>
  );
};

export default RestaurantGallery;
