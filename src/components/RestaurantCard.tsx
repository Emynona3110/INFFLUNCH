import {
  Box,
  Card,
  CardBody,
  Heading,
  HStack,
  Text,
  VStack,
  useColorModeValue,
  Image,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { Restaurant } from "../hooks/useRestaurants";
import RestaurantRating from "./StarRating";
import TagsList from "./TagsList";
import LikeButton from "./LikeButton";
import DistanceToCompany from "./Distance";
import noImage from "../assets/no-image.jpg";
import RestaurantBadges from "./RestaurantBadges";

interface RestaurantCardProps {
  restaurant: Restaurant;
  topRated: { id: number }[];
  liked: boolean;
  onLikeToggle: (liked: boolean) => Promise<void>;
}

const RestaurantCard = ({
  restaurant,
  topRated = [],
  liked,
  onLikeToggle,
}: RestaurantCardProps) => {
  const toast = useToast();
  const [isLikedLocal, setIsLikedLocal] = useState(liked);

  const toggleLike = async () => {
    const previous = isLikedLocal;
    const next = !previous;
    setIsLikedLocal(next);

    try {
      await onLikeToggle(next);
      window.dispatchEvent(new Event("favorites:updated"));
    } catch (err) {
      setIsLikedLocal(previous);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les favoris.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

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
          src={restaurant.image === null ? noImage : restaurant.image}
          alt={restaurant.name}
          boxSize="100%"
          objectFit="cover"
          transition="transform 0.3s ease-in-out"
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
          <DistanceToCompany distanceLabel={restaurant.distanceLabel} />
        </Box>
      </Box>

      <CardBody>
        <VStack alignItems="left" spacing={2}>
          <HStack justifyContent="space-between" width="100%">
            <Heading fontSize="2xl">{restaurant.name}</Heading>
            <RestaurantBadges
              restaurantId={restaurant.id}
              badges={restaurant.badges}
              topRated={topRated}
            />
          </HStack>

          <HStack
            minHeight={"24px"}
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
            <LikeButton liked={isLikedLocal} onClick={toggleLike} />
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default RestaurantCard;
