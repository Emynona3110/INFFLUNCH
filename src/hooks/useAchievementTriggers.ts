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
  const { unlock, unlockedIds, resetOne, loading } = useAchievements();
  const { data: metrics } = useAchievementMetrics();

  const unlockedKey = unlockedIds.join(",");

  useEffect(() => {
    // `loading` est capital : tant que la liste des débloqués n'est pas là, elle
    // est vide, et le Bouquet final serait retiré à tort juste en dessous.
    if (!metrics || loading) return;

    (Object.keys(ACHIEVEMENT_GOALS) as AchievementId[]).forEach((id) => {
      const { metric, goal } = ACHIEVEMENT_GOALS[id]!;
      if (metrics[metric] >= goal) unlock(id);
    });

    // Bouquet final : tous les AUTRES succès débloqués. Se ré-évalue à chaque
    // changement de unlockedIds (l'unlock invalide la requête achievements).
    const others = ACHIEVEMENTS.map((a) => a.id).filter(
      (id) => id !== "gatsby"
    );
    if (others.every((id) => unlockedIds.includes(id))) {
      unlock("gatsby");
    } else if (unlockedIds.includes("gatsby")) {
      // SEULE exception à « un succès débloqué ne s'annule jamais » : le
      // Le Bouquet final ne récompense pas une action mais un ÉTAT, « avoir tous
      // les autres ». Le jour où un succès est ajouté au catalogue, cet état
      // redevient faux, donc on le retire — et il reviendra, toast compris, dès
      // que le nouveau succès sera décroché.
      resetOne("gatsby").catch(() => {});
    }
    // unlockedIds est capturé ; on dépend de sa version stable (unlockedKey).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, unlockedKey, unlock, resetOne, loading]);
};

export default useAchievementTriggers;
