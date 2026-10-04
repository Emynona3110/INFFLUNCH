// Catalogue des succès (achievements) — EN DUR (pas en base).
// Seules les obtentions sont persistées (table `user_achievements`).
// Ajouter un succès = une entrée ici + son déclenchement (unlock) côté écran ou
// dans le hook global `useAchievementTriggers` (paliers comptés en base).
// Succès SECRET = pas de `condition` ici, mais une ligne dans la table
// `achievement_secrets` (sql/2026-09-14_achievement_secrets.sql).
//
// RÈGLE DU JEU : un succès débloqué ne s'annule JAMAIS. Une seule exception,
// `gatsby` : il récompense un état (« avoir tous les autres »), pas une
// action, donc ajouter un succès ici le désactive chez celles et ceux qui
// l'avaient — il revient dès que le nouveau est décroché. C'est
// `useAchievementTriggers` qui le retire, et la RLS n'autorise la suppression
// d'une ligne par son propriétaire que pour CE succès.

import type { AchievementMetrics } from "@/hooks/useAchievementMetrics";

export type AchievementId =
  // Easter egg mouton (Beeeh)
  | "petit_prince"
  | "minecraft"
  | "gourou_du_troupeau"
  // Avis
  | "ratatouille"
  | "naruto"
  | "death_note"
  // Photos
  | "duck_face"
  | "salt_bae"
  | "pizzarazzi"
  // Réactions
  | "brent_rambo"
  | "absolute_cinema"
  | "approuve"
  | "gouts_et_couleurs"
  // Prix déclarés
  | "take_my_money"
  | "stonks"
  // Favoris
  | "pokeball"
  // Roulette (Surprise du midi)
  | "new_vegas"
  | "matrix"
  | "magritte"
  // Easter eggs divers
  | "jacquouille"
  | "johnny_bravo"
  | "shooting_stars"
  | "cookie_clicker"
  | "nemo"
  // Méta / assiduité
  | "michael_scott"
  | "johnny_hallyday"
  | "flash"
  | "mister_bean"
  | "cowabunga"
  | "gatsby";

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
  /**
   * Désactivé : gardé dans le fichier (pour le réactiver d'une ligne) mais
   * absent de partout — galerie, profils, compteurs, Complétionniste — et
   * plus jamais débloqué. Les obtentions déjà en base restent, invisibles.
   */
  disabled?: boolean;
}

/** Palier du succès « Tout feu tout flamme » : jours ouvrés d'affilée avec un midi déclaré
 *  (déblocage dans useAchievementTriggers, flammes sur la pp du profil). */
export const FLAMBE_STREAK = 5;

/** Tablée du midi (même restaurant, même jour), soi compris, qui vaut le
 *  succès secret « Cowabunga ! » — quatre, comme les tortues. */
export const COWABUNGA_TABLE = 4;

/** En dessous de ce pourcentage d'obtention, un succès est rare : son icône
 *  porte une aura dorée (classe `rare-aura`) chez ceux qui l'ont. */
export const RARE_PERCENT = 10;

