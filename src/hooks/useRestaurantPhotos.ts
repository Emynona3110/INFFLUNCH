import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import { compressImage } from "../utils/imageCompress";

export const PHOTOS_BUCKET = "restaurant-photos";

export interface RestaurantPhoto {
  id: number;
  restaurant_id: number;
  user_id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  created_at: string;
  /** URL publique du fichier dans le bucket. */
  url: string;
  /** Email de l'auteur (jointure public.users), pour l'attribution. */
  email: string | null;
}

const publicUrl = (path: string) =>
  supabaseClient.storage.from(PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;

/**
 * Photos d'un restaurant (galerie collaborateurs), de la plus récente à la plus
 * ancienne. Les binaires vivent dans le bucket Storage ; la table
 * restaurant_photos ne porte que les métadonnées. Comme reviews, pas de FK
 * directe vers public.users → jointure manuelle pour l'email de l'auteur.
 */
const useRestaurantPhotos = (restaurantId: number | undefined) => {
  const queryClient = useQueryClient();
  const key = ["restaurant-photos", restaurantId];

  const query = useQuery<RestaurantPhoto[], Error>({
    queryKey: key,
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("restaurant_photos")
        .select("id, restaurant_id, user_id, storage_path, width, height, created_at")
        .eq("restaurant_id", restaurantId as number)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);

      const rows = data ?? [];
      const ids = [...new Set(rows.map((r) => r.user_id))];

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
        email: emailById[r.user_id] ?? null,
      }));
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!restaurantId) throw new Error("Restaurant inconnu");
      if (!file.type.startsWith("image/")) {
        throw new Error("Le fichier doit être une image");
      }

      const { blob, width, height, ext } = await compressImage(file);
      const path = `${restaurantId}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabaseClient.storage
        .from(PHOTOS_BUCKET)
        .upload(path, blob, { contentType: `image/${ext}`, upsert: false });
      if (upErr) throw new Error(upErr.message);

      const { error: insErr } = await supabaseClient
        .from("restaurant_photos")
        .insert({ restaurant_id: restaurantId, storage_path: path, width, height });
      if (insErr) {
        // L'insert métadonnée a échoué → on nettoie le fichier orphelin.
        await supabaseClient.storage.from(PHOTOS_BUCKET).remove([path]);
        throw new Error(insErr.message);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (photo: RestaurantPhoto) => {
      const { error } = await supabaseClient
        .from("restaurant_photos")
        .delete()
        .eq("id", photo.id);
      if (error) throw new Error(error.message);
      // Suppression du fichier (best effort : la ligne est déjà partie).
      await supabaseClient.storage.from(PHOTOS_BUCKET).remove([photo.storage_path]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return { ...query, upload, remove };
};

export default useRestaurantPhotos;
