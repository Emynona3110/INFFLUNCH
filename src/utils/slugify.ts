export const slugify = (label: string): string =>
  label
    .toLowerCase()
    .replace(/^(la|le|les|the)\s+/i, "") // article défini en tête : "la ", "le "…
    .replace(/^(l|d|j|m|t|s|n|c|qu)'/i, "") // élision française en tête : "l'", "d'", "qu'"…
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/['’]/g, "-") // apostrophes restantes (ex. "O'Five") → tiret, pas suppression
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "") // autres caractères non autorisés
    .replace(/-+/g, "-") // pas de tirets multiples
    .replace(/^-+|-+$/g, ""); // pas de tiret en début/fin
