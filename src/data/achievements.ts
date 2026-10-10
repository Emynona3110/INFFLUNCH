// Catalogue des succès (achievements) — EN DUR (pas en base).
// Seules les obtentions sont persistées (table `user_achievements`).
// Ajouter un succès = une entrée ici + son déclenchement (unlock) côté écran ou
// dans le hook global `useAchievementTriggers` (paliers comptés en base).
// Succès SECRET = pas de `condition` ici, mais une ligne dans la table
// `achievement_secrets` (sql/2026-09-14_achievement_secrets.sql).
//
// IDS STABLES (2026-10-08) : l'id nomme la CONDITION (`reviews_5`,
// `lunch_table_4`…) et ne change plus. Titre et illustration (`image`, fichier
// nommé librement) se changent sans migration. Un id ne désigne jamais deux
// succès : une nouvelle condition = un nouvel id ; ne jamais réutiliser un id
// (ni un ancien, cf. ACHIEVEMENT_ALIASES).
//
// RÈGLE DU JEU : un succès débloqué ne s'annule JAMAIS. Une seule exception,
// `all_achievements` (Banquet final) : il récompense un état (« avoir tous les autres »), pas une
// action, donc ajouter un succès ici le désactive chez celles et ceux qui
// l'avaient — il revient dès que le nouveau est décroché. C'est
// `useAchievementTriggers` qui le retire, et la RLS n'autorise la suppression
// d'une ligne par son propriétaire que pour CE succès.

import type { AchievementMetrics } from "@/hooks/useAchievementMetrics";

