import { useEffect } from "react";
import useAchievements from "./useAchievements";
import useAchievementMetrics from "./useAchievementMetrics";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_GOALS,
  AchievementId,
} from "@/data/achievements";

/**
 * Déblocage des succès de contribution/assiduité. Monté une seule fois pour tout
 * l'app (cf. AchievementTriggers dans Wrapper). On compte les métriques de
 * l'utilisateur EN BASE (rétroactif : les contributions déjà faites débloquent
 * immédiatement) et on débloque les paliers atteints (ACHIEVEMENT_GOALS).
 * `unlock` est idempotent, donc appeler à chaque render est sans effet une
 * fois le succès obtenu.
 */
const useAchievementTriggers = () => {
  const { unlock, unlockedIds } = useAchievements();
  const { data: metrics } = useAchievementMetrics();

  const unlockedKey = unlockedIds.join(",");

  useEffect(() => {
    if (!metrics) return;

    (Object.keys(ACHIEVEMENT_GOALS) as AchievementId[]).forEach((id) => {
      const { metric, goal } = ACHIEVEMENT_GOALS[id]!;
      if (metrics[metric] >= goal) unlock(id);
    });

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
