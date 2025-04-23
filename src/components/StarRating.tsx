import { useColorModeValue, HStack, Icon } from "@chakra-ui/react";
import { FaStar, FaStarHalfAlt } from "react-icons/fa";

interface RestaurantRatingProps {
  rating: number | null;
  size?: string;
  filledColor?: string;
  emptyColor?: string;
}

const RestaurantRating = ({
  rating,
  size = "20px",
  filledColor = "#f59e0b",
  emptyColor,
}: RestaurantRatingProps) => {
  const rounded = Math.ceil((rating ?? 0) * 2) / 2;
  const effectiveEmptyColor =
    emptyColor ?? useColorModeValue("gray.300", "gray.800");

  const getStarIcon = (index: number) => {
    const value = index + 1;
    if (rounded >= value) return FaStar;
    if (rounded === value - 0.5) return FaStarHalfAlt;
    return FaStar;
  };

  const getStarColor = (index: number) => {
    const value = index + 1;
    if (rounded >= value || rounded === value - 0.5) return filledColor;
    return effectiveEmptyColor;
  };

  return (
    <HStack spacing="2px">
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon
          key={i}
          as={getStarIcon(i)}
          color={getStarColor(i)}
          boxSize={size}
        />
      ))}
    </HStack>
  );
};

export default RestaurantRating;
