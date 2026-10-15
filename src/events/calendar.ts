/**
 * Calendrier des évènements : pendant sa période, un évènement remplace les
 * animations habituelles (logo, chargement, pied de page). Hors période, son
 * code et ses images ne sont pas téléchargés.
 *
 * Dates « MM-JJ », heure locale, chaque année : affichage dès 00 h 00
 * LEAD_DAYS jours avant le jour de l'évènement (`date`), jusqu'au jour `to`
 * inclus. Une période peut enjamber le nouvel an (from > to).
 *
 * Lu au build par vite.config.ts et injecté dans index.html, qui choisit
 * l'évènement avant même le chargement de l'app (monogramme de démarrage).
 * Aperçu avant la période : onglet Admin › Évènements (réglage du navigateur
 * de l'admin seulement, cf. PREVIEW_KEY).
 */
const LEAD_DAYS = 10;

const DEFINITIONS = [
  { id: "halloween", label: "Halloween", date: "10-31", to: "11-02" },
] as const satisfies readonly { id: string; label: string; date: string; to: string }[];

export type EventId = (typeof DEFINITIONS)[number]["id"];

const pad = (n: number) => String(n).padStart(2, "0");
const md = (d: Date) => `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** « 10-31 » moins `days` jours → « 10-21 » (année non bissextile de référence). */
const daysBefore = (date: string, days: number) => {
  const [m, d] = date.split("-").map(Number);
  return md(new Date(2001, m - 1, d - days));
};

export const EVENTS = DEFINITIONS.map((e) => ({
  ...e,
  from: daysBefore(e.date, LEAD_DAYS),
}));

/** Aperçu admin (localStorage) : id d'un évènement ou « aucun » ; absent =
 *  calendrier. Lu par index.html. */
export const PREVIEW_KEY = "evenement-apercu";
export const PREVIEW_NONE = "aucun";

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
