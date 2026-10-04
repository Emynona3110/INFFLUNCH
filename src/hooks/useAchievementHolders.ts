import { useQuery } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import { AchievementId, storedIds } from "@/data/achievements";

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
      // Un succès renommé peut encore être stocké sous son ancien id : on
      // interroge chacun (cf. storedIds), une personne n'apparaît qu'une fois.
      const results = await Promise.all(
        storedIds(id!).map((stored) =>
          supabaseClient.rpc("achievement_holders", { achievement: stored }),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);
      const byUser = new Map<string, AchievementHolder>();
      for (const h of results.flatMap((r) => (r.data ?? []) as AchievementHolder[])) {
        const prev = byUser.get(h.user_id);
        if (!prev || h.unlocked_at < prev.unlocked_at) byUser.set(h.user_id, h);
      }
      // Tri côté client aussi : la fonction SQL trie déjà, mais l'ordre
      // affiché ne doit pas dépendre de la version jouée en base.
      return [...byUser.values()].sort((a, b) =>
        b.unlocked_at.localeCompare(a.unlocked_at),
      );
    },
  });

export default useAchievementHolders;
