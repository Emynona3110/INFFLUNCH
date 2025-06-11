import { Wrap, WrapItem, Tooltip } from "@chakra-ui/react";
import BadgeImage from "./BadgeImage";
import badgeMap, { topRatedIcon } from "../services/badgeMap";

interface RestaurantBadgesProps {
  restaurantId: number;
  badges: string[];
  topRated: { id: number }[];
}

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
        <Tooltip
          label="Top 3 des mieux notés"
          placement="top"
          fontSize="sm"
          overflow={"hidden"}
          modifiers={[
            {
              name: "preventOverflow",
              options: {
                boundary: "clippingParents", // empêche le débordement
                padding: 4,
              },
            },
          ]}
        >
          <WrapItem>
            <BadgeImage src={topRatedIcon} alt="Top 3 des mieux notés" />
          </WrapItem>
        </Tooltip>
      )}
    </Wrap>
  );
};

export default RestaurantBadges;
