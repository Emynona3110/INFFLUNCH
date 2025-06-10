export const slugify = (label: string): string =>
  label
    .toLowerCase()
    .replace(/^(la|le|les|the)\s+/i, "") // Supprime "la ", "le ", "les ", "the " en début
    .replace(/^\p{L}'/u, "") // Supprime "l'", "d'", etc. uniquement en tout début
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/'/g, "") // Supprime toutes les apostrophes restantes
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, ""); // Supprime les autres caractères non autorisés
