import { useEffect } from "react";
import { Box, SimpleGrid, Text } from "@chakra-ui/react";
import RestaurantCard from "../components/RestaurantCard";
import RestaurantCardSkeleton from "../components/RestaurantCardSkeleton";
import useRestaurants from "../hooks/useRestaurants";
import useTopRated from "../hooks/useTopRated";
import { motion } from "framer-motion";
import { RestaurantFilters } from "../pages/UserPage";

const MotionBox = motion.create(Box);

interface RestaurantGridProps {
  restaurantFilters: RestaurantFilters;
  favoriteIds: number[];
  favoritesLoading?: boolean;
  refreshFavorites?: () => void;
}

const RestaurantGrid = ({
  restaurantFilters,
  favoriteIds,
  favoritesLoading = false,
  refreshFavorites,
}: RestaurantGridProps) => {
  const { data, error, loading } = useRestaurants(restaurantFilters);
  const topRatedResult = useTopRated();
  const topRated = !topRatedResult.error
    ? (topRatedResult.data as { id: number }[])
    : [];

  const skeletonCount = 6;

  const filteredData = restaurantFilters.favoritesOnly
    ? data.filter((r) => favoriteIds.includes(r.id))
    : data;

  useEffect(() => {
    refreshFavorites?.();
  }, []);

  if (error) {
    return (
      <Box textAlign="center" mt={8}>
        <Text color="red.500">Erreur : {error}</Text>
      </Box>
    );
  }

  if (!loading && !favoritesLoading && filteredData.length === 0) {
    return (
      <Box textAlign="center" mt={8}>
        <Text>
          {restaurantFilters.favoritesOnly
            ? "Aucun restaurant ne fait partie de vos favoris."
            : "Aucun restaurant ne correspond à votre recherche."}
        </Text>
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
      {loading || favoritesLoading
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
        : filteredData.map((restaurant, i) => (
            <MotionBox
              key={restaurant.id}
              variants={fadeOnly}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.5, delay: i * 0.05 }}
              width="100%"
            >
              <RestaurantCard
                restaurant={restaurant}
                topRated={topRated}
                liked={favoriteIds.includes(restaurant.id)}
              />
            </MotionBox>
          ))}
    </SimpleGrid>
  );
};

export default RestaurantGrid;
