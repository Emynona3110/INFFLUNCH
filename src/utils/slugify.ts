export const slugify = (label: string): string =>
  label
    .toLowerCase()
    .replace(/\b\p{L}'/gu, "") // Supprime "l'", "d'", etc.
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
