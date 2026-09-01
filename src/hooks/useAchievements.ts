import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import supabaseClient from "../services/supabaseClient";
import useSession from "./useSession";
import { AchievementId, ACHIEVEMENTS_BY_ID } from "@/data/achievements";
import { showAchievementToast } from "@/lib/achievementToast";

/**
 * Garde anti double-toast, PARTAGÉE par toutes les instances du hook (la
 * galerie et les déclencheurs en montent chacune une) : sans ça, une remise à
 * zéro depuis la galerie ne débloquerait pas l'instance des déclencheurs, qui
 * croirait les succès déjà envoyés. Clés préfixées par l'utilisateur pour ne
 * rien traîner d'un compte à l'autre dans le même onglet.
 */
const fired = new Set<string>();

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
  const navigate = useNavigate();
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

  const unlock = useCallback(
    async (id: AchievementId) => {
      if (!userId) return;
      const firedKey = `${userId}:${id}`;
      if (fired.has(firedKey) || unlockedRef.current.includes(id)) return;
      fired.add(firedKey);

      const { error } = await supabaseClient
        .from("user_achievements")
        .insert({ user_id: userId, achievement_id: id });

      if (error) {
        // 23505 = déjà débloqué (course / autre appareil) : pas de toast.
        // Autre erreur (réseau…) : on autorise un futur retry.
        if (error.code !== "23505") fired.delete(firedKey);
        return;
      }

      // Le toast est cliquable : il mène à la galerie « Succès » de Mon Profil.
      const achievement = ACHIEVEMENTS_BY_ID[id];
      if (achievement)
        showAchievementToast(achievement, () =>
          navigate("/mon-compte?tab=succes")
        );
      queryClient.invalidateQueries({ queryKey: ["achievements", userId] });
      // Le déblocage change aussi les % de rareté (on vient de s'y ajouter).
      queryClient.invalidateQueries({ queryKey: ["achievement-stats"] });
    },
    [userId, queryClient, navigate]
  );

  /**
   * Reverrouille UN de ses succès (outil admin, RLS delete own+admin). On purge
   * aussi sa garde anti double-toast : s'il est toujours mérité, il se
   * redébloque aussitôt — toast compris — sans recharger la page.
   */
  const resetOne = useCallback(
    async (id: AchievementId) => {
      if (!userId) return;
      const { error } = await supabaseClient
        .from("user_achievements")
        .delete()
        .eq("user_id", userId)
        .eq("achievement_id", id);
      if (error) throw new Error(error.message);

      fired.delete(`${userId}:${id}`);
      queryClient.invalidateQueries({ queryKey: ["achievements", userId] });
      queryClient.invalidateQueries({ queryKey: ["achievement-stats"] });
    },
    [userId, queryClient]
  );

  return {
    unlockedIds,
    unlockedAt,
    unlock,
    resetOne,
    loading: !!userId && isPending,
  };
};

export default useAchievements;
