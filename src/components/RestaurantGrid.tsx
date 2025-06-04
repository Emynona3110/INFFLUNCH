import { SimpleGrid, Text, Box } from "@chakra-ui/react";
import RestaurantCard from "./RestaurantCard";
import RestaurantCardSkeleton from "./RestaurantCardSkeleton";
import useRestaurants from "../hooks/useRestaurants";
import { RestaurantFilters } from "../App";

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

  return (
    <SimpleGrid
      columns={{ sm: 1, md: 2, lg: 3, xl: 3 }}
      spacing="20px"
      justifyItems="center"
    >
      {loading
        ? Array.from({ length: skeletonCount }, (_, i) => (
            <RestaurantCardSkeleton key={i} />
          ))
        : data.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
    </SimpleGrid>
  );
};

export default RestaurantGrid;
