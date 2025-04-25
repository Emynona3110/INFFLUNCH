import { Box, HStack, useColorModeValue } from "@chakra-ui/react";
import { FaStar } from "react-icons/fa";

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
  const rounded = Math.floor((rating ?? 0) * 2) / 2;
  const effectiveEmptyColor =
    emptyColor ?? useColorModeValue("gray.300", "gray.700");

  const percentage = (rounded / 5) * 100;

  return (
    <Box position="relative" display="inline-block">
      {/* Couche grise - fond */}
      <HStack spacing="1px">
        {Array.from({ length: 5 }).map((_, i) => (
          <Box
            key={`bg-${i}`}
            as={FaStar}
            boxSize={size}
            color={effectiveEmptyColor}
          />
        ))}
      </HStack>

      {/* Couche jaune - dessus */}
      <Box
        position="absolute"
        top="0"
        left="0"
        width="100%"
        height="100%"
        clipPath={`inset(0 ${100 - percentage}% 0 0)`} // Découpe propre
      >
        <HStack spacing="1px">
          {Array.from({ length: 5 }).map((_, i) => (
            <Box
              key={`fg-${i}`}
              as={FaStar}
              boxSize={size}
              color={filledColor}
            />
          ))}
        </HStack>
      </Box>
    </Box>
  );
};

export default RestaurantRating;
