import { SimpleGrid, Text } from "@chakra-ui/react";
import RestaurantCard from "./RestaurantCard";
import { RestaurantFilters } from "../App";
import useRestaurants from "../hooks/useRestaurants";

interface RestaurantGridProps {
  restaurantFilters: RestaurantFilters;
}

const RestaurantGrid = ({ restaurantFilters }: RestaurantGridProps) => {
  const { data, error, loading } = useRestaurants(restaurantFilters);

  if (error) return <Text>{error}</Text>;

  if (!loading && data.length === 0)
    return <Text>Aucun restaurant ne correspond à votre recherche.</Text>;

  return (
    <SimpleGrid
      columns={{ sm: 1, md: 2, lg: 3, xl: 3 }}
      spacing="20px"
      justifyItems="center"
    >
      {data.map((restaurant) => (
        <RestaurantCard key={restaurant.id} restaurant={restaurant} />
      ))}
    </SimpleGrid>
  );
};

export default RestaurantGrid;
