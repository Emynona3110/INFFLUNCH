import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import { AchievementId } from "@/data/achievements";
import { PHOTOS_BUCKET } from "../services/storagePaths";
import { RestaurantPhoto } from "./useRestaurantPhotos";

export interface PublicProfile {
  email: string | null;
  avatar_path: string | null;
  /** Date d'inscription (auth.users.created_at). */
  member_since: string;
  reviews_count: number;
  photos_count: number;
  achievements: { achievement_id: AchievementId; unlocked_at: string }[];
}

/** Photo d'un profil : la même chose qu'en galerie resto, plus son restaurant
 *  (null si la fiche est invisible pour l'appelant — non géocodée, admins). */
export interface PublicPhoto extends RestaurantPhoto {
  restaurant: { name: string; slug: string } | null;
}

/**
 * Profil public d'un collaborateur : fiche (RPC `public_profile`, SECURITY
 * DEFINER — voir `sql/2026-09-14_public_profile.sql`) et ses photos, lues
 * directement (la RLS des photos est déjà ouverte à tous). Un resto invisible
 * pour l'appelant (non géocodé, réservé aux admins) revient sans `restaurant`.
 */
const usePublicProfile = (userId: string | null) => {
  const queryClient = useQueryClient();
  const profile = useQuery<PublicProfile, Error>({
    queryKey: ["public-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .rpc("public_profile", { target: userId })
        .single();
      if (error) throw new Error(error.message);
      return data as PublicProfile;
    },
  });

  const photosKey = ["public-profile-photos", userId];
  const photos = useQuery<PublicPhoto[], Error>({
    queryKey: photosKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("restaurant_photos")
        .select(
          "id, restaurant_id, user_id, storage_path, width, height, created_at, caption, restaurants(name, slug)"
        )
        .eq("user_id", userId as string)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      // L'email de l'auteur est celui du profil : une seule requête suffit.
      const { data: user } = await supabaseClient
        .from("users")
        .select("email")
        .eq("id", userId as string)
        .maybeSingle();
      return (data ?? []).map((row) => {
        const { restaurants, ...r } = row as unknown as Omit<
          RestaurantPhoto,
          "url" | "email"
        > & { restaurants: { name: string; slug: string } | null };
        return {
          ...r,
          url: supabaseClient.storage.from(PHOTOS_BUCKET).getPublicUrl(r.storage_path)
            .data.publicUrl,
          email: (user?.email as string | null) ?? null,
          restaurant: restaurants,
        };
      });
    },
  });

  // Ses propres photos se gèrent aussi depuis son profil : suppression et
  // descriptif, mêmes écritures que sur la fiche resto, mais ce sont les
  // caches du profil qu'on rafraîchit (liste et compteur).
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: photosKey });
    queryClient.invalidateQueries({ queryKey: ["public-profile", userId] });
    queryClient.invalidateQueries({ queryKey: ["restaurant-photos"] });
  };

  const remove = useMutation({
    mutationFn: async (photo: RestaurantPhoto) => {
      const { error } = await supabaseClient
        .from("restaurant_photos")
        .delete()
        .eq("id", photo.id);
      if (error) throw new Error(error.message);
      await supabaseClient.storage.from(PHOTOS_BUCKET).remove([photo.storage_path]);
    },
    onSuccess: invalidate,
  });

  const setCaption = useMutation({
    mutationFn: async ({ id, caption }: { id: number; caption: string }) => {
      const { error } = await supabaseClient
        .from("restaurant_photos")
        .update({ caption: caption.trim() || null })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  return { profile, photos, remove, setCaption };
};

export default usePublicProfile;
