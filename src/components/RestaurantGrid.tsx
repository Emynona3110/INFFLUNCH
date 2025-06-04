import { SimpleGrid, Text, Box } from "@chakra-ui/react";
import RestaurantCard from "./RestaurantCard";
import RestaurantCardSkeleton from "./RestaurantCardSkeleton";
import useRestaurants from "../hooks/useRestaurants";
import { RestaurantFilters } from "../App";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

interface RestaurantGridProps {
  restaurantFilters: RestaurantFilters;
}

const RestaurantGrid = ({ restaurantFilters }: RestaurantGridProps) => {
  const { data, error, loading } = useRestaurants(restaurantFilters);
  const skeletonCount = 6;

  if (error) {
    return (
      <Box textAlign="center" mt={8}>
        <Text color="red.500">Erreur : {error}</Text>
      </Box>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <Box textAlign="center" mt={8}>
        <Text>Aucun restaurant ne correspond à votre recherche.</Text>
      </Box>
    );
  }

  const fadeOnly = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  };

  return (
    <SimpleGrid
      columns={{ sm: 1, md: 2, lg: 3, xl: 3 }}
      spacing="20px"
      justifyItems="center"
    >
      {loading
        ? Array.from({ length: skeletonCount }, (_, i) => (
            <MotionBox
              key={`skeleton-${i}`}
              variants={fadeOnly}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.5 }}
              width="100%"
            >
              <RestaurantCardSkeleton />
            </MotionBox>
          ))
        : data.map((restaurant, i) => (
            <MotionBox
              key={restaurant.id}
              variants={fadeOnly}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.5, delay: i * 0.05 }}
              width="100%"
            >
              <RestaurantCard restaurant={restaurant} />
            </MotionBox>
          ))}
    </SimpleGrid>
  );
};

export default RestaurantGrid;
