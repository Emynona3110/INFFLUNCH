import badgeVegetarian from "../assets/Vegetarian.svg";
import badgeTable from "../assets/Table.svg";
import badgeTakeaway from "../assets/Takeaway.svg";
import badgeClickCollect from "../assets/ClickCollect.svg";
import iconTopRated from "../assets/TopRated.png";

/** Badge posé par la base (trigger) dès qu'un restaurant a une URL de
 *  commande : il ne se coche pas à la main dans l'admin. */
export const CLICK_COLLECT_BADGE = "Click & Collect";

const badgeMap: Record<string, string> = {
  "Option Végétarienne": badgeVegetarian,
  "Sur Place": badgeTable,
  "À Emporter": badgeTakeaway,
  [CLICK_COLLECT_BADGE]: badgeClickCollect,
};

export const getBadgeIcon = (label: string): string | undefined =>
  badgeMap[label];

export const topRatedIcon = iconTopRated;

export default badgeMap;
