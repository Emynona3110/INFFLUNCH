import { Wrap, WrapItem, Tooltip } from "@chakra-ui/react";
import BadgeImage from "./BadgeImage";
import badgeVegetarian from "../assets/Vegetarian.png";
import badgeTooGoodToGo from "../assets/TooGoodToGo.png";
import iconTopRated from "../assets/TopRated.png";

interface RestaurantBadgesProps {
  restaurantId: number;
  badges: string[];
  topRated: { id: number }[];
}

const badgeMap: Record<string, string> = {
  "Option Végétarienne": badgeVegetarian,
  TooGoodToGo: badgeTooGoodToGo,
};

const RestaurantBadges = ({
  restaurantId,
  badges,
  topRated,
}: RestaurantBadgesProps) => {
  const isTopRated = topRated.some(
    (restaurant) => restaurant.id === restaurantId
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