export type AchievementId =
  // Easter egg mouton (Beeeh)
  | "sheep_found"
  | "sheep_fed"
  | "sheep_ring"
  // Avis
  | "reviews_1"
  | "reviews_15"
  | "reviews_5"
  // Photos
  | "photos_1"
  | "photos_5"
  | "photos_15"
  // Réactions
  | "reactions_received_5"
  | "reactions_given_10"
  | "reactions_given_1"
  | "reaction_kinds_3"
  // Prix déclarés
  | "prices_1"
  | "prices_5"
  | "prices_15"
  // Favoris
  | "favorites_6"
  // Roulette (Surprise du midi)
  | "roulette_spin"
  | "roulette_two_restaurants"
  | "roulette_one_restaurant"
  // Easter eggs divers
  | "theme_toggle"
  | "react_own_photo"
  | "star_cursor"
  | "privacy_cookie"
  | "feedback_open"
  // Méta / assiduité
  | "login_streak_5"
  | "lunch_streak_5"
  | "lunches_1"
  | "lunches_5"
  | "lunches_15"
  | "lunch_early"
  | "lunch_late"
  | "lunch_table_4"
  | "all_achievements";

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
    // Le biscuit « Eat me » d'Alice au pays des merveilles.
    id: "reviews_1",
    title: "Amuse-bouche",
    condition: "Publier un premier avis",
    icon: "🍪",
    image: "/achievements/eat_me.svg",
  },
  {
    id: "reviews_5",
    title: "Dish note",
    condition: "Publier 5 avis",
    icon: "📓",
    image: "/achievements/death_note.svg",
  },
  {
    id: "reviews_15",
    title: "Ramen ta fraise",
    condition: "Publier 15 avis",
    icon: "🍜",
    image: "/achievements/naruto.svg",
  },

  // — Photos —
  {
    // Jerry (Tom et Jerry) et son fromage.
    id: "photos_1",
    title: "Cheese !",
    condition: "Ajouter une première photo",
    icon: "🧀",
    image: "/achievements/jerry.svg",
  },
  {
    // « Pizza Delamama », la marque de Mister V.
    id: "photos_5",
    title: "La main à la pâte",
    condition: "Ajouter 5 photos",
    icon: "🍕",
    image: "/achievements/delamama.svg",
  },
  {
    // La Joconde.
    id: "photos_15",
    title: "Hors-d'œuvre",
    condition: "Ajouter 15 photos",
    icon: "🖼️",
    image: "/achievements/joconde.svg",
  },

  // — Prix déclarés —
  {
    id: "prices_1",
    title: "Gardez la monnaie",
    condition: "Déclarer le prix d'un restaurant",
    icon: "💸",
    image: "/achievements/take_my_money.svg",
  },
  {
    id: "prices_5",
    title: "Du beurre dans les épinards",
    condition: "Déclarer le prix de 5 restaurants",
    icon: "📈",
    image: "/achievements/stonks.svg",
  },
  {
    // Picsou et sa montagne de pièces.
    id: "prices_15",
    title: "Pièce montée",
    condition: "Déclarer le prix de 15 restaurants",
    icon: "🪙",
    image: "/achievements/picsou.svg",
  },
  {
    id: "reactions_received_5",
    title: "Coup de pouce",
    condition: "Recevoir 5 réactions sur vos photos",
    icon: "❤️",
    image: "/achievements/brent_rambo.svg",
  },

  // — Réactions —
  {
    // Échangé le 2026-10-05 avec brent_rambo (illustration + titre + id) :
    // l'obtention suit la CONDITION. Cf. sql/2026-10-05_succes_louvre_cesar.sql.
    id: "reactions_given_1",
    title: "Veni, vidi, amavi",
    condition: "Réagir à une photo",
    icon: "👍",
    image: "/achievements/jules_cesar.svg",
  },
  {
    id: "reactions_given_10",
    title: "Du grand art",
    condition: "Réagir à 10 photos différentes",
    icon: "🎬",
    image: "/achievements/absolute_cinema.svg",
  },
  {
    id: "reaction_kinds_3",
    title: "Les goûts et les couleurs",
    icon: "🎨",
    image: "/achievements/gouts_et_couleurs.svg",
    secret: true,
  },

  // — Favoris —
  {
    id: "favorites_6",
    title: "Dégustez-les tous",
    condition: "Avoir 6 restaurants favoris",
    icon: "🥣",
    image: "/achievements/pokeball.svg",
  },

  // — Roulette (Surprise du midi) —
  {
    id: "roulette_spin",
    title: "Faites vos jeux",
    condition: "Tirer le repas au hasard",
    icon: "🎰",
    image: "/achievements/new_vegas.svg",
  },
  {
    id: "roulette_two_restaurants",
    title: "Choix cornélien",
    icon: "💊",
    image: "/achievements/matrix.svg",
    secret: true,
  },
  {
    id: "roulette_one_restaurant",
    title: "Dé pipé",
    icon: "🎲",
    image: "/achievements/king_dice.svg",
    secret: true,
  },

  // — Méta / assiduité —
  {
    id: "login_streak_5",
    title: "Fidèle au poste",
    condition: "Se connecter 5 jours d'affilée",
    icon: "☕",
    image: "/achievements/michael_scott.svg",
  },
  {
    id: "lunch_streak_5",
    title: "Tout feu tout flamme",
    condition: `Déclarer son midi ${FLAMBE_STREAK} jours ouvrés d'affilée`,
    icon: "🔥",
    image: "/achievements/ace.svg",
  },
  {
    // Albert Einstein qui lèche une glace.
    id: "lunches_1",
    title: "Pour la science",
    condition: "Déclarer un premier midi",
    icon: "🍦",
    image: "/achievements/einstein.svg",
  },
  {
    // Kirby qui aspire un burger.
    id: "lunches_5",
    title: "Ventre sur pattes",
    condition: "Déclarer 5 midis",
    icon: "🍔",
    image: "/achievements/kirby.svg",
  },
  {
    // Garfield et sa lasagne.
    id: "lunches_15",
    title: "Gratiné",
    condition: "Déclarer 15 midis",
    icon: "🐈",
    image: "/achievements/garfield.svg",
  },
  {
    id: "lunch_early",
    title: "Premier arrivé, premier servi",
    icon: "⚡",
    image: "/achievements/flash.svg",
    secret: true,
  },
  {
    id: "lunch_late",
    title: "Mieux vaut tard que jamais",
    icon: "🐌",
    image: "/achievements/mister_bean.svg",
    secret: true,
  },
  {
    // Le cri des Tortues Ninja : déjeuner à au moins COWABUNGA_TABLE dans le
    // même restaurant le même midi (trigger SQL, sql/2026-10-06_cowabunga_serveur.sql).
    id: "lunch_table_4",
    title: "Cowabunga !",
    icon: "🐢",
    image: "/achievements/cowabunga.svg",
    secret: true,
  },

  // — Easter eggs divers —
  {
    // Jacquouille et l'interrupteur (Les Visiteurs) : « Le jour, la nuit… »
    id: "theme_toggle",
    title: "Jour ! Nuit ! Jour ! Nuit !",
    icon: "🌗",
    image: "/achievements/jacquouille.svg",
    secret: true,
  },
  {
    id: "react_own_photo",
    title: "Man, I'm pretty!",
    icon: "🪞",
    image: "/achievements/johnny_bravo.svg",
    secret: true,
  },
  {
    // Bag Raiders : curseur étoile + traînée jusqu'au rechargement (fiche resto).
    id: "star_cursor",
    title: "Étoiles filantes",
    icon: "🌠",
    image: "/achievements/luma.svg",
    secret: true,
  },

  {
    // Le seul cookie du site est dans la phrase qui dit qu'il n'y en a pas
    // (page confidentialité) ; le manger débloque. Le gros cookie de
    // l'easter egg est un autre fichier (public/easter/cookie.webp), hors DA.
    id: "privacy_cookie",
    title: "Cookie Clicker",
    icon: "🍪",
    image: "/achievements/cookie_clicker.svg",
    secret: true,
  },
  {
    // « Pas de souci » : Némo couché sur son riz, en sushi. Ouvrir la fenêtre
    // des demandes (FeedbackDialog) une première fois.
    id: "feedback_open",
    title: "Pas de sushi",
    icon: "🍣",
    image: "/achievements/nemo.svg",
    secret: true,
  },

  // — Easter egg mouton (Beeeh) —
  {
    id: "sheep_found",
    title: "Dessine-moi un mouton",
    icon: "🐑",
    image: "/achievements/petit_prince.svg",
    secret: true,
  },
  {
    id: "sheep_fed",
    title: "Revenons à nos moutons",
    icon: "🌾",
    image: "/achievements/minecraft.svg",
    secret: true,
  },
  {
    // « Le Seigneur des agneaux » : 1 chance sur 100 que le mouton fasse tomber
    // l'Anneau unique au lieu d'une nourriture ; il faut l'attraper.
    id: "sheep_ring",
    title: "Le Seigneur des agneaux",
    icon: "💍",
    image: "/achievements/seigneur_des_anneaux.svg",
    secret: true,
  },

  // — Complétionniste —
  {
    id: "all_achievements",
    title: "Banquet final",
    condition: "Débloquer tous les succès",
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
  reviews_1: { metric: "reviews", goal: 1 },
  reviews_5: { metric: "reviews", goal: 5 },
  reviews_15: { metric: "reviews", goal: 15 },
  photos_1: { metric: "photos", goal: 1 },
  photos_5: { metric: "photos", goal: 5 },
  photos_15: { metric: "photos", goal: 15 },
  prices_1: { metric: "prices", goal: 1 },
  prices_5: { metric: "prices", goal: 5 },
  prices_15: { metric: "prices", goal: 15 },
  reactions_given_1: { metric: "reactionsGivenDistinct", goal: 1 },
  reactions_given_10: { metric: "reactionsGivenDistinct", goal: 10 },
  reactions_received_5: { metric: "reactionsReceived", goal: 5 },
  reaction_kinds_3: { metric: "reactionEmojisDistinct", goal: 3 },
  favorites_6: { metric: "favorites", goal: 6 }, // une équipe Pokémon
  login_streak_5: { metric: "loginStreak", goal: 5 },
  lunch_streak_5: { metric: "lunchStreak", goal: FLAMBE_STREAK },
  lunches_1: { metric: "lunches", goal: 1 },
  lunches_5: { metric: "lunches", goal: 5 },
  lunches_15: { metric: "lunches", goal: 15 },
};

