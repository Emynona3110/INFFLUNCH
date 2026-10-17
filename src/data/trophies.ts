// Catalogue des trophées — EN DUR, À PART des succès (aucune incidence sur
// « Banquet final », pas de % de rareté). Un trophée récompense un évènement
// daté et ne s'obtient plus ensuite. Obtentions : table `user_trophies`
// (sql/2026-10-17_event_candies.sql), lisible par tous pour les profils.
//
// Les images sont de simples fichiers de public/ : visibles toute l'année
// sans rien ajouter au code du site.

import { EVENTS } from "@/events/calendar";

export type TrophyId = "halloween_2026_candies";

/** Début d'un évènement une année donnée, à 00 h 00 (heure locale). */
const eventStart = (id: string, year: number) => {
  const from = EVENTS.find((e) => e.id === id)?.from ?? "01-01";
  const [m, d] = from.split("-").map(Number);
  return new Date(year, m - 1, d);
};

export interface Trophy {
  id: TrophyId;
  title: string;
  /** L'évènement qu'il rappelle. */
  event: string;
  /** Visible des AUTRES à partir de cette date seulement (début de
   *  l'évènement) : un trophée obtenu avant (tests admin) reste privé.
   *  Même règle côté base (RLS de user_trophies). */
  visibleFrom: Date;
  /** Ce qu'il a fallu faire, affiché dans sa fiche. */
  description: string;
  /** Image fixe (thème clair, thème sombre). */
  image: string;
  imageDark: string;
  /** Même image cadrée au plus juste, pour le badge à côté du nom. */
  badge: string;
  badgeDark: string;
  /** Version animée, jouée au survol ou au toucher (dans sa fiche). */
  animated: string;
  animatedDark: string;
}

export const TROPHIES: Trophy[] = [
  {
    id: "halloween_2026_candies",
    title: "Trick or Treat",
    event: "Halloween 2026",
    visibleFrom: eventStart("halloween", 2026),
    description: "Terminer la quête des bonbons",
    image: "/trophies/halloween-2026.svg",
    imageDark: "/trophies/halloween-2026-sombre.svg",
    badge: "/trophies/halloween-2026-badge.svg",
    badgeDark: "/trophies/halloween-2026-badge-sombre.svg",
    animated: "/trophies/halloween-2026-saut.svg",
    animatedDark: "/trophies/halloween-2026-saut-sombre.svg",
  },
];

export const TROPHIES_BY_ID = Object.fromEntries(
  TROPHIES.map((t) => [t.id, t]),
) as Record<TrophyId, Trophy>;
