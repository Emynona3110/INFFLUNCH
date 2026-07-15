import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useSession from "./useSession";
import useAchievements from "./useAchievements";
import { ACHIEVEMENTS, AchievementId } from "@/data/achievements";

interface Metrics {
  reviews: number;
  photos: number;
  favorites: number;
  /** Nombre de photos DIFFÉRENTES sur lesquelles l'utilisateur a réagi. */
  reactionsGivenDistinct: number;
  /** Réactions reçues (par d'autres) sur les photos de l'utilisateur. */
  reactionsReceived: number;
  /** Jours de connexion consécutifs (renvoyé par touch_login). */
  loginStreak: number;
}

/**
 * Déblocage des succès de contribution/assiduité. Monté une seule fois pour tout
 * l'app (cf. AchievementTriggers dans Wrapper). On compte les métriques de
 * l'utilisateur EN BASE (rétroactif : les contributions déjà faites débloquent
 * immédiatement) et on débloque les paliers atteints. `unlock` est idempotent,
 * donc appeler à chaque render est sans effet une fois le succès obtenu.
 *
 * Les mutations concernées (avis, photos, favoris, réactions) invalident la clé
 * ["achievement-metrics"] pour un déblocage immédiat après l'action.
 */
const useAchievementTriggers = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const { unlock, unlockedIds } = useAchievements();

  const { data: metrics } = useQuery<Metrics, Error>({
    queryKey: ["achievement-metrics", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [reviews, photos, favorites] = await Promise.all([
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
      ]);

      // Réactions données par l'utilisateur, sur des photos (distinct par cible).
      const { data: given } = await supabaseClient
        .from("reactions")
        .select("target_id")
        .eq("target_type", "photo")
        .eq("user_id", userId);
      const reactionsGivenDistinct = new Set(
        (given ?? []).map((r) => r.target_id as number)
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

      return {
        reviews: reviews.count ?? 0,
        photos: photos.count ?? 0,
        favorites: favorites.count ?? 0,
        reactionsGivenDistinct,
        reactionsReceived,
        loginStreak: (streak as number | null) ?? 0,
      };
    },
  });

  const unlockedKey = unlockedIds.join(",");

  useEffect(() => {
    if (!metrics) return;

    const reached: AchievementId[] = [];
    if (metrics.reviews >= 1) reached.push("premier_avis");
    if (metrics.reviews >= 10) reached.push("critique_confirme");
    if (metrics.reviews >= 50) reached.push("plume_gastronomique");
    if (metrics.photos >= 1) reached.push("premiere_photo");
    if (metrics.photos >= 10) reached.push("objectif_midi");
    if (metrics.photos >= 50) reached.push("paparazzi_pause");
    if (metrics.reactionsGivenDistinct >= 1) reached.push("premiere_reaction");
    if (metrics.reactionsGivenDistinct >= 20) reached.push("public_conquis");
    if (metrics.reactionsReceived >= 10) reached.push("approuve");
    if (metrics.favorites >= 5) reached.push("quinte_gagnant");
    if (metrics.loginStreak >= 5) reached.push("fidele_au_poste");
    reached.forEach((id) => unlock(id));

    // Complétionniste : tous les AUTRES succès débloqués. Se ré-évalue à chaque
    // changement de unlockedIds (l'unlock invalide la requête achievements).
    const others = ACHIEVEMENTS.map((a) => a.id).filter(
      (id) => id !== "troupeau_complet"
    );
    if (others.every((id) => unlockedIds.includes(id))) {
      unlock("troupeau_complet");
    }
    // unlockedIds est capturé ; on dépend de sa version stable (unlockedKey).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, unlockedKey, unlock]);
};

export default useAchievementTriggers;
