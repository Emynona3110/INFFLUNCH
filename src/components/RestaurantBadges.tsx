import { Wrap, WrapItem, Tooltip } from "@chakra-ui/react";
import BadgeImage from "./BadgeImage";
import badgeVegetarian from "../assets/Vegetarian.png";
import badgeTooGoodToGo from "../assets/TooGoodToGo.png";
import iconTopRated from "../assets/TopRated.png";
import TopRated from "../data/top_rated";

interface RestaurantBadgesProps {
  restaurantId: number;
  badges: string[];
}

const badgeMap: Record<string, string> = {
  "Option Végétarienne": badgeVegetarian,
  TooGoodToGo: badgeTooGoodToGo,
};

const RestaurantBadges = ({ restaurantId, badges }: RestaurantBadgesProps) => {
  const isTopRated = TopRated.some(
    (item) => item.restaurant_id === restaurantId
  );

  return (
    <Wrap>
      {badges &&
        badges.map((badge) =>
          badgeMap[badge] ? (
            <Tooltip key={badge} label={badge} placement="top" fontSize="sm">
              <WrapItem>
                <BadgeImage src={badgeMap[badge]} alt={badge} />
              </WrapItem>
            </Tooltip>
          ) : null
        )}

      {isTopRated && (
        <Tooltip label="Top 3 des mieux notés" placement="top" fontSize="sm">
          <WrapItem>
            <BadgeImage src={iconTopRated} alt="Top 3 des mieux notés" />
          </WrapItem>
        </Tooltip>
      )}
    </Wrap>
  );
};

export default RestaurantBadges;
