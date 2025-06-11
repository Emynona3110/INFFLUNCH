import badgeVegetarian from "../assets/Vegetarian.png";
import badgeTooGoodToGo from "../assets/TooGoodToGo.png";
import badgeBar from "../assets/Bar.png";
import badgeTable from "../assets/Table.png";
import badgeTakeaway from "../assets/Takeaway.png";
import iconTopRated from "../assets/TopRated.png";

const badgeMap: Record<string, string> = {
  "Option Végétarienne": badgeVegetarian,
  "Sur Place": badgeTable,
  "À Emporter": badgeTakeaway,
  Bar: badgeBar,
  TooGoodToGo: badgeTooGoodToGo,
};

export const getBadgeIcon = (label: string): string | undefined =>
  badgeMap[label];

export const topRatedIcon = iconTopRated;

export default badgeMap;
