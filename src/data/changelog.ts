/**
 * Journal des nouveautés du site (changelog), en dur.
 * Affiché dans la section « Nouveautés », regroupé par mois (un cadre par mois).
 * Ordre : du plus récent au plus ancien (l'ordre du tableau fait foi).
 * Dates au format ISO "AAAA-MM-JJ" (sert au regroupement par mois et à la
 * pastille « non vu » ; le jour n'est pas affiché).
 *
 * Chaque entrée a un titre + une liste de sous-points (`points`).
 * Pour ajouter une nouveauté : ajoute une entrée EN HAUT du tableau.
 */

export interface ChangelogEntry {
  /** "AAAA-MM-JJ" (comparable et triable tel quel). */
  date: string;
  title: string;
  /** Sous-points, affichés en liste à puces. */
  points: string[];
}

export const changelog: ChangelogEntry[] = [
  // ───────────────────────── Juin 2026 ─────────────────────────
  {
    date: "2026-06-21",
    title: "Profil utilisateur",
    points: [
      "Photo de profil personnalisable",
      "Tous mes avis au même endroit",
    ],
  },
  {
    date: "2026-06-21",
    title: "Fiches restaurants collaboratives",
    points: [
      "Page détaillée, badges, coordonnées",
      "Photos et menus partagés par tous",
      "Avis et notes",
      "Carte et itinéraire",
    ],
  },
  {
    date: "2026-06-17",
    title: "Refonte visuelle",
    points: ["Refonte visuelle complète du site", "Thème sombre"],
  },

  // ───────────────────────── Juin 2025 ─────────────────────────
  {
    date: "2025-06-16",
    title: "Favoris",
    points: [
      "Ajouter et filtrer les restaurants favoris",
    ],
  },
  {
    date: "2025-06-08",
    title: "Gestion de compte",
    points: [
      "Inscription / connexion",
      "Exclusif aux collaborateurs d'INFFLUX",
    ],
  },

  // ──────────────────────── Avril 2025 ────────────────────────
  {
    date: "2025-04-29",
    title: "Recherche avancée",
    points: [
      "Barre de recherche",
      "Filtres",
      "Tri par pertinence, note, avis, proximité",
    ],
  },
  {
    date: "2025-04-23",
    title: "Lancement d'INFFLUNCH",
    points: [
      "Catalogue des restaurants autour d'INFFLUX",
    ],
  },
];

/** Date de la nouveauté la plus récente (pour la pastille « non vu »). */
export const latestChangelogDate = changelog.reduce(
  (max, e) => (e.date > max ? e.date : max),
  ""
);
