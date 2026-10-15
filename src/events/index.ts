import type { ComponentType } from "react";
import { EVENTS, type EventId } from "./calendar";

/** Ce qu'un évènement remplace ; tout est optionnel (absent = version habituelle). */
export type EventTheme = {
  /** Monogramme de la navbar (mobile). */
  Monogramme?: ComponentType<{ className?: string }>;
  /** Logotype de la navbar (desktop), ADMINFFLUNCH avec `admin`. */
  Logotype?: ComponentType<{ className?: string; admin?: boolean }>;
  /** Décor posé sur le filet du pied de page. */
  FooterDecor?: ComponentType;
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
