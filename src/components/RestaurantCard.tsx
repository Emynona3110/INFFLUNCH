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
  Icon,
} from "@chakra-ui/react";
import { Restaurant } from "../hooks/useRestaurants";
import noImage from "../assets/no-image.png";
import RestaurantRating from "./StarRating";
import TagsList from "./TagsList";
import LikeButton from "./LikeButton";
import { FaLeaf } from "react-icons/fa";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

const RestaurantCard = ({ restaurant }: RestaurantCardProps) => {
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
      <Box height="200px" overflow="hidden">
        <Image
          src={restaurant.image === "" ? noImage : restaurant.image}
          alt={restaurant.name}
          w="100%"
          h="100%"
          objectFit="cover"
          transition="transform 0.5s ease-in-out"
          _groupHover={{
            transform: "scale(1.02)",
          }}
        />
      </Box>

      <CardBody>
        <VStack alignItems="left" spacing={2}>
          <HStack>
            <Heading fontSize="2xl">{restaurant.name}</Heading>
            {restaurant.veggie && (
              <Icon as={FaLeaf} boxSize={5} color="green.500" />
            )}
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
