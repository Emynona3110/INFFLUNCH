import { NoteCategory } from "./noteCategories";

/**
 * Natures d'une demande sur l'appli (colonne `feedback.type`, contrainte CHECK en
 * base — voir `sql/2026-09-03_feedback.sql`). Trois seulement : ce qui est
 * cassé, ce qui existe et peut mieux faire, ce qui manque.
 */
export const FEEDBACK_TYPES = [
  {
    value: "bug",
    label: "Bug",
    hint: "Quelque chose ne marche pas.",
    // Catégorie prise par la note de backlog quand la demande est acceptée.
    note: "correctif" as NoteCategory,
    chip: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  {
    value: "amelioration",
    label: "Amélioration",
    hint: "Ça marche, mais ça peut être mieux.",
    note: "amelioration" as NoteCategory,
    chip: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  {
    value: "fonctionnalite",
    label: "Fonctionnalité",
    hint: "Quelque chose à ajouter.",
    note: "fonctionnalite" as NoteCategory,
    chip: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
  },
] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number]["value"];

export const DEFAULT_FEEDBACK_TYPE: FeedbackType = "bug";

export const feedbackType = (value?: string | null) =>
  FEEDBACK_TYPES.find((t) => t.value === value) ?? FEEDBACK_TYPES[0];

/** Sort d'une demande. « Acceptée » = reportée dans le carnet de backlog ;
 *  « Refusée » = lue et écartée. Les deux restent visibles par leur auteur. */
export const FEEDBACK_STATUSES = [
  {
    value: "nouveau",
    label: "En attente",
    chip: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  },
  {
    value: "accepte",
    label: "Acceptée",
    chip: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  },
  {
    value: "refuse",
    label: "Refusée",
    chip: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  },
] as const;

export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number]["value"];

export const feedbackStatus = (value?: string | null) =>
  FEEDBACK_STATUSES.find((s) => s.value === value) ?? FEEDBACK_STATUSES[0];
