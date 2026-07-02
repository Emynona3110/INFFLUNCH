import { useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useSession from "./useSession";
import { AchievementId, ACHIEVEMENTS_BY_ID } from "@/data/achievements";
import { showAchievementToast } from "@/lib/achievementToast";

/**
 * Gère les succès de l'utilisateur : liste des débloqués + fonction `unlock`.
 * Le catalogue est en dur (src/data/achievements.ts) ; ici on ne touche qu'aux
 * obtentions (table `user_achievements`). `unlock` est idempotent : insert avec
 * contrainte d'unicité côté base, garde anti double-toast côté client.
 */
const useAchievements = () => {
  const { sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const queryClient = useQueryClient();
  const queryKey = ["achievements", userId];

  const { data: rows = [], isPending } = useQuery<
    { achievement_id: AchievementId; unlocked_at: string }[],
    Error
  >({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return (data ?? []) as { achievement_id: AchievementId; unlocked_at: string }[];
    },
  });

  const unlockedIds = rows.map((r) => r.achievement_id);
  // Map id → date de déblocage (pour la galerie « Mes succès »).
  const unlockedAt = Object.fromEntries(
    rows.map((r) => [r.achievement_id, r.unlocked_at])
  ) as Partial<Record<AchievementId, string>>;

  // Miroir des débloqués pour garder `unlock` stable (pas de re-créations à
  // chaque chargement), et set des succès déjà déclenchés cette session.
  const unlockedRef = useRef<AchievementId[]>([]);
  unlockedRef.current = unlockedIds;
  const firedRef = useRef<Set<string>>(new Set());

  const unlock = useCallback(
    async (id: AchievementId) => {
      if (!userId) return;
      if (firedRef.current.has(id) || unlockedRef.current.includes(id)) return;
      firedRef.current.add(id);

      const { error } = await supabaseClient
        .from("user_achievements")
        .insert({ user_id: userId, achievement_id: id });

      if (error) {
        // 23505 = déjà débloqué (course / autre appareil) : pas de toast.
        // Autre erreur (réseau…) : on autorise un futur retry.
        if (error.code !== "23505") firedRef.current.delete(id);
        return;
      }

      const achievement = ACHIEVEMENTS_BY_ID[id];
      if (achievement) showAchievementToast(achievement);
      queryClient.invalidateQueries({ queryKey: ["achievements", userId] });
    },
    [userId, queryClient]
  );

  return { unlockedIds, unlockedAt, unlock, loading: !!userId && isPending };
};

export default useAchievements;
