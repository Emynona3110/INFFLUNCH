import useAchievementTriggers from "@/hooks/useAchievementTriggers";

/**
 * Composant invisible : active le déblocage des succès de contribution/assiduité
 * pour tout l'app. Monté une seule fois (dans Wrapper, côté authentifié).
 */
const AchievementTriggers = () => {
  useAchievementTriggers();
  return null;
};

export default AchievementTriggers;
