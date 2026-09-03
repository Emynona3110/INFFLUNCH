/**
 * Catégories du carnet de backlog admin (colonne `admin_notes.category`,
 * contrainte CHECK en base — voir `sql/2026-09-03_admin_notes.sql`). Trois
 * familles : ce qui est cassé, ce qui existe mais peut mieux faire, et ce qui
 * n'existe pas encore.
 */
export const NOTE_CATEGORIES = [
  {
    value: "correctif",
    label: "Correctif",
    hint: "Quelque chose ne marche pas.",
    // Pastille : classes complètes (Tailwind ne lit pas les noms construits).
    chip: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  {
    value: "amelioration",
    label: "Amélioration",
    hint: "Ça marche, mais ça peut être mieux.",
    chip: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  {
    value: "fonctionnalite",
    label: "Fonctionnalité",
    hint: "Quelque chose à ajouter.",
    chip: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
  },
] as const;

export type NoteCategory = (typeof NOTE_CATEGORIES)[number]["value"];

/** Catégorie par défaut (identique au DEFAULT de la colonne). */
export const DEFAULT_NOTE_CATEGORY: NoteCategory = "amelioration";

export const noteCategory = (value?: string | null) =>
  NOTE_CATEGORIES.find((c) => c.value === value) ?? NOTE_CATEGORIES[1];
