import { useReducer } from "react";

export type SortDir = "asc" | "desc";
export type SortState<K extends string> = { key: K; dir: SortDir };

/**
 * Tri retenu par table, le temps de la session : il survit à la navigation
 * entre écrans admin (démontage du composant) et repart de zéro au
 * rechargement du site. En mémoire de module, volontairement pas en storage.
 */
const remembered = new Map<string, SortState<string>>();

/**
 * Tri d'une table admin par colonne, toujours explicite (chevron affiché dès
 * l'arrivée) : `initial` est le tri par défaut de la table. Deux états
 * seulement — un clic sur la colonne triée inverse le sens, un clic sur une
 * autre colonne la trie dans son premier sens (`firstDir`, croissant par
 * défaut ; un classement commence plutôt par le plus grand).
 * `tableId` identifie la table pour mémoriser son tri (cf. `remembered`).
 */
export function useTableSort<K extends string>(
  tableId: string,
  initial: SortState<K>,
  firstDir: (key: K) => SortDir = () => "asc"
) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const sort = (remembered.get(tableId) ?? initial) as SortState<K>;
  // `from` : le tri réellement affiché, s'il diffère du tri retenu (repli
  // du classement sur une colonne qui a du contenu) — le clic part de là.
  const toggle = (key: K, from: SortState<K> = sort) => {
    remembered.set(
      tableId,
      from.key === key
        ? { key, dir: from.dir === "asc" ? "desc" : "asc" }
        : { key, dir: firstDir(key) }
    );
    rerender();
  };
  return { sort, toggle, firstDir };
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
 * `tieKeys` : colonnes qui départagent les égalités, dans l'ordre, et dans le
 * même sens que le tri. Au-delà, le tri est stable : à valeurs égales, l'ordre
 * d'origine des lignes est conservé.
 */
export function sortRows<T, K extends string>(
  rows: T[],
  sort: SortState<K>,
  valueOf: (row: T, key: K) => unknown,
  tieKeys: K[] = []
): T[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  const keys = [sort.key, ...tieKeys];
  return [...rows].sort((a, b) => {
    for (const key of keys) {
      const c = compare(valueOf(a, key), valueOf(b, key));
      if (c) return sign * c;
    }
    return 0;
  });
}
