import badgeVegetarian from "../assets/Vegetarian.svg";
import badgeTable from "../assets/Table.svg";
import badgeTakeaway from "../assets/Takeaway.svg";
import badgeClickCollect from "../assets/ClickCollect.svg";
import iconTopRated from "../assets/TopRated.png";

/** Badge posé par la base (trigger) dès qu'un restaurant a une URL de
 *  commande : il ne se coche pas à la main dans l'admin. */
export const CLICK_COLLECT_BADGE = "Click & Collect";

/** L'ordre de cet objet EST l'ordre d'affichage des badges, partout : cards,
 *  vue liste, fiche et table admin passent par `orderBadges`. Le tableau
 *  `restaurants.badges` en base, lui, peut être dans n'importe quel ordre (le
 *  trigger click & collect ajoute le sien à la fin). */
const badgeMap: Record<string, string> = {
  "À Emporter": badgeTakeaway,
  "Sur Place": badgeTable,
  [CLICK_COLLECT_BADGE]: badgeClickCollect,
  "Option Végétarienne": badgeVegetarian,
};

export const getBadgeIcon = (label: string): string | undefined =>
  badgeMap[label];

/** Badges d'une fiche, sans les inconnus et toujours dans le même ordre. */
export const orderBadges = (labels?: string[] | null): string[] =>
  Object.keys(badgeMap).filter((label) => labels?.includes(label));

export const topRatedIcon = iconTopRated;

export default badgeMap;
