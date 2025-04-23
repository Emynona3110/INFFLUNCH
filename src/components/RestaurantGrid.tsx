import { SimpleGrid, Text } from "@chakra-ui/react";
import useRestaurants from "../hooks/useRestaurants";
import RestaurantCard from "./RestaurantCard";

const RestaurantGrid = () => {
  const { data, error, loading } = useRestaurants();

  if (error) return <Text>{error}</Text>;

  if (!loading && data.length === 0)
    return <Text>No restaurants found with this filters</Text>;

  return (
    <SimpleGrid
      columns={{ sm: 1, md: 1, lg: 2, xl: 2 }}
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
