/**
 * Calendrier des évènements : pendant sa période, un évènement remplace les
 * animations habituelles (logo, chargement, pied de page). Hors période, son
 * code et ses images ne sont pas téléchargés.
 *
 * Dates « MM-JJ » incluses, heure locale, chaque année. Une période peut
 * enjamber le nouvel an (from > to).
 *
 * Lu au build par vite.config.ts et injecté dans index.html, qui choisit
 * l'évènement avant même le chargement de l'app (monogramme de démarrage).
 * Aperçu avant la période : onglet Admin › Évènements (réglage du navigateur
 * de l'admin seulement, cf. PREVIEW_KEY).
 */
export const EVENTS = [
  { id: "halloween", label: "Halloween", from: "10-24", to: "11-02" },
] as const satisfies readonly { id: string; label: string; from: string; to: string }[];

export type EventId = (typeof EVENTS)[number]["id"];

/** Aperçu admin (localStorage) : id d'un évènement ou « aucun » ; absent =
 *  calendrier. Lu par index.html. */
export const PREVIEW_KEY = "evenement-apercu";
export const PREVIEW_NONE = "aucun";

const md = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Évènement du calendrier à cette date (même règle qu'index.html). */
export const scheduledEvent = (date = new Date()): EventId | null => {
  const today = md(date);
  const e = EVENTS.find((e) =>
    e.from <= e.to
      ? today >= e.from && today <= e.to
      : today >= e.from || today <= e.to,
  );
  return e?.id ?? null;
};
