/**
 * Catégories de tags (colonne `tags.category`, contrainte CHECK en base — voir
 * `sql/2026-09-02_tags_categories.sql`). Trois familles, volontairement peu
 * nombreuses, pour que les tags restent lisibles côté filtres.
 */
export const TAG_CATEGORIES = [
  {
    value: "origine",
    label: "Origine",
    hint: "La cuisine ou le pays : Français, Japonais, Turc…",
  },
  {
    value: "caracteristique",
    label: "Caractéristique",
    hint: "Le lieu, le service, l'ambiance : Bistrot, Terrasse, Traiteur, Bio…",
  },
  {
    value: "specialite",
    label: "Spécialité",
    hint: "Le plat ou le produit : Kebab, Sushi, Salade, Quiche…",
  },
] as const;

export type TagCategory = (typeof TAG_CATEGORIES)[number]["value"];

/** Catégorie par défaut (identique au DEFAULT de la colonne). */
export const DEFAULT_TAG_CATEGORY: TagCategory = "specialite";

export const tagCategoryLabel = (value?: string | null) =>
  TAG_CATEGORIES.find((c) => c.value === value)?.label ?? "Spécialité";

/** Ordre d'affichage : origine, puis caractéristique, puis spécialité. */
export const tagCategoryRank = (value?: string | null) => {
  const i = TAG_CATEGORIES.findIndex((c) => c.value === value);
  return i === -1 ? TAG_CATEGORIES.length : i;
};

// Mots qui restent en minuscule au milieu d'un libellé (« Fruits de Mer »).
const SMALL_WORDS = new Set([
  "de",
  "du",
  "des",
  "à",
  "au",
  "aux",
  "en",
  "et",
  "la",
  "le",
  "les",
  "sur",
]);

/**
 * Met en forme un libellé de tag : une majuscule par mot (et après un trait
 * d'union : « Tex-Mex », « Hot-Dog »), sauf les petits mots de liaison.
 * L'espace final n'est PAS retiré, sinon on ne pourrait pas taper un tag en
 * plusieurs mots dans un champ contrôlé ; les appels d'écriture font `.trim()`.
 */
export const formatTagLabel = (input: string) =>
  input
    .replace(/\s+/g, " ")
    .trimStart()
    .split(" ")
    .map((word, index) =>
      index > 0 && SMALL_WORDS.has(word.toLowerCase())
        ? word.toLowerCase()
        : word
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join("-")
    )
    .join(" ");
