// Catalogue des succès (achievements) — EN DUR (pas en base).
// Seules les obtentions sont persistées (table `user_achievements`).
// Ajouter un succès = une entrée ici + son déclenchement (unlock) côté écran.

export type AchievementId =
  | "anti_panurgisme"
  | "berger_dun_jour"
  | "gourou_du_troupeau";

export interface Achievement {
  id: AchievementId;
  /** Intitulé affiché (titre du succès). */
  title: string;
  /** Phrase d'ambiance (flavor text, style Steam). */
  flavor: string;
  /** Condition d'obtention, telle qu'affichée. */
  condition: string;
  /** Icône (emoji) du succès. */
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "anti_panurgisme",
    title: "Anti-panurgisme",
    flavor: "Ils suivent le chemin, tu sors des sentiers battus",
    condition: "Vous avez trouvé un mouton",
    icon: "🐑",
  },
  {
    id: "berger_dun_jour",
    title: "Berger d'un jour",
    flavor: "Un petit geste pour toi, un grand festin pour lui",
    condition: "Nourrir un mouton",
    icon: "🌾",
  },
  {
    id: "gourou_du_troupeau",
    title: "Gourou du troupeau",
    flavor: "Après la curiosité, la gourmandise",
    condition: "Nourrir un mouton 50 fois d'affilée",
    icon: "🧙",
  },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
) as Record<AchievementId, Achievement>;
