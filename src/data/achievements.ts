// Catalogue des succès (achievements) — EN DUR (pas en base).
// Seules les obtentions sont persistées (table `user_achievements`).
// Ajouter un succès = une entrée ici + son déclenchement (unlock) côté écran ou
// dans le hook global `useAchievementTriggers` (paliers comptés en base).
// Succès SECRET = pas de `condition` ici, mais une ligne dans la table
// `achievement_secrets` (sql/2026-09-14_achievement_secrets.sql).

import type { AchievementMetrics } from "@/hooks/useAchievementMetrics";

export type AchievementId =
  // Easter egg mouton (Beeeh)
  | "anti_panurgisme"
  | "berger_dun_jour"
  | "gourou_du_troupeau"
  // Avis
  | "critique_en_herbe"
  | "palais_aguerri"
  | "plume_gastronomique"
  // Photos
  | "photographe"
  | "inffluenceur"
  | "pizzarazzi"
  // Réactions
  | "petit_geste"
  | "public_conquis"
  | "approuve"
  | "gouts_et_couleurs"
  // Prix déclarés
  | "addition"
  | "gardez_la_monnaie"
  // Favoris
  | "quinte_gagnant"
  // Roulette (Surprise du midi)
  | "gambling"
  | "indecis"
  | "de_pipe"
  // Easter eggs divers
  | "jour_nuit"
  | "narcisse"
  | "shooting_stars"
  | "cookie"
  // Méta / assiduité
  | "fidele_au_poste"
  | "flambe"
  | "sprinter"
  | "retardataire"
  | "completionniste";

export interface Achievement {
  id: AchievementId;
  /** Intitulé affiché (titre du succès). */
  title: string;
  /**
   * Condition d'obtention, telle qu'affichée. ABSENTE pour les succès secrets :
   * elle vit en base (`achievement_secrets`, lisible une fois débloqué), pour
   * que personne ne la trouve dans le code du navigateur.
   */
  condition?: string;
  /** Icône (emoji) du succès — repli si aucune image `image` n'est fournie. */
  icon: string;
  /**
   * Chemin d'une image d'icône (SVG/PNG dans public/achievements/). Si présent,
   * affichée à la place de l'emoji. Sinon on retombe sur `icon`.
   */
  image?: string;
  /**
   * Succès SECRET (façon Steam) : tant qu'il n'est pas débloqué, l'intitulé et la
   * condition restent cachés dans la galerie (« Succès secret »). Réservé aux
   * easter eggs. Les succès normaux se révèlent grisés avant déblocage.
   */
  secret?: boolean;
}

/** Palier du succès « Flambé » : jours ouvrés d'affilée avec un midi déclaré
 *  (déblocage dans useAchievementTriggers, flammes sur la pp du profil). */
export const FLAMBE_STREAK = 5;

