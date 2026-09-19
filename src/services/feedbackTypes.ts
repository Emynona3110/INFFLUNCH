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

/**
 * Où en est le TRAITEMENT d'une demande — l'auteur le voit aussi, c'est la
 * réponse qu'on lui doit :
 *   - « En attente » : arrivée, corrigée depuis son classement, ou relancée
 *                      par son auteur dans le fil — la balle est chez l'admin ;
 *   - « Répondue »   : l'admin a écrit dans le fil sans classer — la balle est
 *                      chez l'auteur (posé par la base) ;
 *   - « Acceptée »   : reportée dans le carnet de backlog ;
 *   - « Terminée »   : la note du carnet a été cochée (posé par la base) ;
 *   - « Refusée »    : lue et écartée ;
 *   - « Clôturée »   : le fil a réglé la question, rien à porter au backlog
 *                      (appui long de l'admin dans la popup).
 * Terminée, Refusée et Clôturée figent la demande pour son auteur : plus de
 * correction, plus de message dans le fil.
 *
 * L'ordre du tableau est celui des sections de la boîte de réception admin.
 * L'annulation par l'auteur n'est pas là-dedans : c'est une autre dimension
 * (`feedback.cancelled_at`), qui n'interrompt pas le traitement.
 */
export const FEEDBACK_STATUSES = [
  {
    value: "nouveau",
    label: "En attente",
    chip: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  },
  {
    value: "repondu",
    label: "Répondue",
    chip: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-400",
  },
  {
    value: "accepte",
    label: "Acceptée",
    chip: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  },
  {
    value: "termine",
    label: "Terminée",
    chip: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  },
  {
    value: "refuse",
    label: "Refusée",
    chip: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  },
  {
    value: "clos",
    label: "Clôturée",
    chip: "bg-muted text-foreground/55",
  },
] as const;

export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number]["value"];

export const feedbackStatus = (value?: string | null) =>
  FEEDBACK_STATUSES.find((s) => s.value === value) ?? FEEDBACK_STATUSES[0];

/** Classée sans retour possible : l'auteur ne corrige plus, n'écrit plus. */
export const isFeedbackFrozen = (status: FeedbackStatus) =>
  status === "termine" || status === "refuse" || status === "clos";

/** Demande retirée par son auteur : plus rien de neuf ne viendra d'elle, mais
 *  l'admin la garde sous les yeux (et son backlog, s'il y en a un). */
export const FEEDBACK_CANCELLED = {
  label: "Annulée",
  chip: "bg-muted text-foreground/55",
} as const;
