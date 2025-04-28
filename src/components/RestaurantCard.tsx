import {
  Box,
  Card,
  CardBody,
  Heading,
  HStack,
  Image,
  Text,
  VStack,
  useColorModeValue,
  Wrap,
  Tooltip,
} from "@chakra-ui/react";
import { Restaurant } from "../hooks/useRestaurants";
import RestaurantRating from "./StarRating";
import TagsList from "./TagsList";
import LikeButton from "./LikeButton";
import DistanceToCompany from "./Distance";
import noImage from "../assets/no-image.png";
import badgeVegetarian from "../assets/Vegetarian.png";
import badgeTooGoodToGo from "../assets/TooGoodToGo.png";
import iconTopRated from "../assets/TopRated.png";
import TopRated from "../data/top_rated";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

const RestaurantCard = ({ restaurant }: RestaurantCardProps) => {
  const badgeMap: Record<string, string> = {
    "Option Végétarienne": badgeVegetarian,
    TooGoodToGo: badgeTooGoodToGo,
  };

  const isTopRated = TopRated.some(
    (item) => item.restaurant_id === restaurant.id
  );

  return (
    <Card
      role="group"
      cursor="pointer"
      borderRadius="10"
      overflow="hidden"
      width="100%"
      transition="box-shadow 0.3s ease-in-out"
      _hover={{ boxShadow: "lg" }}
    >
      <Box height="200px" overflow="hidden" position="relative">
        <Image
          src={restaurant.image === "" ? noImage : restaurant.image}
          alt={restaurant.name}
          boxSize="100%"
          objectFit="cover"
          transition="transform 0.5s ease-in-out"
          _groupHover={{
            transform: "scale(1.02)",
          }}
        />

        <Box
          position="absolute"
          bottom="8px"
          left="8px"
          bg={useColorModeValue("whiteAlpha.500", "blackAlpha.500")}
          color={useColorModeValue("black", "white")}
          fontSize="sm"
          borderRadius="md"
          backdropFilter="blur(4px)"
        >
          <DistanceToCompany address={restaurant.address} />
        </Box>
      </Box>

      <CardBody>
        <VStack alignItems="left" spacing={2}>
          <HStack justifyContent="space-between" width="auto">
            <Heading fontSize="2xl">{restaurant.name}</Heading>
            <Wrap>
              {/* Badges classiques */}
              {restaurant.badges.map((badge) =>
                badgeMap[badge] ? (
                  <Tooltip
                    key={badge}
                    label={badge}
                    placement="top"
                    fontSize="sm"
                    borderRadius="md"
                  >
                    <Image
                      src={badgeMap[badge]}
                      alt={badge}
                      boxSize="24px"
                      objectFit="contain"
                      borderRadius="md"
                    />
                  </Tooltip>
                ) : null
              )}

              {/* Badge TopRated */}
              {isTopRated && (
                <Tooltip
                  key="top-rated"
                  label="Top 3 des mieux notés"
                  placement="top"
                  fontSize="sm"
                  borderRadius="md"
                >
                  <Image
                    src={iconTopRated}
                    alt="Top 3 des mieux notés"
                    boxSize="24px"
                    objectFit="contain"
                    borderRadius="md"
                  />
                </Tooltip>
              )}
            </Wrap>
          </HStack>

          <HStack
            verticalAlign="middle"
            color={useColorModeValue("gray.500", "gray.400")}
          >
            <RestaurantRating rating={restaurant.rating} />
            {restaurant.reviews > 0 && (
              <>
                <Text fontSize="md">{restaurant.rating}</Text>
                <Text
                  fontSize="md"
                  color={useColorModeValue("gray.300", "gray.600")}
                >
                  |
                </Text>
                <Text fontSize="md">{restaurant.reviews} avis</Text>
              </>
            )}
          </HStack>

          <HStack justifyContent="space-between" width="100%">
            <TagsList tags={restaurant.tags} />
            <LikeButton onClick={() => {}} />
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default RestaurantCard;
