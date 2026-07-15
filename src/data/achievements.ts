// Catalogue des succès (achievements) — EN DUR (pas en base).
// Seules les obtentions sont persistées (table `user_achievements`).
// Ajouter un succès = une entrée ici + son déclenchement (unlock) côté écran ou
// dans le hook global `useAchievementTriggers` (paliers comptés en base).

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
  // Méta / assiduité
  | "fidele_au_poste"
  | "troupeau_complet";

export interface Achievement {
  id: AchievementId;
  /** Intitulé affiché (titre du succès). */
  title: string;
  /** Condition d'obtention, telle qu'affichée. */
  condition: string;
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
    condition: "Vous avez trouvé un mouton",
    icon: "🐑",
    image: "/achievements/anti_panurgisme.svg",
    secret: true,
  },
  {
    id: "berger_dun_jour",
    title: "Berger d'un jour",
    condition: "Nourrir un mouton",
    icon: "🌾",
    image: "/achievements/berger_dun_jour.svg",
    secret: true,
  },
  {
    id: "gourou_du_troupeau",
    title: "Gourou du troupeau",
    condition: "Nourrir un mouton 50 fois d'affilée",
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
    condition: "Publier 10 avis",
    icon: "👅",
    image: "/achievements/palais_aguerri.svg",
  },
  {
    id: "plume_gastronomique",
    title: "Plume gastronomique",
    condition: "Publier 50 avis",
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
    condition: "Ajouter 10 photos",
    icon: "🤳",
    image: "/achievements/influenceur_culinaire.svg",
  },
  {
    id: "paparazzi_pause",
    title: "Pizzarazzi",
    condition: "Ajouter 50 photos",
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
    condition: "Recevoir 10 réactions sur vos photos",
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
