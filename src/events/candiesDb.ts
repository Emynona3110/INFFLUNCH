/**
 * Chasse aux bonbons : Halloween 2026 SEULEMENT (les années suivantes, le
 * thème revient sans bonbons). Les trouver tous donne un trophée, visible sur
 * le profil (src/data/trophies.ts).
 *
 * `CANDIES_DB` : chasse branchée sur la base (sql/2026-10-17_event_candies.sql,
 * joué le 2026-10-17). À `false`, bonbons et trophée ne vivraient que le temps
 * de la visite (un rechargement remet tout en place) et la remise à zéro
 * admin serait masquée.
 */
export const CANDIES_DB = true;

/** Seule année de la chasse. */
export const CANDY_HUNT_YEAR = 2026;

/** La chasse a-t-elle lieu cette année ? */
export const candyHuntOn = () => new Date().getFullYear() === CANDY_HUNT_YEAR;