const ALL_ACHIEVEMENTS: Achievement[] = [
  // — Avis —
  {
    id: "ratatouille",
    title: "La main à la pâte",
    condition: "Publier un premier avis",
    icon: "🐀",
    image: "/achievements/ratatouille.svg",
  },
  {
    id: "death_note",
    title: "Rayer de la carte",
    condition: "Publier 5 avis",
    icon: "📓",
    image: "/achievements/death_note.svg",
  },
  {
    id: "naruto",
    title: "Ramen ta science",
    condition: "Publier 20 avis",
    icon: "🍜",
    image: "/achievements/naruto.svg",
  },

  // — Photos —
  {
    id: "duck_face",
    title: "Selfood",
    condition: "Ajouter une première photo",
    icon: "🤳",
    image: "/achievements/duck_face.svg",
  },
  {
    id: "salt_bae",
    title: "Grain de sel",
    condition: "Ajouter 5 photos",
    icon: "🧂",
    image: "/achievements/salt_bae.svg",
  },
  {
    id: "pizzarazzi",
    title: "Pizzarazzi",
    condition: "Ajouter 15 photos",
    icon: "🍕",
    image: "/achievements/pizzarazzi.svg",
    disabled: true,
  },

  // — Prix déclarés —
  {
    id: "take_my_money",
    title: "Gardez la monnaie",
    condition: "Déclarer le prix d'un premier restaurant",
    icon: "💸",
    image: "/achievements/take_my_money.svg",
  },
  {
    id: "stonks",
    title: "Beurre dans les épinards",
    condition: "Déclarer le prix de 5 restaurants",
    icon: "📈",
    image: "/achievements/stonks.svg",
  },

  // — Réactions —
  {
    id: "brent_rambo",
    title: "Coup de pouce",
    condition: "Réagir à une photo",
    icon: "👍",
    image: "/achievements/brent_rambo.svg",
  },
  {
    id: "absolute_cinema",
    title: "Du grand art",
    condition: "Réagir à 20 photos différentes",
    icon: "🎬",
    image: "/achievements/absolute_cinema.svg",
  },
  {
    id: "approuve",
    title: "Approuvé",
    condition: "Recevoir 5 réactions sur vos photos",
    icon: "❤️",
    image: "/achievements/approuve.svg",
    disabled: true,
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
    id: "pokeball",
    title: "Dégustez-les tous",
    condition: "Avoir 5 restaurants favoris",
    icon: "🥣",
    image: "/achievements/pokeball.svg",
  },

  // — Roulette (Surprise du midi) —
  {
    id: "new_vegas",
    title: "Faites vos jeux",
    condition: "Tirer le repas au hasard",
    icon: "🎰",
    image: "/achievements/new_vegas.svg",
  },
  {
    id: "matrix",
    title: "Choix cornélien",
    icon: "💊",
    image: "/achievements/matrix.svg",
    secret: true,
  },
  {
    id: "magritte",
    title: "Dé pipé",
    icon: "🎲",
    image: "/achievements/magritte.svg",
    secret: true,
  },

  // — Méta / assiduité —
  {
    id: "michael_scott",
    title: "Fidèle au poste",
    condition: "Se connecter 5 jours d'affilée",
    icon: "☕",
    image: "/achievements/michael_scott.svg",
  },
  {
    id: "johnny_hallyday",
    title: "Tout feu tout flamme",
    condition: `Déclarer son midi ${FLAMBE_STREAK} jours ouvrés d'affilée`,
    icon: "🔥",
    image: "/achievements/johnny_hallyday.svg",
  },
  {
    id: "flash",
    title: "Premier arrivé, premier servi",
    icon: "⚡",
    image: "/achievements/flash.svg",
    secret: true,
  },
  {
    id: "mister_bean",
    title: "Mieux vaut tard que jamais",
    icon: "🐌",
    image: "/achievements/mister_bean.svg",
    secret: true,
  },
  {
    // Le cri des Tortues Ninja : déjeuner à au moins COWABUNGA_TABLE dans le
    // même restaurant le même midi (useLunchToday).
    id: "cowabunga",
    title: "Cowabunga !",
    icon: "🐢",
    image: "/achievements/cowabunga.svg",
    secret: true,
  },

  // — Easter eggs divers —
  {
    // Jacquouille et l'interrupteur (Les Visiteurs) : « Le jour, la nuit… »
    id: "jacquouille",
    title: "Jour ! Nuit ! Jour ! Nuit !",
    icon: "🌗",
    image: "/achievements/jacquouille.svg",
    secret: true,
  },
  {
    id: "johnny_bravo",
    title: "Jamais mieux servi que par soi-même",
    icon: "🪞",
    image: "/achievements/johnny_bravo.svg",
    secret: true,
  },
  {
    // Bag Raiders : curseur étoile + traînée jusqu'au rechargement (fiche resto).
    id: "shooting_stars",
    title: "Étoiles filantes",
    icon: "🌠",
    image: "/achievements/shooting_stars.svg",
    secret: true,
  },

  {
    // Le seul cookie du site est dans la phrase qui dit qu'il n'y en a pas
    // (page confidentialité) ; le manger débloque. Le gros cookie de
    // l'easter egg est un autre fichier (public/easter/cookie.webp), hors DA.
    id: "cookie_clicker",
    title: "Cookie Clicker",
    icon: "🍪",
    image: "/achievements/cookie_clicker.svg",
    secret: true,
  },
  {
    // « Pas de souci » : Némo couché sur son riz, en sushi. Ouvrir la fenêtre
    // des demandes (FeedbackDialog) une première fois.
    id: "nemo",
    title: "Pas de sushi",
    icon: "🍣",
    image: "/achievements/nemo.svg",
    secret: true,
  },

  // — Easter egg mouton (Beeeh) —
  {
    id: "petit_prince",
    title: "Dessine-moi un mouton",
    icon: "🐑",
    image: "/achievements/petit_prince.svg",
    secret: true,
  },
  {
    id: "minecraft",
    title: "Revenons à nos moutons",
    icon: "🌾",
    image: "/achievements/minecraft.svg",
    secret: true,
  },
  {
    id: "gourou_du_troupeau",
    title: "Gourou du troupeau",
    icon: "🧙",
    image: "/achievements/gourou_du_troupeau.svg",
    secret: true,
    disabled: true,
  },

  // — Complétionniste —
  {
    id: "gatsby",
    title: "La cerise sur le gâteau",
    condition: "Débloquer tous les autres succès",
    icon: "🥂",
    image: "/achievements/gatsby.svg",
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
  ratatouille: { metric: "reviews", goal: 1 },
  death_note: { metric: "reviews", goal: 5 },
  naruto: { metric: "reviews", goal: 20 },
  duck_face: { metric: "photos", goal: 1 },
  salt_bae: { metric: "photos", goal: 5 },
  pizzarazzi: { metric: "photos", goal: 15 },
  take_my_money: { metric: "prices", goal: 1 },
  stonks: { metric: "prices", goal: 5 },
  brent_rambo: { metric: "reactionsGivenDistinct", goal: 1 },
  absolute_cinema: { metric: "reactionsGivenDistinct", goal: 20 },
  approuve: { metric: "reactionsReceived", goal: 5 },
  gouts_et_couleurs: { metric: "reactionEmojisDistinct", goal: 3 },
  pokeball: { metric: "favorites", goal: 5 },
  michael_scott: { metric: "loginStreak", goal: 5 },
  johnny_hallyday: { metric: "lunchStreak", goal: FLAMBE_STREAK },
};

/**
 * Anciens ids → id actuel. Une obtention se lit TOUJOURS sous son id actuel,
 * même si la base porte encore l'ancien (migration SQL pas encore passée) :
 * sans ça, le front croirait le succès perdu et le redébloquerait — toast et
 * date du jour compris. Renommer un succès ne doit JAMAIS toucher aux
 * obtentions ni à leurs dates. Inoffensif une fois la migration passée.
 */
const ACHIEVEMENT_ALIASES: Record<string, AchievementId> = {
  // sql/2026-10-04_succes_renommage.sql
  critique_en_herbe: "ratatouille",
  // Paliers échangés avec les illustrations : 5 avis = Death Note,
  // 20 avis = Naruto. L'obtention suit le PALIER, pas l'image.
  palais_aguerri: "death_note",
  plume_gastronomique: "naruto",
  photographe: "duck_face",
  inffluenceur: "salt_bae",
  addition: "take_my_money",
  gardez_la_monnaie: "stonks",
  petit_geste: "brent_rambo",
  public_conquis: "absolute_cinema",
  quinte_gagnant: "pokeball",
  gambling: "new_vegas",
  indecis: "matrix",
  de_pipe: "magritte",
  fidele_au_poste: "michael_scott",
  flambe: "johnny_hallyday",
  sprinter: "flash",
  retardataire: "mister_bean",
  jour_nuit: "jacquouille",
  narcisse: "johnny_bravo",
  cookie: "cookie_clicker",
  pas_de_sushi: "nemo",
  anti_panurgisme: "petit_prince",
  berger_dun_jour: "minecraft",
  completionniste: "gatsby",
};

/** L'id actuel d'un id lu en base (ancien ou non). */
export const canonicalId = (id: string) =>
  (ACHIEVEMENT_ALIASES[id] ?? id) as AchievementId;

/** Tous les ids sous lesquels un succès peut être stocké : l'actuel et ses
 *  anciens. */
export const storedIds = (id: AchievementId) => [
  id,
  ...Object.keys(ACHIEVEMENT_ALIASES).filter((old) => ACHIEVEMENT_ALIASES[old] === id),
];

/** Le catalogue en service : tout le reste du code ne voit que lui. */
export const ACHIEVEMENTS = ALL_ACHIEVEMENTS.filter((a) => !a.disabled);

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
) as Record<AchievementId, Achievement>;
