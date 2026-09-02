import { useMemo } from "react";
import useTags from "./useTags";
import { tagCategoryRank } from "../services/tagCategories";

/**
 * `restaurants.tags` ne stocke que des libellés : la catégorie vit dans la
 * table `tags`. On reconstruit donc une map libellé → catégorie à partir du
 * cache TanStack déjà chargé (clé `["tags"]`, aucune requête supplémentaire).
 * Clé en minuscules pour rester tolérant à une différence de casse.
 */
export const useTagCategories = () => {
  const { data } = useTags();

  return useMemo(() => {
    const map = new Map<string, string>();
    (data ?? []).forEach((t) => map.set(t.label.toLowerCase(), t.category));
    return map;
  }, [data]);
};

/**
 * Ordonne les tags d'un restaurant : d'abord les origines (Japonais, Italien…),
 * puis les caractéristiques (Bistrot, Terrasse…), puis les plats (Sushi,
 * Burger…). À l'intérieur d'une catégorie, l'ordre d'origine est conservé (il
 * est déjà alphabétique en base). Un tag inconnu de la table passe en dernier.
 * Tant que la liste des tags n'est pas chargée, l'ordre reste inchangé.
 */
const useSortedTags = (tags?: string[] | null) => {
  const categories = useTagCategories();

  return useMemo(() => {
    const list = tags ?? [];
    if (categories.size === 0) return list;

    return list
      .map((label, index) => ({
        label,
        index,
        rank: tagCategoryRank(categories.get(label.toLowerCase())),
      }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map((t) => t.label);
  }, [tags, categories]);
};

export default useSortedTags;
