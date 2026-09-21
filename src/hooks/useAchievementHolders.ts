import { useQuery } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import { AchievementId } from "@/data/achievements";

export interface AchievementHolder {
  user_id: string;
  email: string;
  avatar_path: string | null;
  unlocked_at: string;
}

/**
 * Collègues ayant débloqué un succès, les plus récents en premier (rpc
 * `achievement_holders`, sql/2026-09-21_achievement_holders.sql). Null = rien
 * à charger (popup fermée).
 */
const useAchievementHolders = (id: AchievementId | null) =>
  useQuery<AchievementHolder[], Error>({
    queryKey: ["achievement-holders", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("achievement_holders", {
        achievement: id,
      });
      if (error) throw new Error(error.message);
      // Tri côté client aussi : la fonction SQL trie déjà, mais l'ordre
      // affiché ne doit pas dépendre de la version jouée en base.
      return ((data ?? []) as AchievementHolder[]).sort((a, b) =>
        b.unlocked_at.localeCompare(a.unlocked_at),
      );
    },
  });

export default useAchievementHolders;
