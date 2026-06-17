// Le composant SortSelector n'est plus utilisé (le tri se fait dans FilterDialog).
// On conserve uniquement le type, importé par FilterDialog et UserPage.
export type SortOrder =
  | "relevance"
  | "reviews"
  | "rating"
  | "created_at"
  | "distance";
