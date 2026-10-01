// Prix du midi : la fourchette d'un restaurant est la MÉDIANE des bornes que
// les collaborateurs déclarent dépenser sur place, calculée en base par trigger
// (cf. sql/2026-09-28_restaurant_prices.sql). Le front n'agrège rien : si
// price_low est renseigné, la fourchette est publiable telle quelle.

/** Colonnes de prix du restaurant (sous-ensemble de Restaurant). */
export interface PriceFields {
  price_low: number | null;
  price_high: number | null;
  price_count: number;
}

export interface PriceRange {
  low: number;
  high: number;
  /** Nombre de collègues ayant déclaré (au moins 1 dès qu'il y a une fourchette). */
  count: number;
}

/** Fourchette à afficher, ou null tant que personne n'a déclaré. */
export const effectivePriceRange = (r: PriceFields): PriceRange | null =>
  r.price_low != null && r.price_high != null
    ? { low: r.price_low, high: r.price_high, count: r.price_count ?? 0 }
    : null;

/**
 * Montant à la française : 12 — 12,50 — 12,75. Des centimes s'écrivent sur deux
 * chiffres (« 12,50 », pas « 12,5 »), un montant rond reste nu.
 * Sert aux montants SAISIS (au centime) ; la fourchette publiée, elle, est en
 * euros entiers.
 */
export const formatAmount = (value: number): string => {
  const amount = Number(value);
  return (Number.isInteger(amount) ? String(amount) : amount.toFixed(2)).replace(
    ".",
    ",",
  );
};

/** "14-18 €", ou "~15 €" quand les deux bornes tombent sur le même euro. */
export const formatPriceRange = (p: PriceRange): string =>
  p.low === p.high ? `~${p.low} €` : `${p.low}-${p.high} €`;

/** Texte de l'infobulle : ce que couvre le prix, et sur quoi il repose. */
export const priceRangeHint = (p: PriceRange): string =>
  `Prix du midi, par personne — d'après ${p.count} collègue${p.count > 1 ? "s" : ""}`;

/**
 * Montants proposés en un tap, pour éviter d'ouvrir un pavé numérique : c'est
 * le clavier, pas la question, qui décourage la déclaration.
 *
 * Quand le restaurant a déjà une fourchette, on propose ses deux bornes et son
 * milieu — les montants que les collègues ont réellement payés. Sinon, trois
 * repères du marché local (le midi tient entre 10 et 25 €, cf. l'en-tête de
 * sql/2026-09-28_restaurant_prices.sql).
 *
 * ⚠️ Effet d'ancrage assumé : proposer la médiane actuelle attire les nouvelles
 * déclarations vers elle, donc fige un peu la fourchette. C'est pourquoi la
 * saisie libre reste toujours offerte à côté des pastilles.
 */
export const DEFAULT_QUICK_PRICES = [12, 15, 20];

/** Écart appliqué de part et d'autre d'une fourchette plate (une seule valeur
 *  connue) : sans lui, on n'aurait qu'une pastille à proposer. */
const FLAT_RANGE_SPREAD = 2;

export const quickPriceSuggestions = (r: PriceFields): number[] => {
  const price = effectivePriceRange(r);
  if (!price) return DEFAULT_QUICK_PRICES;

  const { low, high } = price;
  if (low === high) {
    return [low - FLAT_RANGE_SPREAD, low, low + FLAT_RANGE_SPREAD].filter(
      (v) => v >= 1,
    );
  }
  // Le milieu peut tomber sur une borne (fourchette de 1 €) : on dédoublonne.
  return [...new Set([low, Math.round((low + high) / 2), high])].sort(
    (a, b) => a - b,
  );
};

/** Bornes du curseur de filtre, en euros par personne. */
export const PRICE_FILTER_MIN = 0;
export const PRICE_FILTER_MAX = 50;

/** Plage choisie au curseur ; la borne haute au maximum vaut « et plus ». */
export type PriceRangeFilter = [number, number];

export const DEFAULT_PRICE_FILTER: PriceRangeFilter = [
  PRICE_FILTER_MIN,
  PRICE_FILTER_MAX,
];

/** Une plage collée aux deux bornes ne filtre rien : on la traite comme absente. */
export const isPriceFilterActive = (range?: PriceRangeFilter): boolean =>
  !!range && (range[0] > PRICE_FILTER_MIN || range[1] < PRICE_FILTER_MAX);

/** Libellé de la plage : « 12-25 € », « 12-50 € et + ». */
export const formatPriceFilter = ([min, max]: PriceRangeFilter): string =>
  `${min}-${max} €${max >= PRICE_FILTER_MAX ? " et +" : ""}`;