/**
 * Anciens ids → id actuel. Une obtention se lit TOUJOURS sous son id actuel,
 * même si la base porte encore l'ancien (migration SQL pas encore passée) :
 * sans ça, le front croirait le succès perdu et le redébloquerait — toast et
 * date du jour compris. Renommer un succès ne doit JAMAIS toucher aux
 * obtentions ni à leurs dates. Inoffensif une fois la migration passée.
 */
const ACHIEVEMENT_ALIASES: Record<string, AchievementId> = {
  // Paliers de prix 1/10 → 1/5/15 (2026-10-09) : qui avait déclaré 10 prix en
  // a déclaré 5. Dates recalées sur la 5e déclaration par
  // sql/2026-10-09_paliers_prix.sql.
  prices_10: "prices_5",
  // Ids « référence de l'illustration » (2026-10-04 → 2026-10-08), remplacés
  // par les ids stables par condition : sql/2026-10-08_succes_ids_stables.sql.
  eat_me: "reviews_1",
  death_note: "reviews_5",
  naruto: "reviews_15",
  jerry: "photos_1",
  delamama: "photos_5",
  joconde: "photos_15",
  take_my_money: "prices_1",
  stonks: "prices_5",
  jules_cesar: "reactions_given_1",
  absolute_cinema: "reactions_given_10",
  brent_rambo: "reactions_received_5",
  gouts_et_couleurs: "reaction_kinds_3",
  pokeball: "favorites_6",
  new_vegas: "roulette_spin",
  matrix: "roulette_two_restaurants",
  magritte: "roulette_one_restaurant",
  michael_scott: "login_streak_5",
  johnny_hallyday: "lunch_streak_5",
  flash: "lunch_early",
  mister_bean: "lunch_late",
  cowabunga: "lunch_table_4",
  jacquouille: "theme_toggle",
  johnny_bravo: "react_own_photo",
  shooting_stars: "star_cursor",
  cookie_clicker: "privacy_cookie",
  nemo: "feedback_open",
  petit_prince: "sheep_found",
  minecraft: "sheep_fed",
  seigneur_des_anneaux: "sheep_ring",
  gatsby: "all_achievements",
  // Ids plus anciens encore (2026-10-04 et 2026-10-05), même cible.
  critique_en_herbe: "reviews_1",
  palais_aguerri: "reviews_5",
  plume_gastronomique: "reviews_15",
  photographe: "photos_1",
  inffluenceur: "photos_5",
  addition: "prices_1",
  gardez_la_monnaie: "prices_5",
  petit_geste: "reactions_given_1",
  public_conquis: "reactions_given_10",
  quinte_gagnant: "favorites_6",
  gambling: "roulette_spin",
  indecis: "roulette_two_restaurants",
  de_pipe: "roulette_one_restaurant",
  fidele_au_poste: "login_streak_5",
  flambe: "lunch_streak_5",
  sprinter: "lunch_early",
  retardataire: "lunch_late",
  jour_nuit: "theme_toggle",
  narcisse: "react_own_photo",
  cookie: "privacy_cookie",
  pas_de_sushi: "feedback_open",
  anti_panurgisme: "sheep_found",
  berger_dun_jour: "sheep_fed",
  completionniste: "all_achievements",
  pizzarazzi: "photos_15",
  approuve: "reactions_received_5",
  ratatouille: "reviews_1",
  duck_face: "photos_1",
  salt_bae: "photos_5",
  louvre: "photos_15",
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