export const ACHIEVEMENTS: Achievement[] = [
  // — Easter egg mouton (Beeeh) —
  {
    id: "anti_panurgisme",
    title: "Anti-panurgisme",
    icon: "🐑",
    image: "/achievements/anti_panurgisme.svg",
    secret: true,
  },
  {
    id: "berger_dun_jour",
    title: "Berger d'un jour",
    icon: "🌾",
    image: "/achievements/berger_dun_jour.svg",
    secret: true,
  },
  {
    id: "gourou_du_troupeau",
    title: "Gourou du troupeau",
    icon: "🧙",
    image: "/achievements/gourou_du_troupeau.svg",
    secret: true,
  },

  // — Avis —
  {
    id: "critique_en_herbe",
    title: "Critique en herbe",
    condition: "Publier un premier avis",
    icon: "📝",
    // Fichier nommé d'après le titre (et non l'id) côté design.
    image: "/achievements/critique_en_herbe.svg",
  },
  {
    id: "palais_aguerri",
    title: "Palais aguerri",
    condition: "Publier 5 avis",
    icon: "👅",
    image: "/achievements/palais_aguerri.svg",
  },
  {
    id: "plume_gastronomique",
    title: "Plume gastronomique",
    condition: "Publier 20 avis",
    icon: "🖋️",
    image: "/achievements/plume_gastronomique.svg",
  },

  // — Photos —
  {
    id: "photographe",
    title: "Photographe",
    condition: "Ajouter une première photo",
    icon: "📷",
    image: "/achievements/photographe.svg",
  },
  {
    id: "inffluenceur",
    title: "Inffluenceur",
    condition: "Ajouter 5 photos",
    icon: "🤳",
    image: "/achievements/inffluenceur.svg",
  },
  {
    id: "pizzarazzi",
    title: "Pizzarazzi",
    condition: "Ajouter 15 photos",
    icon: "🍕",
    image: "/achievements/pizzarazzi.svg",
  },

  // — Prix déclarés —
  {
    id: "addition",
    title: "L'addition !",
    condition: "Déclarer le prix d'un premier restaurant",
    icon: "🧾",
    image: "/achievements/addition.svg",
  },
  {
    id: "gardez_la_monnaie",
    title: "Gardez la monnaie",
    condition: "Déclarer le prix de 5 restaurants",
    icon: "💸",
    image: "/achievements/gardez_la_monnaie.svg",
  },

  // — Réactions —
  {
    id: "petit_geste",
    title: "Petit geste",
    condition: "Réagir à une photo",
    icon: "👍",
    image: "/achievements/petit_geste.svg",
  },
  {
    id: "public_conquis",
    title: "Public conquis",
    condition: "Réagir à 20 photos différentes",
    icon: "👏",
    image: "/achievements/public_conquis.svg",
  },
  {
    id: "approuve",
    title: "Approuvé",
    condition: "Recevoir 5 réactions sur vos photos",
    icon: "❤️",
    image: "/achievements/approuve.svg",
  },
  {
    id: "gouts_et_couleurs",
    title: "Goûts et couleurs",
    icon: "🎨",
    image: "/achievements/gouts_et_couleurs.svg",
    secret: true,
  },

  // — Favoris —
  {
    id: "quinte_gagnant",
    title: "Quinté gagnant",
    condition: "Avoir 5 restaurants favoris",
    icon: "🐎",
    image: "/achievements/quinte_gagnant.svg",
  },

  // — Roulette (Surprise du midi) —
  {
    id: "gambling",
    title: "Gambling",
    condition: "Tirer le repas au hasard",
    icon: "🎰",
    image: "/achievements/gambling.svg",
  },
  {
    id: "indecis",
    title: "Indécis",
    icon: "🤔",
    image: "/achievements/indecis.svg",
    secret: true,
  },
  {
    id: "de_pipe",
    title: "Dé pipé",
    icon: "🎲",
    image: "/achievements/de_pipe.svg",
    secret: true,
  },

  // — Easter eggs divers —
  {
    // Jacquouille et l'interrupteur (Les Visiteurs) : « Le jour, la nuit… »
    id: "jour_nuit",
    title: "Jour ! Nuit ! Jour ! Nuit !",
    icon: "🌗",
    image: "/achievements/jour_nuit.svg",
    secret: true,
  },
  {
    id: "narcisse",
    title: "Narcisse",
    icon: "🪞",
    image: "/achievements/narcisse.svg",
    secret: true,
  },
  {
    // Bag Raiders : curseur étoile + traînée jusqu'au rechargement (fiche resto).
    id: "shooting_stars",
    title: "Shooting Stars",
    icon: "🌠",
    image: "/achievements/shooting_stars.svg",
    secret: true,
  },

  {
    // Le seul cookie du site est dans la phrase qui dit qu'il n'y en a pas
    // (page confidentialité) ; le manger débloque. Le gros cookie de
    // l'easter egg est un autre fichier (public/easter/cookie.webp), hors DA.
    id: "cookie",
    title: "Cookie",
    icon: "🍪",
    image: "/achievements/cookie.svg",
    secret: true,
  },

  // — Méta / assiduité —
  {
    id: "fidele_au_poste",
    title: "Fidèle au poste",
    condition: "Se connecter 5 jours d'affilée",
    icon: "📅",
    image: "/achievements/fidele_au_poste.svg",
  },
  {
    id: "flambe",
    title: "Flambé",
    condition: `Déclarer son midi ${FLAMBE_STREAK} jours ouvrés d'affilée`,
    icon: "🔥",
    image: "/achievements/flambe.svg",
  },
  {
    id: "sprinter",
    title: "Sprinter",
    icon: "⏱️",
    image: "/achievements/sprinter.svg",
    secret: true,
  },
  {
    id: "retardataire",
    title: "Retardataire",
    icon: "🐌",
    image: "/achievements/retardataire.svg",
    secret: true,
  },
  {
    id: "completionniste",
    title: "Complétionniste",
    condition: "Débloquer tous les autres succès",
    icon: "🏆",
    image: "/achievements/completionniste.svg",
  },
];

/** Paliers des succès à compteur : la métrique (useAchievementMetrics) et le
 *  nombre à atteindre. Une seule table pour deux usages — les déclencheurs
 *  (useAchievementTriggers) et la progression « 12 / 20 » de la popup d'un
 *  succès. Un secret peut y figurer : sa progression n'est montrée qu'une fois
 *  la condition révélée. */
export const ACHIEVEMENT_GOALS: Partial<
  Record<AchievementId, { metric: keyof AchievementMetrics; goal: number }>
> = {
  critique_en_herbe: { metric: "reviews", goal: 1 },
  palais_aguerri: { metric: "reviews", goal: 5 },
  plume_gastronomique: { metric: "reviews", goal: 20 },
  photographe: { metric: "photos", goal: 1 },
  inffluenceur: { metric: "photos", goal: 5 },
  pizzarazzi: { metric: "photos", goal: 15 },
  addition: { metric: "prices", goal: 1 },
  gardez_la_monnaie: { metric: "prices", goal: 5 },
  petit_geste: { metric: "reactionsGivenDistinct", goal: 1 },
  public_conquis: { metric: "reactionsGivenDistinct", goal: 20 },
  approuve: { metric: "reactionsReceived", goal: 5 },
  gouts_et_couleurs: { metric: "reactionEmojisDistinct", goal: 3 },
  quinte_gagnant: { metric: "favorites", goal: 5 },
  fidele_au_poste: { metric: "loginStreak", goal: 5 },
  flambe: { metric: "lunchStreak", goal: FLAMBE_STREAK },
};

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
) as Record<AchievementId, Achievement>;
