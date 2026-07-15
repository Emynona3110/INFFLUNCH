import { useQuery } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import { AchievementId } from "@/data/achievements";

/**
 * Pourcentage global d'utilisateurs ayant débloqué chaque succès (façon Steam).
 * Calculé côté base par la fonction `achievement_stats` (SECURITY DEFINER, ne
 * renvoie que l'agrégat). Retourne une map id → pourcentage (0-100).
 */
const useAchievementStats = () => {
  const { data = {}, isSuccess } = useQuery<
    Partial<Record<AchievementId, number>>,
    Error
  >({
    queryKey: ["achievement-stats"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("achievement_stats");
      if (error) throw new Error(error.message);
      const map: Partial<Record<AchievementId, number>> = {};
      for (const row of (data ?? []) as { achievement_id: AchievementId; percent: number }[]) {
        map[row.achievement_id] = row.percent;
      }
      return map;
    },
  });

  // `ready` : les stats sont chargées. Un succès absent de la map = 0 obtention
  // (la fonction SQL ne renvoie pas de ligne à 0) → à afficher comme 0 %, mais
  // seulement une fois `ready` pour éviter de flasher 0 % pendant le chargement.
  return { percentById: data, ready: isSuccess };
};

export default useAchievementStats;
