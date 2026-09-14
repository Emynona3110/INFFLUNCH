// Catalogue des succès (achievements) — EN DUR (pas en base).
// Seules les obtentions sont persistées (table `user_achievements`).
// Ajouter un succès = une entrée ici + son déclenchement (unlock) côté écran ou
// dans le hook global `useAchievementTriggers` (paliers comptés en base).
// Succès SECRET = pas de `condition` ici, mais une ligne dans la table
// `achievement_secrets` (sql/2026-09-14_achievement_secrets.sql).

export type AchievementId =
  // Easter egg mouton (Beeeh)
  | "anti_panurgisme"
  | "berger_dun_jour"
  | "gourou_du_troupeau"
  // Avis
  | "premier_avis"
  | "critique_confirme"
  | "plume_gastronomique"
  // Photos
  | "premiere_photo"
  | "objectif_midi"
  | "paparazzi_pause"
  // Réactions
  | "premiere_reaction"
  | "public_conquis"
  | "approuve"
  // Favoris
  | "quinte_gagnant"
  // Roulette (Surprise du midi)
  | "gambling"
  | "indecis"
  | "de_pipe"
  // Easter eggs divers
  | "jour_nuit"
  | "narcisse"
  // Méta / assiduité
  | "fidele_au_poste"
  | "troupeau_complet";

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
    id: "premier_avis",
    title: "Critique en herbe",
    condition: "Publier un premier avis",
    icon: "📝",
    // Fichier nommé d'après le titre (et non l'id) côté design.
    image: "/achievements/critique_en_herbe.svg",
  },
  {
    id: "critique_confirme",
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
    id: "premiere_photo",
    title: "Apprenti photographe",
    condition: "Ajouter une première photo",
    icon: "📷",
    image: "/achievements/apprenti_photographe.svg",
  },
  {
    id: "objectif_midi",
    title: "Influenceur culinaire",
    condition: "Ajouter 5 photos",
    icon: "🤳",
    image: "/achievements/influenceur_culinaire.svg",
  },
  {
    id: "paparazzi_pause",
    title: "Pizzarazzi",
    condition: "Ajouter 20 photos",
    icon: "🍕",
    image: "/achievements/pizzarazzi.svg",
  },

  // — Réactions —
  {
    id: "premiere_reaction",
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

  // — Méta / assiduité —
  {
    id: "fidele_au_poste",
    title: "Fidèle au poste",
    condition: "Se connecter 5 jours d'affilée",
    icon: "📅",
    image: "/achievements/fidele_au_poste.svg",
  },
  {
    id: "troupeau_complet",
    title: "Complétionniste",
    condition: "Débloquer tous les autres succès",
    icon: "🏆",
    image: "/achievements/completionniste.svg",
  },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
) as Record<AchievementId, Achievement>;
