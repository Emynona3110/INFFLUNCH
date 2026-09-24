import { useState } from "react";

export type SortDir = "asc" | "desc";
export type SortState<K extends string> = { key: K; dir: SortDir } | null;

/**
 * Tri d'une table admin par colonne : un clic trie en ordre croissant, deux en
 * décroissant, trois rendent son ordre naturel à la table (`null` = celui de la
 * requête, en attente d'abord ou plus récent d'abord selon les cas).
 */
export function useTableSort<K extends string>() {
  const [sort, setSort] = useState<SortState<K>>(null);
  const toggle = (key: K) =>
    setSort((s) =>
      !s || s.key !== key
        ? { key, dir: "asc" }
        : s.dir === "asc"
          ? { key, dir: "desc" }
          : null
    );
  return { sort, toggle };
}

/** Compare deux valeurs de cellule ; les vides finissent toujours en bas. */
const compare = (a: unknown, b: unknown) => {
  const empty = (v: unknown) => v === null || v === undefined || v === "";
  if (empty(a) && empty(b)) return 0;
  if (empty(a)) return 1;
  if (empty(b)) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean")
    return Number(a) - Number(b);
  // « numeric » pour que Tag 2 passe avant Tag 10 ; « base » pour ignorer la
  // casse et les accents, comme on s'y attend d'une liste de noms.
  return String(a).localeCompare(String(b), "fr", {
    numeric: true,
    sensitivity: "base",
  });
};

/**
 * Trie une copie de `rows` selon `sort`, `valueOf` donnant la valeur triable
 * d'une ligne pour une colonne (un timestamp pour une date, par exemple).
 * `sort` à null rend les lignes telles quelles. Le tri est stable : à valeurs
 * égales, l'ordre naturel de la table est conservé.
 */
export function sortRows<T, K extends string>(
  rows: T[],
  sort: SortState<K>,
  valueOf: (row: T, key: K) => unknown
): T[] {
  if (!sort) return rows;
  const sorted = [...rows].sort((a, b) =>
    compare(valueOf(a, sort.key), valueOf(b, sort.key))
  );
  return sort.dir === "asc" ? sorted : sorted.reverse();
}
