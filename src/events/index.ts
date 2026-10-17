import type { ComponentType, ReactNode } from "react";
import { EVENTS, type EventId } from "./calendar";

/** Ce qu'un évènement remplace ; tout est optionnel (absent = version habituelle). */
export type EventTheme = {
  /** Monogramme de la navbar (mobile). */
  Monogramme?: ComponentType<{ className?: string }>;
  /** Logotype de la navbar (desktop), ADMINFFLUNCH avec `admin`. */
  Logotype?: ComponentType<{ className?: string; admin?: boolean }>;
  /** Décor posé sur le filet du pied de page. */
  FooterDecor?: ComponentType;
  /** Décor du coin haut droit de la page Déjeuner (posé dans un conteneur
   *  `relative` de la largeur du contenu, hors du fondu-montée de la page).
   *  `useLoading` : ses données en premier chargement, que la page attend
   *  pour apparaître d'un bloc avec lui. */
  lunchDecor?: { Decor: ComponentType; useLoading: () => boolean };
  /** Remplaçant de la loupe de la recherche du classement ; rend `fallback`
   *  (la loupe) quand il n'a plus lieu d'être. */
  SearchIcon?: ComponentType<{ fallback: ReactNode; className?: string }>;
  /** Remplaçant du repère d'INFFLUX sur la carte des restaurants, rendu
   *  dans l'élément du repère (sans Leaflet dans le thème) ; rend
   *  `fallback` (la goutte) quand il n'a plus lieu d'être. */
  MapHomePin?: ComponentType<{ fallback: ReactNode }>;
  /** Remplaçant des dés de l'écran d'attente de la roulette ; rend
   *  `fallback` (les dés) quand il n'a plus lieu d'être. */
  RouletteIcon?: ComponentType<{ fallback: ReactNode; className?: string }>;
  /** Monté une fois sur les pages connectées (fenêtres de l'évènement…). */
  Overlay?: ComponentType;
  /** Rejouer une fenêtre de l'évènement depuis Admin › Évènements (réglages). */
  replays?: { label: string; detail: string; run: () => void }[];
  /** Encart de son PROPRE profil (avancement d'une quête…). */
  ProfileQuest?: ComponentType;
  /** Intros de l'écran de connexion (SVG bruts, version claire et blanche). */
  loginIntro?: {
    mono: string;
    monoWhite: string;
    logotype: string;
    logotypeWhite: string;
  };
};

// Choisi par index.html (calendrier + ?evenement=…) avant le démarrage de
// l'app : le monogramme de chargement et l'app sont toujours d'accord.
const marked = document.documentElement.dataset.event;
export const currentEvent: EventId | null =
  EVENTS.find((e) => e.id === marked)?.id ?? null;

const loaders: Record<EventId, () => Promise<{ default: EventTheme }>> = {
  halloween: () => import("./halloween"),
};

let theme: EventTheme | null = null;

/** Télécharge le thème de l'évènement en cours (rien hors période). À
 *  attendre avant le premier rendu : pas de logo habituel remplacé à vue. */
export const loadEventTheme = async () => {
  if (!currentEvent) return;
  try {
    theme = (await loaders[currentEvent]()).default;
  } catch {
    // Thème indisponible : le site garde ses animations habituelles.
  }
};

export const eventTheme = () => theme;
