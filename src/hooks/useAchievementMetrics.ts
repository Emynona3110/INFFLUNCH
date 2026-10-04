import { useQuery } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useSession from "./useSession";

export interface AchievementMetrics {
  reviews: number;
  photos: number;
  favorites: number;
  /** Restaurants dont l'utilisateur a déclaré le prix (une par resto). */
  prices: number;
  /** Nombre de photos DIFFÉRENTES sur lesquelles l'utilisateur a réagi. */
  reactionsGivenDistinct: number;
  /** Emojis DIFFÉRENTS que l'utilisateur a posés (photos ET avis confondus). */
  reactionEmojisDistinct: number;
  /** Réactions reçues (par d'autres) sur les photos de l'utilisateur. */
  reactionsReceived: number;
  /** Jours de connexion consécutifs (renvoyé par touch_login). */
  loginStreak: number;
  /** Jours ouvrés consécutifs avec un midi déclaré (rpc lunch_streak). */
  lunchStreak: number;
}

/**
 * Compteurs de contribution/assiduité de l'utilisateur, lus EN BASE. Ils
 * servent deux fois : aux déclencheurs de succès (paliers atteints) et à la
 * popup d'un succès (progression « 12 / 20 »). Une seule requête partagée.
 *
 * Les mutations concernées (avis, photos, favoris, réactions, midis)
 * invalident ["achievement-metrics"] pour un déblocage immédiat après l'action.
 */
const useAchievementMetrics = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;

  return useQuery<AchievementMetrics, Error>({
    queryKey: ["achievement-metrics", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [reviews, photos, favorites, prices] = await Promise.all([
        supabaseClient
          .from("reviews")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        supabaseClient
          .from("restaurant_photos")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        supabaseClient
          .from("favorites")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        // La RLS de restaurant_prices ne laisse voir que ses propres
        // déclarations ; le filtre explicite garde la requête lisible.
        supabaseClient
          .from("restaurant_prices")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

      // Réactions données par l'utilisateur, en une requête pour deux mesures :
      // les PHOTOS distinctes sur lesquelles il a réagi (ses propres photos
      // comptent : « Jamais mieux servi que par soi-même » y invite), et les EMOJIS distincts qu'il a
      // posés — ceux-là sur les avis aussi, réagir reste réagir.
      const { data: given } = await supabaseClient
        .from("reactions")
        .select("target_type, target_id, emoji")
        .eq("user_id", userId);
      const reactionsGivenDistinct = new Set(
        (given ?? [])
          .filter((r) => r.target_type === "photo")
          .map((r) => r.target_id as number),
      ).size;
      const reactionEmojisDistinct = new Set(
        (given ?? []).map((r) => r.emoji as string),
      ).size;

      // Réactions reçues sur MES photos (par d'autres utilisateurs).
      const { data: myPhotos } = await supabaseClient
        .from("restaurant_photos")
        .select("id")
        .eq("user_id", userId);
      const myPhotoIds = (myPhotos ?? []).map((p) => p.id as number);
      let reactionsReceived = 0;
      if (myPhotoIds.length) {
        const { count } = await supabaseClient
          .from("reactions")
          .select("*", { count: "exact", head: true })
          .eq("target_type", "photo")
          .in("target_id", myPhotoIds)
          .neq("user_id", userId as string);
        reactionsReceived = count ?? 0;
      }

      // Streak de connexion : enregistre le jour courant et renvoie le streak.
      const { data: streak } = await supabaseClient.rpc("touch_login");
      // Série de midis déclarés (« Qui déjeune où »), jours ouvrés seulement.
      const { data: lunchStreak } = await supabaseClient.rpc("lunch_streak", {
        target: userId,
      });

      return {
        reviews: reviews.count ?? 0,
        photos: photos.count ?? 0,
        favorites: favorites.count ?? 0,
        prices: prices.count ?? 0,
        reactionsGivenDistinct,
        reactionEmojisDistinct,
        reactionsReceived,
        loginStreak: (streak as number | null) ?? 0,
        lunchStreak: (lunchStreak as number | null) ?? 0,
      };
    },
  });
};

export default useAchievementMetrics;
