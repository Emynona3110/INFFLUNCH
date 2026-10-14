import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import { patchQueries, rollbackQueries, settleWhenIdle } from "../lib/optimistic";
import { compressImage } from "../utils/imageCompress";
import { PHOTOS_BUCKET, galleryPathBase } from "../services/storagePaths";

export interface RestaurantPhoto {
  id: number;
  restaurant_id: number;
  /** Null = auteur anonymisé (compte supprimé, contribution conservée). */
  user_id: string | null;
  storage_path: string;
  width: number | null;
  height: number | null;
  created_at: string;
  /** Descriptif facultatif (nom du plat…), ≤ 120 caractères. */
  caption: string | null;
  /** URL publique du fichier dans le bucket. */
  url: string;
  /** Email de l'auteur (jointure public.users), pour l'attribution. */
  email: string | null;
}

const publicUrl = (path: string) =>
  supabaseClient.storage.from(PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;

/** Photos d'un restaurant : options partagées par le hook et le préchargement au
 *  survol (usePrefetch). */
export const restaurantPhotosQueryOptions = (restaurantId: number | undefined) =>
  queryOptions<RestaurantPhoto[], Error>({
    queryKey: ["restaurant-photos", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("restaurant_photos")
        .select("id, restaurant_id, user_id, storage_path, width, height, created_at, caption")
        .eq("restaurant_id", restaurantId as number)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);

      const rows = data ?? [];
      const ids = [
        ...new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id)),
      ];

      let emailById: Record<string, string> = {};
      if (ids.length) {
        const { data: users } = await supabaseClient
          .from("users")
          .select("id, email")
          .in("id", ids);
        emailById = Object.fromEntries(
          (users ?? []).map((u) => [u.id as string, u.email as string])
        );
      }

      return rows.map((r) => ({
        ...r,
        url: publicUrl(r.storage_path),
        email: r.user_id ? (emailById[r.user_id] ?? null) : null,
      }));
    },
  });

/** Patches optimistes d'une photo dans TOUS les caches qui la montrent
 *  (galerie de la fiche, photos d'un profil). `next` null = supprimée. */
export const photoPatches = (
  id: number,
  next: ((p: RestaurantPhoto) => RestaurantPhoto) | null
): Parameters<typeof patchQueries>[1] =>
  [["restaurant-photos"], ["public-profile-photos"]].map((key) => [
    key,
    (prev: RestaurantPhoto[]) =>
      next
        ? prev.map((p) => (p.id === id ? next(p) : p))
        : prev.filter((p) => p.id !== id),
  ]);

/**
 * Photos d'un restaurant (galerie collaborateurs), de la plus récente à la plus
 * ancienne. Les binaires vivent dans le bucket Storage ; la table
 * restaurant_photos ne porte que les métadonnées. Comme reviews, pas de FK
 * directe vers public.users → jointure manuelle pour l'email de l'auteur.
 */
const useRestaurantPhotos = (
  restaurantId: number | undefined,
  slug?: string
) => {
  const queryClient = useQueryClient();
  const key = ["restaurant-photos", restaurantId];

  const query = useQuery(restaurantPhotosQueryOptions(restaurantId));

  const upload = useMutation({
    mutationFn: async ({
      file,
      authorId,
      caption,
    }: {
      file: File;
      /** Admin : attribuer la photo à un autre user_id. Défaut = auteur courant. */
      authorId?: string;
      /** Descriptif saisi à l'envoi (facultatif). */
      caption?: string;
    }) => {
      if (!restaurantId || !slug) throw new Error("Restaurant inconnu");
      if (!file.type.startsWith("image/")) {
        throw new Error("Le fichier doit être une image");
      }

      const { blob, width, height, ext } = await compressImage(file);
      const path = `${galleryPathBase(slug)}.${ext}`;

      const { error: upErr } = await supabaseClient.storage
        .from(PHOTOS_BUCKET)
        .upload(path, blob, { contentType: `image/${ext}`, upsert: false });
      if (upErr) throw new Error(upErr.message);

      const { error: insErr } = await supabaseClient
        .from("restaurant_photos")
        .insert({
          restaurant_id: restaurantId,
          storage_path: path,
          width,
          height,
          caption: caption?.trim() || null,
          // Si non fourni : la colonne prend son défaut auth.uid() (auteur courant).
          ...(authorId ? { user_id: authorId } : {}),
        });
      if (insErr) {
        // L'insert métadonnée a échoué → on nettoie le fichier orphelin.
        await supabaseClient.storage.from(PHOTOS_BUCKET).remove([path]);
        throw new Error(insErr.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ["achievement-metrics"] });
    },
  });

  // Suppression et légende optimistes (src/lib/optimistic.ts).
  const writes = {
    mutationKey: ["photos-write"],
    scope: { id: "photos-write" },
    onError: (
      _e: Error,
      _v: unknown,
      context?: Awaited<ReturnType<typeof patchQueries>>
    ) => rollbackQueries(queryClient, context),
    onSettled: () =>
      settleWhenIdle(queryClient, ["photos-write"], () => {
        queryClient.invalidateQueries({ queryKey: ["restaurant-photos"] });
        queryClient.invalidateQueries({ queryKey: ["public-profile-photos"] });
        queryClient.invalidateQueries({ queryKey: ["public-profile"] });
      }),
  };

  const remove = useMutation({
    ...writes,
    onMutate: (photo: RestaurantPhoto) =>
      patchQueries(queryClient, photoPatches(photo.id, null)),
    mutationFn: async (photo: RestaurantPhoto) => {
      const { error } = await supabaseClient
        .from("restaurant_photos")
        .delete()
        .eq("id", photo.id);
      if (error) throw new Error(error.message);
      // Suppression du fichier (best effort : la ligne est déjà partie).
      await supabaseClient.storage.from(PHOTOS_BUCKET).remove([photo.storage_path]);
    },
  });

  /** Légende modifiée après coup (auteur ou admin — la RLS tranche, et le
   *  trigger n'autorise que cette colonne). */
  const setCaption = useMutation({
    ...writes,
    onMutate: ({ id, caption }: { id: number; caption: string }) =>
      patchQueries(
        queryClient,
        photoPatches(id, (p) => ({ ...p, caption: caption.trim() || null }))
      ),
    mutationFn: async ({ id, caption }: { id: number; caption: string }) => {
      const { error } = await supabaseClient
        .from("restaurant_photos")
        .update({ caption: caption.trim() || null })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
  });

  return { ...query, upload, remove, setCaption };
};

export default useRestaurantPhotos;
